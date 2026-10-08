"""Build reference/esios_2024.js: REE's real balancing, redispatch and intraday prices per hour, for the viewer.

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
    # redispatch cost, EUR per hour: the extra cost over the market (P.O. 14.4). 709 = phase I up
    # minus the refunds of phase I down and phase II down (+ phase II up); 724 is the whole real-time
    # cost, 1723/1724 its up and down parts that go with the volumes 720/721
    "rt_cost": (["709_rt_cost_eur"], "eur"),
    "rt1_up_cost": (["1373_rt1_up_cost_eur"], "eur"), "rt1_down_cost": (["1374_rt1_down_cost_eur"], "eur"),
    "rt2_up_cost": (["1375_rt2_up_cost_eur"], "eur"), "rt2_down_cost": (["1376_rt2_down_cost_eur"], "eur"),
    "rtr_cost": (["724_rtr_cost_eur"], "eur"),
    "rtr_up_cost": (["1723_rtr_up_cost_eur"], "eur"), "rtr_down_cost": (["1724_rtr_down_cost_eur"], "eur"),
    # intraday market prices, Spanish zone; 0 and negative prices are real here ("market" kind).
    # e·sios keeps the ids when the six MIBEL sessions became the European auctions: 613 is IDA2 and
    # 614 IDA3 (hours 12-23) from delivery day IDA_START, MI2/MI3 before, so those days are left out
    "ida2": (["613_id_s2_price"], "market"), "ida3": (["614_id_s3_price"], "market"),
    "cid": (["1727_cid_price"], "market"),
    # traded volume, MWh per hour (energy assigned, one side; OMIE via e·sios), same numbering:
    # 606 IDA2 and 607 IDA3 from IDA_START. Missing where e·sios has no data ("net" kind)
    "ida2_mwh": (["606_id_s2_mwh"], "net"), "ida3_mwh": (["607_id_s3_mwh"], "net"),
    "cid_mwh": (["1442_cid_mwh"], "net"),
}
# first delivery day of the European intraday auctions (IDA1-3); e·sios has MI sessions until 13/06
IDA_START = f"{YEAR}-06-14"
IDA_KEYS = ("ida2", "ida3", "ida2_mwh", "ida3_mwh")
# redispatch volume by cause (SCB overloads in the base case, SCA after a contingency, CT voltage
# control, RTD distribution grid, RSI/RBI too little reserve up/down, ASE frequency, Otros other);
# a series e·sios has no data for is missing from ../esios_download/hourly and counts as 0
CAUSES = {"rt1": {"scb": (1790, 1791), "sca": (1792, 1793), "ct": (1794, 1795), "rtd": (1796, 1797),
                  "rsi": (2352, 2353), "otros": (1800, 1801)},
          "rtr": {"scb": (1802, 1803), "sca": (1804, 1805), "ct": (1806, 1807), "rtd": (1808, 1809),
                  "otros": (1812, 1813), "rsi": (1814, 1815), "rbi": (1816, 1817), "ase": (1818, 1819)}}
for stage, causes in CAUSES.items():
    for cause, (up, down) in causes.items():
        SERIES[f"{stage}_up_{cause}"] = ([f"{up}_{stage}_up_{cause}_mwh"], "mwh")
        SERIES[f"{stage}_down_{cause}"] = ([f"{down}_{stage}_down_{cause}_mwh"], "mwh")
# the one day with a repeated hour (clocks back); elsewhere two values in one hour are parts of it
FALL_BACK = f"{YEAR}-10-27"


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
        if not (SRC / f"{f}.csv").exists():
            continue
        df = pd.read_csv(SRC / f"{f}.csv", encoding="utf-8")
        got = {}
        for d, h, v in zip(df.date, df.hour, df.value):
            k = (d, int(h))
            if k in got and d != FALL_BACK and kind not in ("price", "market"):
                got[k][0] += float(v)                 # two parts of one hour: add them
            elif k in got and d != FALL_BACK:
                continue                              # a price: keep the first
            else:
                got.setdefault(k, []).append(float(v))
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
        if kind in ("mwh", "eur"):
            x = round(x or 0.0)
        elif kind in ("net", "market"):
            x = None if x is None else round(x, 1 if kind == "market" else None)
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
    for k in IDA_KEYS:                          # the MI sessions before the switch are a different market
        data[k] = [None if days[i // 24] < IDA_START else x for i, x in enumerate(data[k])]
    OUT.write_text("// REE e·sios balancing and redispatch per hour, 2024. Built by tools/build_esios.py.\n"
                   "window.ESIOS = " + json.dumps(dict(year=YEAR, days=days, series=data), separators=(",", ":"))
                   + ";\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(REPO)} ({OUT.stat().st_size / 1e3:.0f} kB), {len(days)} days")
    for k in ("rt1_up", "rt2_down", "rtr_up", "rr_price", "mfrr_up_price", "rt_cost", "rtr_cost", "ida2", "ida3", "cid", "ida2_mwh", "ida3_mwh", "cid_mwh"):
        v = [x for x in data[k] if x is not None]
        print(f"  {k}: mean {sum(v) / len(v):.0f}, {len(v)} hours")


if __name__ == "__main__":
    main()
