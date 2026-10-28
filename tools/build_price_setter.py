"""Build reference/price_setter_2024.js: who set the real Spanish day-ahead price, hour by hour.

Reads the model repo's Data/OMIE/price_setter_2024.csv (written by
omie_conversion/build_price_setter.py from OMIE's per-unit bid curves):

    python tools/build_price_setter.py [--src ../Spain_power_system/Data/OMIE/price_setter_2024.csv]

366 days × 24 hours in the model's hour convention (the repeated October hour is already dropped,
the missing March hour stays empty). Per hour the group index (-1 = none) and the unit index.
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
          "Wind, solar, run-of-river", "CHP group", "Imports", "Shortage / unclear", "Demand bid"]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--src", default=str(SRC))
    src = Path(ap.parse_args().src)
    d = pd.read_csv(src)
    days = [(date(YEAR, 1, 1) + timedelta(k)).isoformat() for k in range(366)]
    day_i = {x: k for k, x in enumerate(days)}
    units = sorted({u for u in d.unit if isinstance(u, str) and u})
    uix = {u: i for i, u in enumerate(units)}
    grp = [-1] * (366 * 24)
    unit = [-1] * (366 * 24)
    for r in d.itertuples(index=False):
        k = day_i.get(r.date)
        if k is None:
            continue
        i = k * 24 + int(r.hour)
        grp[i] = GROUPS.index(r.group)
        unit[i] = uix.get(r.unit, -1) if isinstance(r.unit, str) else -1
    data = dict(year=YEAR, days=days, groups=GROUPS, units=units, group=grp, unit=unit,
                source="OMIE curva_pbc_uof (per-unit bids) + marginalpdbc, built by the model repo's "
                       "omie_conversion/build_price_setter.py")
    OUT.write_text("// Who set the real Spanish day-ahead price (OMIE). Built by tools/build_price_setter.py.\n"
                   "window.PRICE_SETTER_REAL = " + json.dumps(data, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.2f} MB), {sum(g >= 0 for g in grp)} hours")


if __name__ == "__main__":
    main()
