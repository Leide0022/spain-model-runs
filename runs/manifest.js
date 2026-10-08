// Written by scripts/publish_run.py in the model repo. Lists every published run.
window.RUN_MANIFEST = [
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
