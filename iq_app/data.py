import os
import io
import re
import time
import json
import errno
import unicodedata
from typing import Optional, Tuple

import requests
import pandas as pd
from bs4 import BeautifulSoup


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# Candidate pages to try, in order
SCRAPE_SOURCES = [
    # Known IQ country listings on IQ-related sites
    "https://international-iq-test.com/fr/test/IQ_by_country/",
    "https://international-iq-test.com/test/IQ_by_country/",
    "https://international-iq-test.com/en/test/IQ_by_country/",
    "https://international-iq-test.com/iq_by_country/",
    "https://international-iq-test.com/en/iq_by_country/",
    "https://international-iq-test.com/fr/iq_by_country/",
    # Alternative IQ ranking sites
    "https://www.worlddata.info/average-iq-by-country.php",
    "https://www.statista.com/statistics/1001671/average-iq-by-country/",
    "https://iq-research.info/en/page/average-iq-by-country",
    "https://www.123test.com/iq-test/iq-by-country/",
    # If international-iq.com hosts a ranking page, try home/root as last resort
    "https://www.international-iq.com/",
]

SEED_CSV = """rank,country,iq
1,Singapore,105.9
2,Hong Kong,105.8
3,South Korea,104.6
4,Taiwan,104.5
5,Japan,104.2
6,China,104.1
7,Switzerland,101.3
8,Netherlands,100.4
9,Germany,100.2
10,Italy,99.9
11,United Kingdom,99.1
12,France,98.1
13,Canada,99.0
14,Australia,98.4
15,United States,98.0
16,Spain,97.8
17,Belgium,99.0
18,Austria,100.0
19,Finland,101.2
20,Sweden,99.7
"""


def _request(url: str, timeout: int = 20) -> Optional[str]:
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)
        resp.raise_for_status()
        # Some sites render via JS; still try read_html fallback later
        return resp.text
    except Exception:
        return None


def _strip_accents(text: str) -> str:
    if not isinstance(text, str):
        return ""
    return "".join(
        ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch)
    )


def normalize_country_name(name: str) -> str:
    s = _strip_accents(name or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def _standardize_df(df: pd.DataFrame) -> Optional[pd.DataFrame]:
    cols_lower = [str(c).strip().lower() for c in df.columns]

    # Heuristics: find country and iq columns
    country_candidates = [
        i
        for i, c in enumerate(cols_lower)
        if any(k in c for k in ["country", "pays", "nation", "state", "land"])
    ]
    iq_candidates = [
        i
        for i, c in enumerate(cols_lower)
        if any(k in c for k in ["iq", "qi", "intelligence", "score"])
    ]

    if not country_candidates or not iq_candidates:
        return None

    country_col = df.columns[country_candidates[0]]
    iq_col = df.columns[iq_candidates[0]]

    out = pd.DataFrame(
        {
            "country": df[country_col].astype(str).str.strip(),
            "iq": pd.to_numeric(df[iq_col], errors="coerce"),
        }
    )
    out = out.dropna(subset=["country", "iq"]).reset_index(drop=True)
    # Rank by IQ descending, 1-based
    out = out.sort_values("iq", ascending=False).reset_index(drop=True)
    out.insert(0, "rank", out.index + 1)
    return out


def _parse_tables_with_bs(html: str) -> Optional[pd.DataFrame]:
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    for table in tables:
        try:
            # Try read_html on a single table
            df_list = pd.read_html(str(table))
            for df in df_list:
                std = _standardize_df(df)
                if std is not None and len(std) >= 20:
                    return std
        except Exception:
            continue
    return None


def _parse_with_read_html(html: str) -> Optional[pd.DataFrame]:
    try:
        dfs = pd.read_html(io.StringIO(html))
    except Exception:
        return None
    for df in dfs:
        std = _standardize_df(df)
        if std is not None and len(std) >= 20:
            return std
    return None


def scrape_iq_data() -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """Attempt to scrape IQ by country. Returns (df, source_url).

    The DataFrame has columns: rank (int), country (str), iq (float).
    """
    for url in SCRAPE_SOURCES:
        html = _request(url)
        if not html:
            continue
        # First try narrow table extraction
        df = _parse_tables_with_bs(html)
        if df is None:
            df = _parse_with_read_html(html)
        if df is not None and len(df) >= 20:
            return df, url
    return None, None


def ensure_dir(path: str) -> None:
    directory = os.path.dirname(path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)


def save_data_to_csv(df: pd.DataFrame, path: str) -> None:
    ensure_dir(path)
    df.to_csv(path, index=False)


def load_data_from_csv(path: str) -> Optional[pd.DataFrame]:
    if not os.path.exists(path):
        return None
    try:
        df = pd.read_csv(path)
        # Validate shape
        if {"rank", "country", "iq"}.issubset(df.columns):
            return df
        return None
    except Exception:
        return None


def _load_seed() -> Optional[pd.DataFrame]:
    # Try packaged CSV file first
    seed_path = os.path.join(os.path.dirname(__file__), "seed.csv")
    if os.path.exists(seed_path):
        try:
            df = pd.read_csv(seed_path)
            if {"rank", "country", "iq"}.issubset(df.columns):
                return df
        except Exception:
            pass
    # Fallback: embedded seed
    try:
        df = pd.read_csv(io.StringIO(SEED_CSV))
        if {"rank", "country", "iq"}.issubset(df.columns):
            return df
    except Exception:
        return None
    return None


def get_data(
    cache_csv: str = "data/iq_by_country.csv",
    refresh: bool = False,
    min_rows: Optional[int] = None,
) -> Tuple[Optional[pd.DataFrame], dict]:
    """Get data with optional refresh.

    Returns (df, meta) where meta contains {"source": str, "offline": bool}.
    """
    meta = {"source": None, "offline": False}

    if refresh:
        df, source = scrape_iq_data()
        if df is not None and (min_rows is None or len(df) >= min_rows):
            save_data_to_csv(df, cache_csv)
            meta["source"] = source
            meta["offline"] = False
            return df, meta
        # fallthrough to offline

    # Try load cache
    cached = load_data_from_csv(cache_csv)
    if cached is not None and (min_rows is None or len(cached) >= min_rows):
        meta["source"] = cache_csv
        meta["offline"] = True
        return cached, meta

    # No cache -> try scrape anyway
    df, source = scrape_iq_data()
    if df is not None and (min_rows is None or len(df) >= min_rows):
        save_data_to_csv(df, cache_csv)
        meta["source"] = source
        meta["offline"] = False
        return df, meta

    # Final fallback: packaged seed
    seed_df = _load_seed()
    if seed_df is not None:
        meta["source"] = "seed"
        meta["offline"] = True
        return seed_df, meta

    return None, meta


def find_country(df: pd.DataFrame, query: str) -> Optional[pd.Series]:
    if df is None or df.empty or not query:
        return None
    norm_query = normalize_country_name(query)
    candidates = df["country"].astype(str).tolist()
    norms = [normalize_country_name(c) for c in candidates]
    # Exact normalized match
    for idx, norm in enumerate(norms):
        if norm == norm_query:
            return df.iloc[idx]
    # Startswith fallback
    for idx, norm in enumerate(norms):
        if norm.startswith(norm_query) or norm_query in norm:
            return df.iloc[idx]
    return None


