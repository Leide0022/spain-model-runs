"""Build the real-data reference for the results viewer, once, from the raw downloads.

Teammates never need the raw OMIE/ENTSO-E downloads: this script turns them into small files
in reference/, which the website and scripts/publish_run.py (model repo) read. Run it from
this repo when the raw data changes (it lives on Lars Erik's PC), then commit reference/.

    python tools/build_reference.py

Reads (siblings of this repo; see the model repo's docs/method_omie_full_year_conversion.md):
    ../OMIE_data/tecnologias/tecnologias_YYYYMMDD.txt      OMIE day-ahead programme per technology
    ../OMIE_data/marginalpdbc/marginalpdbc_YYYYMMDD.1      OMIE day-ahead price (days without a file stay empty)
    ../entsoe_download/generation_entsoe.csv               ENTSO-E actual generation per type (A75)
    ../entsoe_download/crossborder_2024.csv                ENTSO-E physical flows (A11), for imports
    ../entsoe_download/generation_per_unit/YYYY-MM.csv     ENTSO-E actual generation per unit (A73)
    ../Spain_power_system/Data/generations.csv             model units (name, fuel, bus, coordinates)

Writes reference/:
    real_hourly_2024.csv.gz    date, hour, price, omie_<category> (day-ahead), phys_<category> (actual)
    real_sites_2024.csv.gz     date, hour, one MW column per site (ENTSO-E per unit, summed per site)
    sites.json                 the matched sites (model units, ENTSO-E units, location) and coverage
    entsoe_unit_crosswalk.csv  the same table in readable form
"""
import json
from math import cos, radians
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
DATA = REPO.parent                      # folder that holds the model repo and the raw downloads
OUT = REPO / "reference"
GZIP = {"method": "gzip", "mtime": 0}     # no timestamp, so unchanged data gives an unchanged file
YEAR = 2024
KX, KY = 111.32 * cos(radians(40.0)), 111.32   # map projection in km; the same as the viewer

OMIE_CATS = ["Nuclear", "Coal", "CCGT", "Hydro", "Wind", "Solar", "CHP group", "Imports"]
OMIE_COL = {
    "NUCLEAR": "Nuclear", "CARBÓN": "Coal", "CICLO COMBINADO": "CCGT", "HIDRÁULICA": "Hydro",
    "EÓLICA": "Wind", "SOLAR TÉRMICA": "Solar", "SOLAR FOTOVOLTAICA": "Solar",
    "COGENERACIÓN/RESIDUOS/MINI HIDRA": "CHP group",
    "IMPORTACIÓN INTER.": "Imports", "IMPORTACIÓN INTER. SIN MIBEL": "Imports",
}
PHYS_CATS = ["Nuclear", "Coal", "Gas", "Hydro", "Wind", "Solar", "Bio & other", "Imports"]
PHYS_COL = {
    "nuclear_mw": "Nuclear", "hard_coal_mw": "Coal", "lignite_mw": "Coal", "coal_gas_mw": "Coal",
    "fossil_gas_mw": "Gas", "hydro_pumped_mw": "Hydro", "hydro_ror_mw": "Hydro", "hydro_reservoir_mw": "Hydro",
    "wind_onshore_mw": "Wind", "wind_offshore_mw": "Wind", "solar_mw": "Solar",
    "biomass_mw": "Bio & other", "waste_mw": "Bio & other", "other_renewable_mw": "Bio & other",
    "other_mw": "Bio & other", "fossil_oil_mw": "Bio & other", "energy_storage_mw": "Bio & other",
}

