#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import time
import imaplib
import smtplib
import logging
import traceback
from datetime import datetime, timedelta, timezone
from email import message_from_bytes
from email.header import decode_header, Header
from email.utils import parsedate_to_datetime, formataddr
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover
    load_dotenv = None


# ------------- Logging configuration -------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


# ------------- Utilities -------------
def load_config() -> dict:
    """Load configuration from .env and environment variables.

    Required variables:
      - EMAIL_USER
      - EMAIL_PASS
      - IMAP_HOST (e.g., imap.gmail.com)
      - IMAP_PORT (default 993)
      - SMTP_HOST (e.g., smtp.gmail.com)
      - SMTP_PORT (default 587)
      - REPORT_TO (recipient email address)

    Optional:
      - IMAP_FOLDER (default INBOX)
      - REPORT_FROM_NAME (default "Mail Reporter")
    """

    if load_dotenv is not None:
        # Load .env from current working directory if present
        load_dotenv(override=False)
    else:
        logger.warning(
            "python-dotenv not installed. Ensure environment variables are set."
        )

    required = [
        "EMAIL_USER",
        "EMAIL_PASS",
        "IMAP_HOST",
        "SMTP_HOST",
        "REPORT_TO",
    ]

    missing = [name for name in required if not os.getenv(name)]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}"
        )

    config = {
        "email_user": os.getenv("EMAIL_USER"),
        "email_pass": os.getenv("EMAIL_PASS"),
        "imap_host": os.getenv("IMAP_HOST"),
        "imap_port": int(os.getenv("IMAP_PORT", "993")),
        "imap_folder": os.getenv("IMAP_FOLDER", "INBOX"),
        "smtp_host": os.getenv("SMTP_HOST"),
        "smtp_port": int(os.getenv("SMTP_PORT", "587")),
        "report_to": os.getenv("REPORT_TO"),
        "report_from_name": os.getenv("REPORT_FROM_NAME", "Mail Reporter"),
    }

    return config


def decode_mime_words(value: str) -> str:
    if value is None:
        return ""
    try:
        parts = decode_header(value)
        decoded = []
        for text, enc in parts:
            if isinstance(text, bytes):
                decoded.append(text.decode(enc or "utf-8", errors="replace"))
            else:
                decoded.append(text)
        return "".join(decoded)
    except Exception:
        return value


def to_local_datetime(dt: datetime) -> datetime:
    try:
        # Convert aware or naive datetime to local timezone
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone()
    except Exception:
        return dt


def connect_imap(host: str, port: int, user: str, password: str) -> imaplib.IMAP4_SSL:
    try:
        imap = imaplib.IMAP4_SSL(host, port)
        imap.login(user, password)
        return imap
    except imaplib.IMAP4.error as e:
        raise RuntimeError(f"IMAP authentication failed: {e}")
    except Exception as e:
        raise RuntimeError(f"IMAP connection failed: {e}")


def search_yesterday_messages(
    imap: imaplib.IMAP4_SSL, folder: str
) -> list:
    """Return list of dicts with keys: sender, subject, received_at (local str)."""
    status, _ = imap.select(folder, readonly=True)
    if status != "OK":
        raise RuntimeError(f"Cannot select folder: {folder}")

    today = datetime.now().date()
    yesterday = today - timedelta(days=1)

    since_str = yesterday.strftime("%d-%b-%Y")
    before_str = today.strftime("%d-%b-%Y")

    status, data = imap.search(None, "SINCE", since_str, "BEFORE", before_str)
    if status != "OK":
        raise RuntimeError("IMAP search failed")

    ids = data[0].split() if data and data[0] else []
    messages = []

    if not ids:
        return messages

    for msg_id in ids:
        try:
            status, fetched = imap.fetch(
                msg_id, "(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])"
            )
            if status != "OK" or not fetched:
                logger.warning("Failed to fetch headers for message id %s", msg_id)
                continue

            # fetched is a list like [(b'ID (BODY[...] {bytes}', b'raw headers'), b')']
            header_bytes = b""
            for part in fetched:
                if isinstance(part, tuple) and isinstance(part[1], (bytes, bytearray)):
                    header_bytes += part[1]
            if not header_bytes:
                continue

            msg = message_from_bytes(header_bytes)
            raw_from = decode_mime_words(msg.get("From", ""))
            raw_subject = decode_mime_words(msg.get("Subject", ""))
            raw_date = msg.get("Date")

            try:
                parsed_dt = parsedate_to_datetime(raw_date) if raw_date else None
                if parsed_dt is not None:
                    parsed_dt = to_local_datetime(parsed_dt)
                    received_at = parsed_dt.strftime("%Y-%m-%d %H:%M:%S %Z")
                else:
                    received_at = ""
            except Exception:
                received_at = raw_date or ""

            messages.append(
                {
                    "sender": raw_from,
                    "subject": raw_subject,
                    "received_at": received_at,
                }
            )
        except Exception as e:
            logger.warning("Error processing message %s: %s", msg_id, e)
            logger.debug(traceback.format_exc())
            continue

    return messages


