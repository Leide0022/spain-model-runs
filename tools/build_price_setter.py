"""Build reference/price_setter_2024.js: who set the real Spanish price, hour by hour, in the
day-ahead and in the intraday auctions (IDA2 for the model's ID2, IDA3 for its ID3).

Reads the model repo's Data/OMIE/price_setter_2024.csv and price_setter_ida_2024.csv (written by
omie_conversion/build_price_setter.py [--market ida] from OMIE's per-unit bid curves):

    python tools/build_price_setter.py [--src ../Spain_power_system/Data/OMIE/price_setter_2024.csv]

366 days × 24 hours in the model's hour convention (the repeated October hour is already dropped,
the missing March hour stays empty). Per hour the group index (-1 = none) and the unit index; `group`/`unit` are the day-ahead, `stages`
holds DA, ID2 (= IDA2) and ID3 (= IDA3, hours 12-23). CID has no clearing price, so no price setter.
Writes reference/price_setter_2024.js (window.PRICE_SETTER_REAL).
"""
import argparse
import json
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
SRC = REPO.parent / "Spain_power_system" / "Data" / "OMIE" / "price_setter_2024.csv"
OUT = REPO / "reference" / "price_setter_2024.js"
YEAR = 2024
# same order as the model packages (publish_run.py SETTER_GROUPS) + demand
GROUPS = ["Hydro (water value)", "Storage", "CCGT", "Gas turbine & oil", "Coal", "Nuclear",
          "Wind, solar, run-of-river", "CHP group", "Imports", "Shortage / unclear", "Demand bid",
          "Wind", "Solar, run-of-river", "Other renewables", "Generator buy-back"]
IDA_OF = {"ID2": 2, "ID3": 3}   # model stage -> IDA session


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--src", default=str(SRC))
    src = Path(ap.parse_args().src)
    d = pd.read_csv(src)
    ida_src = src.with_name(src.name.replace("price_setter_", "price_setter_ida_"))
    ida = pd.read_csv(ida_src) if ida_src.exists() else None
    days = [(date(YEAR, 1, 1) + timedelta(k)).isoformat() for k in range(366)]
    day_i = {x: k for k, x in enumerate(days)}
    frames = [d] + ([ida] if ida is not None else [])
    # a generator buying back is shown as "<unit>, buying back (<its type>)"
    def label(r):
        u = r.unit if isinstance(r.unit, str) else ""
        of = getattr(r, "buyback_of", "")
        return f"{u}, buying back ({of})" if u and isinstance(of, str) and of else u
    for f in frames:
        f["label"] = [label(r) for r in f.itertuples(index=False)]
    units = sorted({u for f in frames for u in f.label if u})
    uix = {u: i for i, u in enumerate(units)}

    def arrays(f):
        grp, unit = [-1] * (366 * 24), [-1] * (366 * 24)
        for r in f.itertuples(index=False):
            k = day_i.get(r.date)
            if k is None:
                continue
            i = k * 24 + int(r.hour)
            grp[i] = GROUPS.index(r.group)
            unit[i] = uix.get(r.label, -1) if r.label else -1
        return dict(group=grp, unit=unit)

    stages = {"DA": arrays(d)}
    if ida is not None:
        for st, ses in IDA_OF.items():
            stages[st] = arrays(ida[ida.session == ses])
    data = dict(year=YEAR, days=days, groups=GROUPS, units=units, group=stages["DA"]["group"], unit=stages["DA"]["unit"],
                stages=stages,
                source="OMIE curva_pbc_uof / curva_pibc_uof (per-unit bids) + marginalpdbc / marginalpibc, built by "
                       "the model repo's omie_conversion/build_price_setter.py")
    grp = stages["DA"]["group"]
    OUT.write_text("// Who set the real Spanish price (OMIE: day-ahead, IDA2, IDA3). Built by tools/build_price_setter.py.\n"
                   "window.PRICE_SETTER_REAL = " + json.dumps(data, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.2f} MB), {sum(g >= 0 for g in grp)} hours")


if __name__ == "__main__":
    main()