# ENTSO-E names units by short codes (SAGU1, UFARRU2, ...), so the match is a hand-made table.
# site: (fuel, confidence, ENTSO-E unit names, model plant names (generations.csv, without
#        " power station") or explicit model unit ids). "sure" = the name is unambiguous;
# "probable" = read from the code and checked against capacity. Units not listed stay
# unmatched, never guessed; sites ENTSO-E reports only in part (Soutelo, Olmedilla, Talayuela,
# La Mula PV) are left out rather than compared against half a plant.
CROSSWALK = {
    "Almaraz": ("Nuclear", "sure", ["ALMARAZ 1", "ALMARAZ 2"], ["Almaraz nuclear power plant"]),
    "Ascó": ("Nuclear", "sure", ["ASCO 1", "ASCO 2"], ["Ascó nuclear power plant"]),
    "Cofrentes": ("Nuclear", "sure", ["COFRENTES"], ["Cofrentes nuclear power plant"]),
    "Trillo": ("Nuclear", "sure", ["TRILLO"], ["Trillo nuclear power plant"]),
    "Vandellós": ("Nuclear", "sure", ["VANDELLOS"], ["Vandellos nuclear power plant"]),
    "Aboño (coal)": ("Coal", "sure", ["ABO¿O 1", "ABO¿O 2"], ["Aboño"]),  # ENTSO-E's own spelling: "ABO¿O"
    "Los Barrios (coal)": ("Coal", "sure", ["BARRIOS"], ["Los Barrios"]),
    "Soto de Ribera 3 (coal)": ("Coal", "sure", ["SOTO RIB 3"], ["G0446"]),
    "Soto de Ribera 4–5 (gas)": ("Gas", "probable", ["SRI4", "SOTO 5"], ["G0447", "G0448"]),
    "Aceca 3": ("Gas", "sure", ["ACECA 3"], ["Aceca 3"]),
    "Aceca 4": ("Gas", "sure", ["ACECA4"], ["Aceca 4"]),
    "Bahía de Algeciras": ("Gas", "probable", ["ALG3TG1", "ALG3TG2", "ALG3TV1"], ["Bahia de Algeciras"]),
    "Amorebieta": ("Gas", "sure", ["AMBITG1", "AMBITG2", "AMBITV"], ["Amorebieta"]),
    "Arcos de la Frontera": ("Gas", "sure", ["ARCOS1", "ARCOS2", "ARC3TG1", "ARC3TG2", "ARC3TV"], ["Arcos de la Frontera"]),
    "Bahía de Bizkaia": ("Gas", "sure", ["BAHITG1", "BAHITG2", "BAHITV"], ["Bahía de Bizkaia"]),
    "Besós 3–5": ("Gas", "sure", ["BESOS 3", "BESOS 4", "BES5 TG1", "BES5 TG2", "BES5 TV"], ["Besós 3", "Besós 4", "Besós 5"]),
    "Campo de Gibraltar": ("Gas", "sure", ["CAMPGIB1", "CAMPGIB2"], ["Campo de Gibraltar"]),
    "Escombreras valley (Cartagena, El Fangal, Escombreras 6)": ("Gas", "sure",
        ["CARTAGENA1", "CARTAGENA2", "CARTAGENA3", "ESCCC1", "ESCCC2", "ESCCC3", "ESC6TG1", "ESC6TG2", "ESC6TV"],
        ["Cartagena (Escombreras)", "El Fangal", "Escombreras Iberdrola"]),
    "Castejón": ("Gas", "sure", ["CASTEJON 1", "CASTEJON 2", "CTJON3"], ["Castejón"]),
    "Cristóbal Colón": ("Gas", "sure", ["COLON 4"], ["Cristobal Colón"]),
    "Castellón 3–4": ("Gas", "probable", ["CTN3TG1", "CTN3TG2", "CTN3TV", "CTN4TG1", "CTN4TG2", "CTN4TV"], ["Castellón"]),
    "Castelnou": ("Gas", "probable", ["CTNUTG1", "CTNUTG2", "CTNUTV"], ["Castelnou"]),
    "Escatrón 3": ("Gas", "probable", ["ECT3TG1", "ECT3TG2", "ECT3TV1"], ["G0171"]),
    "Málaga": ("Gas", "sure", ["MALA1"], ["Málaga"]),
    "Palos": ("Gas", "sure", ["PALOS1", "PALOS 2", "PALOS 3"], ["Palos"]),
    "Puerto de Barcelona": ("Gas", "sure", ["PBCN1", "PBCN2"], ["Puerto De Barcelona"]),
    "As Pontes (gas)": ("Gas", "probable", ["PGR5TG1", "PGR5TG2", "PGR5TV"], ["G0041"]),
    "Plana del Vent": ("Gas", "probable", ["PVENT1", "PdV2"], ["Plana del Vent"]),
    "San Roque 1": ("Gas", "sure", ["S.ROQUE 1"], ["San Roque 1"]),
    "San Roque 2": ("Gas", "sure", ["S.ROQUE 2"], ["San Roque 2"]),
    "Sagunto": ("Gas", "sure", ["SAGU1", "SAGU2", "SAGU3"], ["Sagunto"]),
    "Santurce": ("Gas", "sure", ["SANTURCE 4"], ["Santurce"]),
    "Sabón 3": ("Gas", "probable", ["SBO3"], ["Sabón 3"]),
    "Tarragona": ("Gas", "probable", ["TAPOWER"], ["Tarragona"]),
    "Arrúbal": ("Gas", "probable", ["UFARRU1", "UFARRU2"], ["Arrubal"]),
    "La Muela (I + II, with Cortes)": ("Hydro", "probable",
        ["MUELA 1G", "MUELA 2G", "MUELA 3G", "MUELA 4G", "MUELA 5G", "MUELA 6G", "MUELA 7G", "CORTES 1", "CORTES 2"],
        ["G0155", "G0281"]),
    "Sallente": ("Hydro", "sure", ["SALLENT 1G", "SALLENT 2G", "SALLENT 3G", "SALLENT 4G"], ["Sallente"]),
    "Alcántara (José M. Oriol)": ("Hydro", "sure", ["JM.ORIOL 1", "JM.ORIOL 2", "JM.ORIOL 3", "JM.ORIOL 4"],
                                   ["Alcántara II, Jose M Oriol Grupo 4"]),
    "Cedillo": ("Hydro", "sure", ["CEDILLO 1", "CEDILLO 2", "CEDILLO 3", "CEDILLO 4"], ["Cedillo 3"]),
    "Villarino": ("Hydro", "sure", ["VLLRINO 1G", "VLLRINO 2G", "VLLRINO 3G", "VLLRINO 4G", "VLLRINO 5G", "VLLRINO 6G"], ["Villarino 4"]),
    "Castro (Zamora)": ("Hydro", "probable", ["CASTRO II"], ["Castro Zamora"]),
    "Ricobayo": ("Hydro", "probable", ["RICOBA II1"], ["Ricobayo (Esla)"]),
    "Santo Estevo II": ("Hydro", "probable", ["S.EST IIG1"], ["Santo Estavo II, San Esteban II Grupo 1"]),
    "Bienvenida PV": ("Solar", "probable", ["BVNIDA1"], ["Bienvenida PV"]),
    "Valdesolar PV": ("Solar", "probable", ["VALDESOLAR"], ["Repsol Valdesolar"]),
}
FUEL_OF_MODEL = {"Nuclear": {"Nuclear"}, "Coal": {"Coal"}, "Gas": {"Gas", "Oil"}, "Hydro": {"Hydro"}, "Solar": {"Solar"}}