def build_text_table(rows: list) -> str:
    if not rows:
        return "Aucun email reçu hier."

    headers = ["Expéditeur", "Objet", "Reçu à"]
    col_widths = [
        max(len(headers[0]), max((len(r["sender"]) for r in rows), default=0)),
        max(len(headers[1]), max((len(r["subject"]) for r in rows), default=0)),
        max(len(headers[2]), max((len(r["received_at"]) for r in rows), default=0)),
    ]

    sep = "+" + "+".join(["-" * (w + 2) for w in col_widths]) + "+"

    def fmt_row(values):
        return "| " + " | ".join(
            [str(v)[: w].ljust(w) for v, w in zip(values, col_widths)]
        ) + " |"

    lines = [
        sep,
        fmt_row(headers),
        sep,
    ]
    for r in rows:
        lines.append(fmt_row([r["sender"], r["subject"], r["received_at"]]))
    lines.append(sep)
    return "\n".join(lines)


def build_html_table(rows: list) -> str:
    if not rows:
        return (
            "<p>Aucun email reçu hier.</p>"
        )

    html = [
        "<table border=\"1\" cellspacing=\"0\" cellpadding=\"6\" style=\"border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;\">",
        "<thead><tr style=\"background:#f2f2f2\"><th>Expéditeur</th><th>Objet</th><th>Reçu à</th></tr></thead>",
        "<tbody>",
    ]
    for r in rows:
        sender = escape_html(r["sender"])[:500]
        subject = escape_html(r["subject"])[:500]
        recv = escape_html(r["received_at"])[:100]
        html.append(f"<tr><td>{sender}</td><td>{subject}</td><td>{recv}</td></tr>")
    html.append("</tbody></table>")
    return "".join(html)


def escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def send_mail(
    smtp_host: str,
    smtp_port: int,
    user: str,
    password: str,
    to_addr: str,
    subject: str,
    text_body: str,
    html_body: str,
    from_name: str = "Mail Reporter",
):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = str(Header(subject, "utf-8"))
    msg["From"] = formataddr((str(Header(from_name, "utf-8")), user))
    msg["To"] = to_addr

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
            server.ehlo()
            try:
                server.starttls()
                server.ehlo()
            except Exception:
                logger.info("STARTTLS not supported or failed; attempting without TLS")
            server.login(user, password)
            server.sendmail(user, [to_addr], msg.as_string())
    except smtplib.SMTPAuthenticationError as e:
        raise RuntimeError(f"SMTP authentication failed: {e}")
    except Exception as e:
        raise RuntimeError(f"SMTP send failed: {e}")


def _generate_sample_rows() -> list:
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    base_dt = datetime.combine(yesterday, datetime.min.time()).astimezone()
    rows = []
    for i in range(1, 4):
        dt = base_dt.replace(hour=8 + i, minute=15 * i)
        rows.append(
            {
                "sender": f"Exemple Sender {i} <sender{i}@example.com>",
                "subject": f"Sujet d'exemple {i}",
                "received_at": dt.strftime("%Y-%m-%d %H:%M:%S %Z"),
            }
        )
    return rows


