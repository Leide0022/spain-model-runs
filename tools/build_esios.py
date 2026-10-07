"""Build reference/esios_2024.js: REE's real balancing and redispatch per hour, for the viewer.

Reads the hourly files that the model repo's esios_download/fetch_esios.py writes to
../esios_download/hourly/ (outside both repos; the download needs an e·sios token):

    python tools/build_esios.py

Every series becomes 366 days × 24 hours in the model's hour convention (clock-change days mapped
to 24 rows as in build_reference.py). Volumes in MWh, with hours missing from e·sios set to 0
(e·sios leaves out hours without activation); prices in €/MWh, missing where nothing was
activated. Writes reference/esios_2024.js (window.ESIOS).
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
SRC = REPO.parent / "esios_download" / "hourly"
OUT = REPO / "reference" / "esios_2024.js"
YEAR = 2024

# viewer key: (e·sios files, kind); several files are summed (volumes) or stitched (prices)
SERIES = {
    "rt1_up": (["701_rt1_up_mwh"], "mwh"), "rt1_down": (["702_rt1_down_mwh"], "mwh"),
    "rt2_up": (["703_rt2_up_mwh"], "mwh"), "rt2_down": (["704_rt2_down_mwh"], "mwh"),
    "rtr_up": (["720_rtr_up_mwh"], "mwh"), "rtr_down": (["721_rtr_down_mwh"], "mwh"),
    "afrr_up": (["680_afrr_up_mwh"], "mwh"), "afrr_down": (["681_afrr_down_mwh"], "mwh"),
    "mfrr_up": (["10395_mfrr_up_mwh"], "mwh"), "mfrr_down": (["10394_mfrr_down_mwh"], "mwh"),
    "rr_up": (["1783_rr_up_mwh"], "mwh"), "rr_down": (["1784_rr_down_mwh"], "mwh"),
    "imbalance": (["1338_imbalance_net_mwh"], "net"),
    "rr_price": (["1782_rr_price"], "price"),
    "afrr_up_price": (["682_afrr_up_price"], "price"), "afrr_down_price": (["683_afrr_down_price"], "price"),
    # the marginal mFRR price (677/676) stops in December 2024, when e·sios moves to 10386/10387
    "mfrr_up_price": (["677_mfrr_up_price", "10386_mfrr_up_price_wavg"], "price"),
    "mfrr_down_price": (["676_mfrr_down_price", "10387_mfrr_down_price_wavg"], "price"),
}


def to_24(vals):
    """Clock-change days have 23 or 25 hours; map them to 24 rows as the model does."""
    if len(vals) == 23:
        return vals + [vals[-1]]
    if len(vals) == 25:
        return vals[:2] + vals[3:]
    return vals[:24]


def local_hours():
    """Every local hour of the year in order, as (date, hour) — 23 or 25 on clock-change days."""
    utc = pd.date_range(f"{YEAR}-01-01", f"{YEAR + 1}-01-01", freq="h", tz="Europe/Madrid", inclusive="left")
    return list(zip(utc.strftime("%Y-%m-%d"), utc.hour))


def series(files, kind, slots, days):
    vals = {}                                   # (date, hour) -> values in time order
    for f in files:
        df = pd.read_csv(SRC / f"{f}.csv", encoding="utf-8")
        got = {}
        for d, h, v in zip(df.date, df.hour, df.value):
            got.setdefault((d, int(h)), []).append(float(v))
        for k, v in got.items():
            if kind == "price":                 # stitch: the first file wins where it has a price
                if k not in vals or not any(x != 0 for x in vals[k]):
                    vals[k] = v
            else:
                vals[k] = [a + b for a, b in zip(vals[k], v)] if k in vals else v
    per_day, seen = {}, {}
    for d, h in slots:                          # walk the local hours, taking repeats in order
        n = seen.get((d, h), 0)
        seen[(d, h)] = n + 1
        v = vals.get((d, h), [])
        x = v[n] if n < len(v) else None
        if kind == "mwh":
            x = round(x or 0.0)
        elif kind == "net":
            x = None if x is None else round(x)
        else:
            x = None if x is None or x == 0 else round(x, 1)
        per_day.setdefault(d, []).append(x)
    out = []
    for d in days:
        out += to_24(per_day[d])
    return out


def main():
    slots = local_hours()
    days = sorted({d for d, _ in slots})
    data = {k: series(files, kind, slots, days) for k, (files, kind) in SERIES.items()}
    OUT.write_text("// REE e·sios balancing and redispatch per hour, 2024. Built by tools/build_esios.py.\n"
                   "window.ESIOS = " + json.dumps(dict(year=YEAR, days=days, series=data), separators=(",", ":"))
                   + ";\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(REPO)} ({OUT.stat().st_size / 1e3:.0f} kB), {len(days)} days")
    for k in ("rt1_up", "rt2_down", "rtr_up", "rr_price", "mfrr_up_price"):
        v = [x for x in data[k] if x is not None]
        print(f"  {k}: mean {sum(v) / len(v):.0f}, {len(v)} hours")


if __name__ == "__main__":
    main()