def proj(lon, lat):
    return round(lon * KX, 1), round(-lat * KY, 1)


def num(s):
    s = str(s).strip()
    return 0.0 if s in ("", "nan") else float(s.replace(".", "").replace(",", "."))


def to_24(vals):
    """Clock-change days have 23 or 25 hours; map them to 24 rows as the model does."""
    if len(vals) == 23:
        return vals + [vals[-1]]
    if len(vals) == 25:
        return vals[:2] + vals[3:]
    return vals[:24]


def hours_index():
    days = pd.date_range(f"{YEAR}-01-01", f"{YEAR}-12-31").strftime("%Y-%m-%d")
    return pd.MultiIndex.from_product([days, range(24)], names=["date", "hour"])


def omie_programme(idx):
    rows = []
    for d in idx.levels[0]:
        f = DATA / "OMIE_data" / "tecnologias" / f"tecnologias_{d.replace('-', '')}.txt"
        if not f.exists():
            continue
        lines = f.read_text(encoding="latin-1").splitlines()
        hdr_i = next(i for i, l in enumerate(lines) if l.startswith("Fecha;Hora"))
        hdr = [c.strip() for c in lines[hdr_i].split(";")]
        day = []
        for l in lines[hdr_i + 1:]:
            p = l.split(";")
            if len(p) > 2 and p[1].strip().isdigit():
                vals = dict.fromkeys(OMIE_CATS, 0.0)
                for col, v in zip(hdr, p):
                    if col in OMIE_COL:
                        vals[OMIE_COL[col]] += num(v)
                day.append(vals)
        rows += [dict(date=d, hour=h, **v) for h, v in enumerate(to_24(day))]
    return pd.DataFrame(rows).set_index(["date", "hour"]).reindex(idx).add_prefix("omie_")


def omie_price(idx):
    out = pd.Series(np.nan, index=idx, name="price")
    for d in idx.levels[0]:
        f = DATA / "OMIE_data" / "marginalpdbc" / f"marginalpdbc_{d.replace('-', '')}.1"
        if not f.exists():
            continue
        vals = [float(p[5]) for p in (l.split(";") for l in f.read_text(encoding="latin-1").splitlines())
                if len(p) >= 6 and p[0].isdigit()]          # p[4] Portugal, p[5] Spain
        for h, v in enumerate(to_24(vals)):
            out[(d, h)] = v
    return out


