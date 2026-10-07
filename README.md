# spain-model-runs

Website for comparing runs of our Spain power-market model with real 2024 data (OMIE, ENTSO-E).
Publish a run with one command and the whole group can see it.

## Look at the runs

1. Get the newest runs: `git pull` in this folder.
2. Open `index.html` (double-click; any browser). Pick a run in the menu on the left.

It works offline; only the fonts come from the internet.

## Add your run

After a model run has finished (in the model repo, `Spain_power_system`):

```powershell
python scripts/publish_run.py results\<your run folder> --name "August, coal floor" --note "testing coal_min_gen_frac" --push
```

That reads the run's big CSV files on your PC, writes a small package (a few MB per month) into
`runs/` of this repo, and with `--push` commits and pushes it. Everyone else gets it with `git pull`.

The first time, clone this repo **next to** the model repo, so that the folders look like this
(the script finds it there; otherwise pass `--runs-repo <path>`):

```
Spain power system Model\
├── Spain_power_system\      the model repo
└── spain-model-runs\        this repo
```

The run's label (code version, uncommitted files, days, solver, who ran it, runtime) comes from
`results\<run>\run_info.json`, which the model writes at the start of every run. Runs made before
that existed can be published with `--ran-by` and `--commit`; the page then says the info was
filled in by hand. Give a run a short, clear `--name` and say in `--note` what it tests. Publish the
runs worth discussing, not every test.

## What is in here

| Path | What |
|---|---|
| `index.html`, `viewer.css`, `viewer.js` | the website |
| `runs/manifest.js` | the list of published runs (rewritten by `publish_run.py`) |
| `runs/<id>/` | one run: `meta.json`, `data.js` (prices, generation mix, solve status, map geometry) and one file per month with the hourly map data |
| `reference/` | real data for 2024, built once: OMIE day-ahead price and programme per technology, ENTSO-E actual generation per type and per unit (45 matched plant sites), and the map background |
| `tools/build_reference.py` | rebuilds `reference/` from the raw OMIE/ENTSO-E downloads (only needed when the real data changes) |
| `tools/build_basemap.py` | rebuilds the map background (Natural Earth outlines and shaded relief, es-atlas regions) |
| `tools/build_model_facts.py` | rebuilds `reference/model_facts.js`, the model facts on the Market stages tab (capacity, load, line and transformer types); rerun when the model's data changes |

The real data for the redispatch comes from ENTSO-E (what plants really produced); the market
stages are compared with OMIE's day-ahead programme. Matching ENTSO-E's unit codes to the model's
plants is a hand-made table: `reference/entsoe_unit_crosswalk.csv`.

## Known limits

- Real day-ahead prices are only in `reference/` for January 2024 so far.
- REE does not publish flows on Spain's internal lines, so the grid map has no real counterpart.
- A full-year run is roughly 40 MB. Fine for a few runs; with many, the hourly map data should be
  thinned out.

Map background: Natural Earth (public domain), world-atlas, es-atlas.
