"""Build reference/model_facts.js: facts about the model itself for the "Market stages" tab.

The tab follows the structure of the PowerVision paper (Koks et al., 2026): model structure,
market stages and gate closures (Table 1), wind/solar capacity and load (Table 2), line types
(Table 3) and data sources (Fig. 7). These facts do not depend on a run, so they live in
reference/ and are rebuilt only when the model's data changes:

    python tools/build_model_facts.py

Reads (siblings of this repo):
    ../Spain_power_system/Data/generations.csv, lines.csv, transformers_reactance.csv, ES_old/load/
    ../Spain_power_system/config.toml                                     line_rating_factor
    ../forecast_data/data/input_entsoe/capacities/{Solar,Wind_Onshore}/ES.csv   ENTSO-E capacity
    ../forecast_data/data/input_entsoe/load_and_forecasts/ES/2024.csv      ENTSO-E load
Writes reference/model_facts.js (window.MODEL_FACTS).
"""
import json
import subprocess
import tomllib
from math import sqrt
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
MODEL = REPO.parent / "Spain_power_system"
FC = REPO.parent / "forecast_data" / "data" / "input_entsoe"
OUT = REPO / "reference" / "model_facts.js"
YEAR = 2024


def model_commit():
    try:
        return subprocess.run(["git", "-C", str(MODEL), "rev-parse", "--short", "HEAD"],
                              capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def capacity_and_load():
    gen = pd.read_csv(MODEL / "Data/generations.csv")
    cap = gen.groupby(["primary_fuel", "technology"]).capacity_mw.sum()
    real = lambda t: float(pd.read_csv(FC / "capacities" / t / "ES.csv", index_col=0).loc["ES", str(YEAR)])
    # the model's day-ahead load baseline (column "-12"), one file per day of 2024
    days = [pd.read_csv(f)["-12"] for f in sorted((MODEL / "Data/ES_old/load").glob(f"*_{YEAR}.csv"))]
    model_load = pd.concat(days)
    ent = pd.read_csv(FC / "load_and_forecasts" / "ES" / f"{YEAR}.csv", index_col=0)
    return dict(
        rows=[
            dict(item="Wind (onshore + offshore)", model=round(cap.loc["Wind"].sum()),
                 real=round(real("Wind_Onshore")), unit="MW"),
            dict(item="Solar (PV + solar thermal)", model=round(cap.loc["Solar"].sum()),
                 model_note=f"PV {cap.loc[('Solar', 'PV')]:,.0f} + thermal {cap.loc[('Solar', 'Solar Thermal')]:,.0f}",
                 real=round(real("Solar")), unit="MW"),
            dict(item="Mean load", model=round(model_load.mean()), model_note=f"{len(days)} days of {YEAR}",
                 real=round(ent["Actual Load"].mean()), unit="MW"),
        ],
        model_src="Data/generations.csv; Data/ES_old/load (day-ahead baseline)",
        real_src=f"ENTSO-E installed capacity per production type, {YEAR}; ENTSO-E actual total load, {YEAR}",
    )


def line_types(lrf):
    lines = pd.read_csv(MODEL / "Data/lines.csv")
    rows = []
    for (kv, dc), g in lines.groupby(["voltage", "dc"]):
        imax = sorted(g.Imax.unique())
        mva = sqrt(3) * kv * imax[0]
        rows.append(dict(kv=int(kv), dc=dc == "t", lines=len(g), circuits=int(g.circuits.clip(lower=1).sum()),
                         imax_ka=imax[0], mva=round(mva), limit=round(mva * lrf), uniform=len(imax) == 1,
                         r=float(g.r_per_length.iloc[0]), x=float(g.x_per_length.iloc[0]),
                         c=float(g.c_per_length.iloc[0])))
    tr = pd.read_csv(MODEL / "Data/transformers_reactance.csv")
    classes = (tr.groupby(["HV_kV", "per_unit_MVA", "n_recommended"]).agg(count=("transformer_id", "size"))
               .reset_index().sort_values(["HV_kV", "per_unit_MVA", "n_recommended"]))
    trafos = [dict(hv=int(r.HV_kV), unit_mva=int(r.per_unit_MVA), units=int(r.n_recommended), count=int(r["count"]),
                   installed=int(r.per_unit_MVA * r.n_recommended), limit=round(r.per_unit_MVA * r.n_recommended * lrf))
              for _, r in classes.iterrows()]
    xs = sorted({round(float(v), 2) for v in tr.X_pu_on_installed_base})
    return rows, trafos, xs, len(tr)


def main():
    cfg = tomllib.loads((MODEL / "config.toml").read_text(encoding="utf-8"))
    lrf = float(cfg["network"]["line_rating_factor"])
    lines, trafos, xs, n_tr = line_types(lrf)
    facts = dict(
        model_commit=model_commit(),
        line_rating_factor=lrf,
        capacity=capacity_and_load(),
        lines=lines, trafos=trafos, trafo_x=xs, n_trafos=n_tr,
        n_buses=len(pd.read_csv(MODEL / "Data/Bus_Data.csv")),
        n_units=len(pd.read_csv(MODEL / "Data/generations.csv")),
    )
    OUT.write_text("// Facts about the model's data for the Market stages tab. Built by tools/build_model_facts.py.\n"
                   "window.MODEL_FACTS = " + json.dumps(facts, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(REPO)} ({OUT.stat().st_size / 1e3:.1f} kB)")
    for r in facts["capacity"]["rows"]:
        print(f"  {r['item']}: model {r['model']:,} vs real {r['real']:,} {r['unit']}")


if __name__ == "__main__":
    main()