def entsoe_actual(idx):
    g = pd.read_csv(DATA / "entsoe_download" / "generation_entsoe.csv")
    g = g[g.date.str.startswith(str(YEAR))].rename(columns={"delivery_time": "hour"}).set_index(["date", "hour"])
    out = pd.DataFrame(0.0, index=g.index, columns=PHYS_CATS)
    for col, cat in PHYS_COL.items():
        out[cat] += g[col].fillna(0.0)
    xb = pd.read_csv(DATA / "entsoe_download" / "crossborder_2024.csv").rename(columns={"delivery_time": "hour"})
    out["Imports"] = xb.set_index(["date", "hour"])[["from_PT", "from_FR"]].sum(axis=1).reindex(out.index)
    return out.reindex(idx).add_prefix("phys_")


def sites_and_real(idx):
    gen = pd.read_csv(DATA / "Spain_power_system" / "Data" / "generations.csv", encoding="utf-8")
    gen["plant"] = gen.name.str.replace(r" power station$", "", regex=True)
    real = pd.concat(pd.read_csv(f) for f in sorted((DATA / "entsoe_download" / "generation_per_unit").glob(f"{YEAR}-*.csv")))
    real_max = real.groupby("unit_name").mw.max()
    sites, site_of, table = [], {}, []
    for name, (fuel, conf, eunits, refs) in CROSSWALK.items():
        m = gen[gen.unit_id.isin(refs) | (gen.plant.isin(refs) & gen.primary_fuel.isin(FUEL_OF_MODEL[fuel]))]
        missing = [u for u in eunits if u not in real_max.index]
        assert not m.empty and not missing, (name, missing)
        cap = float(m.capacity_mw.sum())
        w = m.capacity_mw / cap
        x, y = proj(float((m.x_bus * w).sum()), float((m.y_bus * w).sum()))
        sites.append(dict(name=name, f=fuel, conf=conf, x=x, y=y, cap=round(cap),
                          rcap=round(float(real_max[eunits].sum())), model_units=m.unit_id.tolist(), entsoe=eunits))
        site_of.update({u: len(sites) - 1 for u in eunits})
        table.append([name, fuel, conf, " ".join(eunits), " ".join(m.unit_id), round(cap), sites[-1]["rcap"]])
    real["site"] = real.unit_name.map(site_of)
    real = real.dropna(subset=["site"])
    wide = real.groupby(["date", "delivery_time", "site"]).mw.sum().unstack("site")
    wide.index.names = ["date", "hour"]
    wide = wide.reindex(idx).reindex(columns=range(len(sites)))
    wide.columns = [f"s{int(c)}" for c in wide.columns]
    cov = {fuel: dict(matched=sum(s["cap"] for s in sites if s["f"] == fuel),
                      total=round(float(gen[gen.primary_fuel.isin(fset)].capacity_mw.sum())))
           for fuel, fset in FUEL_OF_MODEL.items()}
    return sites, cov, wide, table


def main():
    OUT.mkdir(exist_ok=True)
    idx = hours_index()
    hourly = pd.concat([omie_price(idx), omie_programme(idx), entsoe_actual(idx)], axis=1).round(1)
    hourly.to_csv(OUT / f"real_hourly_{YEAR}.csv.gz", compression=GZIP)
    sites, cov, wide, table = sites_and_real(idx)
    wide.round(1).to_csv(OUT / f"real_sites_{YEAR}.csv.gz", compression=GZIP)
    (OUT / "sites.json").write_text(json.dumps(dict(year=YEAR, sites=sites, coverage=cov), ensure_ascii=False, indent=1),
                                    encoding="utf-8")
    pd.DataFrame(table, columns=["site", "fuel", "confidence", "entsoe_units", "model_units", "model_capacity_mw",
                                 "entsoe_max_mw"]).to_csv(OUT / "entsoe_unit_crosswalk.csv", index=False)
    full_days = lambda col: int(hourly[col].notna().groupby(level=0).all().sum())
    print(f"real_hourly_{YEAR}: price {full_days('price')} days, OMIE programme {full_days('omie_Nuclear')} days, "
          f"ENTSO-E actual {full_days('phys_Nuclear')} days")
    print(f"real_sites_{YEAR}: {len(sites)} sites, {int(wide.notna().any(axis=1).groupby(level=0).any().sum())} days")
    for f in sorted(OUT.iterdir()):
        print(f"  {f.name}: {f.stat().st_size / 1e3:.0f} kB")


if __name__ == "__main__":
    main()