def run_once(dry_run: bool = False, output: str | None = None) -> int:
    try:
        if dry_run:
            rows = _generate_sample_rows()
            today = datetime.now().date()
            yesterday = today - timedelta(days=1)
            subject = f"Rapport des emails (DRY-RUN) du {yesterday.strftime('%d/%m/%Y')}"
            text_table = build_text_table(rows)
            html_table = build_html_table(rows)
            if output:
                try:
                    with open(output, "w", encoding="utf-8") as f:
                        f.write("<html><body>" + html_table + "</body></html>")
                    logger.info("Dry-run: rapport HTML écrit dans %s", output)
                except Exception as e:
                    logger.warning("Dry-run: impossible d'écrire le fichier %s: %s", output, e)
            print(subject)
            print()
            print(text_table)
            return 0

        cfg = load_config()
        logger.info("Connecting to IMAP server %s", cfg["imap_host"])
        imap = connect_imap(cfg["imap_host"], cfg["imap_port"], cfg["email_user"], cfg["email_pass"])
        try:
            rows = search_yesterday_messages(imap, cfg["imap_folder"])
        finally:
            try:
                imap.close()
            except Exception:
                pass
            try:
                imap.logout()
            except Exception:
                pass

        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        subject = f"Rapport des emails reçus le {yesterday.strftime('%d/%m/%Y')}"
        text_table = build_text_table(rows)
        html_table = build_html_table(rows)

        logger.info("Sending report email to %s", cfg["report_to"])
        send_mail(
            smtp_host=cfg["smtp_host"],
            smtp_port=cfg["smtp_port"],
            user=cfg["email_user"],
            password=cfg["email_pass"],
            to_addr=cfg["report_to"],
            subject=subject,
            text_body=text_table,
            html_body=html_table,
            from_name=cfg["report_from_name"],
        )
        logger.info("Report sent successfully")
        return 0
    except Exception as e:
        logger.error("Run failed: %s", e)
        logger.debug(traceback.format_exc())
        return 1


def seconds_until(hour: int, minute: int) -> float:
    now = datetime.now()
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target = target + timedelta(days=1)
    return (target - now).total_seconds()


def run_daemon(target_time: str = "07:00") -> int:
    try:
        hour, minute = [int(x) for x in target_time.split(":", 1)]
    except Exception:
        raise ValueError("--at must be in HH:MM format, e.g. 07:00")

    logger.info("Scheduling daily run at %02d:%02d local time", hour, minute)
    while True:
        try:
            delay = seconds_until(hour, minute)
            logger.info("Sleeping for %.0f seconds until next run", delay)
            time.sleep(max(1.0, min(delay, 24 * 3600)))
            exit_code = run_once()
            if exit_code != 0:
                logger.warning("Scheduled run completed with errors (exit=%s)", exit_code)
        except KeyboardInterrupt:
            logger.info("Daemon interrupted by user; exiting.")
            return 0
        except Exception as e:
            logger.error("Daemon iteration failed: %s", e)
            logger.debug(traceback.format_exc())
            # Wait 1 minute before retrying to avoid tight loop
            time.sleep(60)


def parse_args(argv=None):
    import argparse

    parser = argparse.ArgumentParser(
        description="Récupère les emails de la veille et envoie un rapport quotidien."
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Lancer en mode service et exécuter chaque jour à l'heure spécifiée (par défaut 07:00).",
    )
    parser.add_argument(
        "--at",
        default="07:00",
        help="Heure quotidienne locale au format HH:MM (utilisé avec --daemon).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mode test: n'accède pas au réseau, génère des données factices et affiche le rapport.",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Chemin de sortie pour enregistrer le rapport HTML en mode --dry-run.",
    )
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    if args.daemon:
        return run_daemon(args.at)
    return run_once(dry_run=args.dry_run, output=args.output)


if __name__ == "__main__":
    sys.exit(main())


