# Direction meeting: PLM's goal and the next milestones

**Decide:** PLM moved to the tower's base method (#149): the owner sets the goal in `goal.md`, the chief engineer plans milestones within it. Confirm or change the `goal.md` draft, the scope, and the milestone plan below. Until then the shift does nothing new.

## 1. Where it stands

* Milestones 0.4 to 0.12 done, each within its budget (0.12 "Cleanup": 2 of 3 windows); latest release v0.12.0 (2026-11-23).
* `scripts/check.sh` now also runs in CI (`.github/workflows/check.yml`, job `check`) and passes on `develop`. Protecting `main` with it is yours.
* Word limits are full: documents 5991/5991, src+test 7318/7320, extension 1534/1534 (`scripts/wordcount.py`). PR #122 (count code by tokens) is still yours to merge.
* pathfinder-uav adopted v0.12.0 and filed eight requests (#140 to #147, label `request:pathfinder-uav`); you asked for weight and balance (#148). Parked: #55 (MCP server), #61 (requirements exchange).

## 2. Goal

`goal.md` (draft): PLM is the product-data tool for engineers and LLM agents; done when a real product (pathfinder-uav) does its daily product-data work in PLM without hand edits or reading PLM's source, the format is documented and changes come with a migration, CI passes, released as 1.0.

*Question:* is this the goal? It answers the open question of #121 (pathfinder-uav is the product that proves PLM) and sets 1.0 as the end.

## 3. Scope

* **In:** the eight pathfinder-uav requests, generalised; weight and balance (#148), generalised as mass and CG per hardware item aggregated through `uses`.
* **Out until a need appears:** #55, #61. Project management stays out (#64).

## 4. Milestones

* **0.13 "Fit for daily use"** (next). Target state: what pathfinder-uav hit with v0.12.0 is fixed. Check: #140 to #147 closed; links stay current when only non-versioned content changes (`retained`, an item nested below the target) and a changed version algorithm says so; CI passes; released as 0.13. Three of them (#142, #144, #146) change what a link's version covers, the core of suspect links: one feature review, prepared while the five small ones are built. Budget: 3 windows.
* **0.14 "Weight and balance"** (#148): mass and CG entries (estimated, measured) per hardware item, placement in `uses`, aggregation and a report with differences, machine-readable output for inertia. A new data format: a feature review first. Units in SI (kg, m), output as YAML and JSON like the other reports, check against a mass parameter through the existing parameters. About 3 windows.
* **1.0 "Stable"**: the data format documented with a migration for every change so far; PR #122 decided; released as 1.0. About 1 window.

*Question:* this plan and order? *Recommendation:* as above. 0.13 first because it removes friction a product already has; 0.14 adds new data and is the larger design.

*Prepared in the review cycle of 2026-11-28.*
