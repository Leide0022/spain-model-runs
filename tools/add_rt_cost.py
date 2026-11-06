"""Add REE's real-time constraint COST per hour to reference/esios_2024.js (series rtr_cost_net, €).

e·sios 1723/1724 (series rtr_up_cost, rtr_down_cost) are REE's gross real-time payments: what the plants were paid
for the energy (at their offer price) plus start-ups, 1,295 M€ in 2024 - more than REE paid for all the real-time
energy itself (I90: 1,147 M€). P.O. 14.4 §19.10 (BOE-A-2024-6215, p. 138) defines the cost of real-time constraints
as those payments minus the real-time energy valued at a reference price (the day-ahead price in 2024): the energy
replaces energy that would have been bought anyway, so only the premium is a cost. Built here as
  energy     REE's per-unit real-time records (I90, i90_tc_realtime.csv.gz from the model repo's
             redispatch_realism/fetch_i90.py): up Σ MWh·(price − day-ahead), down Σ |MWh|·(day-ahead − price)
  start-ups  not in I90: e·sios 1723 minus I90's gross up payment, per hour (REE spreads start-ups over the day, so
             single hours can be negative; sums are right)
2024: 849 M€ (energy 701 + start-ups 148); REE's Servicios de ajuste 2024 gives 0.84 b€; with REE's phase I/II the
year is 2,068 M€ against 2,057 reported. Same method as the model repo's redispatch_realism/ree_rt_cost.py.

    python tools/add_rt_cost.py --i90 ../esios_download/i90       (build_esios.py calls it when I90 is there)
"""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "reference" / "esios_2024.js"


def add_rt_cost(i90_dir, da_path=REPO / "reference" / "real_hourly_2024.csv.gz", out=OUT):
    text = out.read_text(encoding="utf-8")
    head = text[:text.index("window.ESIOS = ") + len("window.ESIOS = ")]
    raw = text[len(head):].rstrip().rstrip(";")
    data = json.loads(raw)
    days = data["days"]
    di = {d: i for i, d in enumerate(days)}
    p = pd.read_csv(Path(i90_dir) / "i90_tc_realtime.csv.gz")
    p = p[(p.Redespacho == "Restricciones Técnicas") & p.eur_mwh.notna() & p.date.isin(di) & (p.hour < 24)]
    da = pd.read_csv(da_path, usecols=["date", "hour", "price"]).rename(columns={"price": "p_da"})
    p = p.merge(da, on=["date", "hour"], how="left")
    up = (p.Sentido == "Subir").to_numpy()
    energy = np.where(up, p.mwh * (p.eur_mwh - p.p_da), p.mwh.abs() * (p.p_da - p.eur_mwh))
    gross = np.where(up, p.mwh * p.eur_mwh, 0.0)
    idx = p.date.map(di).to_numpy() * 24 + p.hour.to_numpy()
    e = np.zeros(len(days) * 24); g = np.zeros(len(days) * 24)
    np.add.at(e, idx, np.nan_to_num(energy)); np.add.at(g, idx, gross)
    gross_esios = np.array([x or 0.0 for x in data["series"]["rtr_up_cost"]], dtype=float)
    net = e + (gross_esios - g)
    data["series"]["rtr_cost_net"] = [round(float(x)) for x in net]
    out.write_text(head + json.dumps(data, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"rtr_cost_net added to {out.name}: {net.sum() / 1e6:,.1f} M€ (energy {e.sum() / 1e6:,.1f} + start-ups "
          f"{(gross_esios - g).sum() / 1e6:,.1f}); gross 1723+1724 "
          f"{(gross_esios.sum() + sum(x or 0 for x in data['series']['rtr_down_cost'])) / 1e6:,.1f} M€")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--i90", type=Path, default=REPO.parent / "esios_download" / "i90")
    ap.add_argument("--da", type=Path, default=REPO / "reference" / "real_hourly_2024.csv.gz")
    a = ap.parse_args()
    add_rt_cost(a.i90, a.da)
