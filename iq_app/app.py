import streamlit as st
import pandas as pd
import plotly.express as px

from iq_app.data import get_data, find_country, save_data_to_csv


st.set_page_config(page_title="Classement QI par pays", layout="wide")


def render_top10(df: pd.DataFrame):
    top10 = df.nsmallest(10, columns=["rank"])  # rank ascending
    st.subheader("Top 10 global")
    st.dataframe(top10, use_container_width=True)


def render_neighbors_chart(df: pd.DataFrame, index: int):
    start = max(0, index - 1)
    end = min(len(df), index + 2)
    subset = df.iloc[start:end]
    fig = px.bar(
        subset,
        x="country",
        y="iq",
        title="Comparaison avec les voisins immédiats",
        labels={"country": "Pays", "iq": "QI moyen"},
        text="iq",
    )
    fig.update_traces(texttemplate="%{text:.1f}", textposition="outside")
    fig.update_layout(yaxis_title="QI moyen", xaxis_title="Pays", uniformtext_minsize=8)
    st.plotly_chart(fig, use_container_width=True)


def main():
    st.title("Classement mondial des pays par QI moyen")

    col_left, col_right = st.columns([2, 1])

    with col_right:
        st.markdown("### Rafraîchir les données")
        if st.button("Rafraîchir", use_container_width=True):
            st.session_state["force_refresh"] = True
        refresh = st.session_state.get("force_refresh", False)

    with st.spinner("Chargement des données..."):
        # Demande un classement complet à chaque démarrage (min 150),
        # et privilégie le rafraîchissement si l'utilisateur l'a demandé.
        df, meta = get_data(refresh=True if refresh else False, min_rows=150)
        st.session_state["force_refresh"] = False

    if df is None or df.empty:
        st.error("Impossible de récupérer des données en ligne ou hors ligne.")
        st.markdown("Vous pouvez charger un CSV avec les colonnes `rank,country,iq`.")
        uploaded = st.file_uploader("Charger un CSV de secours")
        if uploaded is not None:
            try:
                tmp = pd.read_csv(uploaded)
                if {"rank", "country", "iq"}.issubset(tmp.columns):
                    df = tmp
                    # Persist as cache for future runs
                    from iq_app.data import save_data_to_csv
                    save_data_to_csv(df, "data/iq_by_country.csv")
                else:
                    st.warning("Colonnes attendues: rank,country,iq")
            except Exception as e:
                st.warning(f"CSV invalide: {e}")
        if df is None or df.empty:
            return

    st.caption(
        f"Source: {'cache local' if meta.get('offline') else meta.get('source', 'Inconnue')} — {len(df)} pays"
    )

    with col_left:
        query = st.text_input("Votre pays", placeholder="France, Benin, Maroc, ...")
        if query:
            hit = find_country(df, query)
            if hit is None:
                st.warning("Pays introuvable dans la base de données.")
            else:
                st.success(
                    f"{hit['country']} — Rang: {int(hit['rank'])} — QI moyen: {hit['iq']:.1f}"
                )
                # Show neighbors chart
                index = int(hit["rank"]) - 1
                render_neighbors_chart(df, index)

    st.divider()
    render_top10(df)

    # Export Top 150 to CSV (disk + download)
    try:
        top150 = df.nsmallest(150, columns=["rank"])  # rank ascending
        # Save to disk
        save_data_to_csv(top150, "data/iq_top150.csv")
        # Offer download
        csv_bytes = top150.to_csv(index=False).encode("utf-8")
        st.download_button(
            label="Télécharger Top 150 (CSV)",
            data=csv_bytes,
            file_name="iq_top150.csv",
            mime="text/csv",
            use_container_width=True,
        )
        st.caption("Copie enregistrée localement: data/iq_top150.csv")
    except Exception:
        pass


if __name__ == "__main__":
    main()


