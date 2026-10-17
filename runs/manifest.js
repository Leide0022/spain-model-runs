// Written by scripts/publish_run.py in the model repo. Lists every published run.
window.RUN_MANIFEST = [
 {
  "schema": 1,
  "id": "2024-01-01_2024-r4-hydro",
  "name": "2024 run 4: + hydro planning",
  "note": "As run 3, plus Magnus's hydro planning (variant aligned_rc_observed): real starting reservoir level, seasonal limits, monthly inflow.",
  "published": "2026-10-17T10:33:57+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-01-01",
  "last_day": "2024-12-29",
  "n_days": 364,
  "ac_solved": 8717,
  "ac_total": 8736,
  "months": [
   "2024-01",
   "2024-02",
   "2024-03",
   "2024-04",
   "2024-05",
   "2024-06",
   "2024-07",
   "2024-08",
   "2024-09",
   "2024-10",
   "2024-11",
   "2024-12"
  ],
  "size_mb": 44.9,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "day-by-day-chain",
   "commit": "be7db1a",
   "commit_message": "GAS=on: coal redispatchable and Ceuta removed",
   "uncommitted_files": [
    "Manifest.toml",
    "Project.toml"
   ],
   "started": "2026-10-16 14:18:36",
   "finished": "2026-10-16 23:36:32",
   "runtime_min": 557.9,
   "power_flow": "AC",
   "linear_solver": "ma57",
   "label": "2024",
   "reconstructed": false
  }
 },
 {
  "schema": 1,
  "id": "2024-01-01_2024-r3-markup",
  "name": "2024 run 3: + tax and mark-ups",
  "note": "As run 2, plus Spain's generation tax (IVPEE, by quarter) and mark-ups on gas and coal bids (gas mark-up depends on how tight the hour is, RSI).",
  "published": "2026-10-17T10:33:12+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-01-01",
  "last_day": "2024-12-29",
  "n_days": 364,
  "ac_solved": 8719,
  "ac_total": 8736,
  "months": [
   "2024-01",
   "2024-02",
   "2024-03",
   "2024-04",
   "2024-05",
   "2024-06",
   "2024-07",
   "2024-08",
   "2024-09",
   "2024-10",
   "2024-11",
   "2024-12"
  ],
  "size_mb": 44.9,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "day-by-day-chain",
   "commit": "be7db1a",
   "commit_message": "GAS=on: coal redispatchable and Ceuta removed",
   "uncommitted_files": [
    "Manifest.toml",
    "Project.toml"
   ],
   "started": "2026-10-16 14:17:18",
   "finished": "2026-10-16 23:28:49",
   "runtime_min": 551.5,
   "power_flow": "AC",
   "linear_solver": "ma57",
   "label": "2024",
   "reconstructed": false
  }
 },
 {
  "schema": 1,
  "id": "2024-01-01_2024-r2-gas",
  "name": "2024 run 2: gas and coal costs",
  "note": "As run 1, but each gas plant has its own cost (daily MIBGAS gas and EU ETS CO2 price, efficiency by build year), coal from quarterly import prices, closed coal plants removed, coal can be redispatched. Markets run as one chain over the year, so plants' on/off state carries over.",
  "published": "2026-10-17T10:32:58+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-01-01",
  "last_day": "2024-12-29",
  "n_days": 364,
  "ac_solved": 8721,
  "ac_total": 8736,
  "months": [
   "2024-01",
   "2024-02",
   "2024-03",
   "2024-04",
   "2024-05",
   "2024-06",
   "2024-07",
   "2024-08",
   "2024-09",
   "2024-10",
   "2024-11",
   "2024-12"
  ],
  "size_mb": 44.9,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "day-by-day-chain",
   "commit": "be7db1a",
   "commit_message": "GAS=on: coal redispatchable and Ceuta removed",
   "uncommitted_files": [
    "Manifest.toml",
    "Project.toml"
   ],
   "started": "2026-10-16 14:19:04",
   "finished": "2026-10-16 23:54:45",
   "runtime_min": 575.7,
   "power_flow": "AC",
   "linear_solver": "ma57",
   "label": "2024",
   "reconstructed": false
  }
 },
 {
  "schema": 1,
  "id": "2024-01-01_2024-r1-original",
  "name": "2024 run 1: original",
  "note": "Full year 2024 (1 Jan - 29 Dec), branch day-by-day-chain. Original model: gas and coal at the old fixed costs, no tax or mark-ups. Accepted solar/wind. 52 one-week runs, joined.",
  "published": "2026-10-17T10:32:52+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-01-01",
  "last_day": "2024-12-29",
  "n_days": 364,
  "ac_solved": 8732,
  "ac_total": 8736,
  "months": [
   "2024-01",
   "2024-02",
   "2024-03",
   "2024-04",
   "2024-05",
   "2024-06",
   "2024-07",
   "2024-08",
   "2024-09",
   "2024-10",
   "2024-11",
   "2024-12"
  ],
  "size_mb": 44.9,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "day-by-day-chain",
   "commit": "be7db1a",
   "commit_message": "GAS=on: coal redispatchable and Ceuta removed",
   "uncommitted_files": [
    "Manifest.toml",
    "Project.toml"
   ],
   "started": "2026-10-16 14:08:59",
   "finished": "2026-10-16 16:43:25",
   "runtime_min": 154.4,
   "power_flow": "AC",
   "linear_solver": "ma57",
   "label": "2024",
   "reconstructed": false
  }
 },
 {
  "schema": 1,
  "id": "2024-01-01_2024-offered",
  "name": "2024, offered solar/wind",
  "note": "Full year 2024 (1 Jan - 29 Dec). Day-ahead solar and wind = OMIE's accepted programme plus what was offered in the auction but not accepted (res_input = offered, no bid-price limit). Otherwise identical to 2024, accepted solar/wind.",
  "published": "2026-10-12T16:45:12+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-01-01",
  "last_day": "2024-12-29",
  "n_days": 364,
  "ac_solved": 8732,
  "ac_total": 8736,
  "months": [
   "2024-01",
   "2024-02",
   "2024-03",
   "2024-04",
   "2024-05",
   "2024-06",
   "2024-07",
   "2024-08",
   "2024-09",
   "2024-10",
   "2024-11",
   "2024-12"
  ],
  "size_mb": 44.9,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "re-total-bids",
   "commit": "539be8c",
   "commit_message": "solstorm_start_weeks.sh: background lanes with setsid/nohup (compute nodes have no screen)",
   "uncommitted_files": [
    "Manifest.toml",
    "Project.toml"
   ],
   "started": "2026-10-12 15:12:55",
   "finished": "2026-10-12 16:05:24",
   "runtime_min": 52.5,
   "power_flow": "AC",
   "linear_solver": "ma57",
   "label": "2024",
   "reconstructed": false
  }
 },
 {
  "schema": 1,
  "id": "2024-01-01_2024-accepted",
  "name": "2024, accepted solar/wind",
  "note": "Full year 2024 (1 Jan - 29 Dec). Day-ahead solar and wind = OMIE's accepted programme (res_input = accepted, same as main). Run as 52 one-week runs, joined. Twin of the offered run: same code, solver and days.",
  "published": "2026-10-12T16:41:31+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-01-01",
  "last_day": "2024-12-29",
  "n_days": 364,
  "ac_solved": 8732,
  "ac_total": 8736,
  "months": [
   "2024-01",
   "2024-02",
   "2024-03",
   "2024-04",
   "2024-05",
   "2024-06",
   "2024-07",
   "2024-08",
   "2024-09",
   "2024-10",
   "2024-11",
   "2024-12"
  ],
  "size_mb": 44.9,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "re-total-bids",
   "commit": "539be8c",
   "commit_message": "solstorm_start_weeks.sh: background lanes with setsid/nohup (compute nodes have no screen)",
   "uncommitted_files": [
    "Manifest.toml",
    "Project.toml"
   ],
   "started": "2026-10-12 15:12:47",
   "finished": "2026-10-12 16:04:12",
   "runtime_min": 51.4,
   "power_flow": "AC",
   "linear_solver": "ma57",
   "label": "2024",
   "reconstructed": false
  }
 },
 {
  "schema": 1,
  "id": "2024-05-01_may-1-7-offered-solar-wind",
  "name": "1-7 May 2024, offered solar/wind",
  "note": "Solar and wind = OMIE's accepted day-ahead amount plus what was offered in the auction but not accepted (res_input = offered, no bid-price limit), so the model can curtail them itself. Everything else as the May free-France-split run. Wind is curtailed first (0.18 vs 0.00 EUR/MWh); with no price limit, 1 May falls to about 0 all day.",
  "published": "2026-10-12T14:25:47+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-05-01",
  "last_day": "2024-05-07",
  "n_days": 7,
  "ac_solved": 168,
  "ac_total": 168,
  "months": [
   "2024-05"
  ],
  "size_mb": 1.2,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "re-total-bids",
   "commit": "86fff23",
   "commit_message": "Scripts for running 2024 month by month on Linux and on NTNU's Solstorm",
   "uncommitted_files": [
    "Manifest.toml"
   ],
   "started": "2026-10-12 13:58:44",
   "finished": "2026-10-12 14:21:50",
   "runtime_min": 23.1,
   "power_flow": "AC",
   "linear_solver": "ma57",
   "label": "2024",
   "reconstructed": false
  }
 },
 {
  "schema": 1,
  "id": "2024-09-01_september-2024-free-france-split",
  "name": "September 2024, free France split",
  "note": "Full September chain with crossborder_split = country_total (branch xb-split-country-total). All 720 AC hours solve.",
  "published": "2026-10-08T15:15:52+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-09-01",
  "last_day": "2024-09-30",
  "n_days": 30,
  "ac_solved": 720,
  "ac_total": 720,
  "months": [
   "2024-09"
  ],
  "size_mb": 4.0,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "xb-split-country-total",
   "commit": "b9e8933",
   "commit_message": "Let the redispatch split the cross-border exchange over the border buses",
   "uncommitted_files": [
    "Manifest.toml"
   ],
   "started": "2026-10-07 13:57:01",
   "finished": "2026-10-07 15:32:43",
   "runtime_min": 95.7,
   "power_flow": "AC",
   "linear_solver": "ma57",
   "label": "2024",
   "reconstructed": false
  }
 },
 {
  "schema": 1,
  "id": "2024-08-01_august-2024",
  "name": "August 2024",
  "note": "First full August run.",
  "published": "2026-10-08T15:15:37+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-08-01",
  "last_day": "2024-08-31",
  "n_days": 31,
  "ac_solved": 658,
  "ac_total": 744,
  "months": [
   "2024-08"
  ],
  "size_mb": 4.1,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "gas-mw-chp-residual",
   "commit": "3c38135",
   "commit_message": "",
   "uncommitted_files": [],
   "started": null,
   "finished": null,
   "runtime_min": null,
   "power_flow": null,
   "linear_solver": null,
   "label": null,
   "reconstructed": true
  }
 },
 {
  "schema": 1,
  "id": "2024-05-01_may-2024-free-france-split",
  "name": "May 2024, free France split",
  "note": "Same as the May run, but the redispatch chooses how the France/Portugal exchange is split over the border lines (crossborder_split = country_total). All 744 AC hours solve (606 before).",
  "published": "2026-10-08T15:15:23+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-05-01",
  "last_day": "2024-05-31",
  "n_days": 31,
  "ac_solved": 744,
  "ac_total": 744,
  "months": [
   "2024-05"
  ],
  "size_mb": 4.1,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "xb-split-country-total",
   "commit": "134d50e",
   "commit_message": "Record run info at run start; publish runs to the results viewer",
   "uncommitted_files": [
    "Manifest.toml",
    "config.toml",
    "run_market_chain.jl"
   ],
   "started": "2026-10-07 11:53:44",
   "finished": "2026-10-07 13:15:25",
   "runtime_min": 81.7,
   "power_flow": "AC",
   "linear_solver": "ma57",
   "label": "2024",
   "reconstructed": false
  }
 },
 {
  "schema": 1,
  "id": "2024-05-01_may-2024",
  "name": "May 2024",
  "note": "First full May run.",
  "published": "2026-10-08T15:15:07+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-05-01",
  "last_day": "2024-05-31",
  "n_days": 31,
  "ac_solved": 606,
  "ac_total": 744,
  "months": [
   "2024-05"
  ],
  "size_mb": 4.1,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "gas-mw-chp-residual",
   "commit": "3c38135",
   "commit_message": "",
   "uncommitted_files": [],
   "started": null,
   "finished": null,
   "runtime_min": null,
   "power_flow": null,
   "linear_solver": null,
   "label": null,
   "reconstructed": true
  }
 },
 {
  "schema": 1,
  "id": "2024-01-05_january-5-31",
  "name": "January 5–31",
  "note": "First long January run. Checking solve rate and price level after the 2024-01-01 inputs.",
  "published": "2026-10-08T15:14:54+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-01-05",
  "last_day": "2024-01-31",
  "n_days": 27,
  "ac_solved": 575,
  "ac_total": 648,
  "months": [
   "2024-01"
  ],
  "size_mb": 3.6,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "gas-mw-chp-residual",
   "commit": "b99e237",
   "commit_message": "",
   "uncommitted_files": [],
   "started": null,
   "finished": null,
   "runtime_min": null,
   "power_flow": null,
   "linear_solver": null,
   "label": null,
   "reconstructed": true
  }
 },
 {
  "schema": 1,
  "id": "2024-01-01_january-1-3",
  "name": "January 1–3",
  "note": "First run of the new 1 January inputs.",
  "published": "2026-10-08T15:14:42+02:00",
  "published_by": "Lars Erik Eide",
  "first_day": "2024-01-01",
  "last_day": "2024-01-03",
  "n_days": 3,
  "ac_solved": 49,
  "ac_total": 72,
  "months": [
   "2024-01"
  ],
  "size_mb": 0.7,
  "info": {
   "ran_by": "Lars Erik Eide",
   "branch": "gas-mw-chp-residual",
   "commit": "b99e237",
   "commit_message": "",
   "uncommitted_files": [],
   "started": null,
   "finished": null,
   "runtime_min": null,
   "power_flow": null,
   "linear_solver": null,
   "label": null,
   "reconstructed": true
  }
 },
 {
  "schema": 1,
  "id": "2024-12-01_december-2024-free-france-split",
  "name": "December 2024, free France split",
  "note": "Full December chain (1-29 Dec; 30-31 Dec have no inputs yet) with crossborder_split = country_total (branch xb-split-country-total), MA57. All 696 AC hours solve.",
  "published": "2026-10-07T17:01:05+02:00",
  "published_by": "magnusberard",
  "first_day": "2024-12-01",
  "last_day": "2024-12-29",
  "n_days": 29,
  "ac_solved": 696,
  "ac_total": 696,
  "months": [
   "2024-12"
  ],
  "size_mb": 3.8,
  "info": {
   "ran_by": "magnusberard",
   "branch": "xb-split-country-total",
   "commit": "b9e8933",
   "commit_message": "Let the redispatch split the cross-border exchange over the border buses",
   "uncommitted_files": [
    "Manifest.toml"
   ],
   "started": "2026-10-07 14:06:11",
   "finished": "2026-10-07 16:14:29",
   "runtime_min": 128.3,
   "power_flow": "AC",
   "linear_solver": "ma57",
   "label": "2024",
   "reconstructed": false
  }
 },
 {
  "schema": 1,
  "id": "2024-11-01_november-2024-free-france-split",
  "name": "November 2024, free France split",
  "note": "Full November chain with crossborder_split = country_total (branch xb-split-country-total), MA57. All 720 AC hours solve.",
  "published": "2026-10-07T16:59:22+02:00",
  "published_by": "magnusberard",
  "first_day": "2024-11-01",
  "last_day": "2024-11-30",
  "n_days": 30,
  "ac_solved": 720,
  "ac_total": 720,
  "months": [
   "2024-11"
  ],
  "size_mb": 3.9,
  "info": {
   "ran_by": "magnusberard",
   "branch": "xb-split-country-total",
   "commit": "b9e8933",
   "commit_message": "Let the redispatch split the cross-border exchange over the border buses",
   "uncommitted_files": [
    "Manifest.toml"
   ],
   "started": "2026-10-07 14:05:54",
   "finished": "2026-10-07 16:14:50",
   "runtime_min": 128.9,
   "power_flow": "AC",
   "linear_solver": "ma57",
   "label": "2024",
   "reconstructed": false
  }
 }
];
