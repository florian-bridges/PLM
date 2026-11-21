# Handover

What the next session needs to start. Current state only; history in git. The chief engineer keeps it current (skill `chief-engineer`, Your files).

Latest release: 0.10.0 (2026-11-21). Milestones and entry conditions: `timeline.md`.

## Active topics

* 0.11 active (meeting #110, budget 2): #111 TE-05.4, #112 CL-01.9, #113 CL-01.10, each a `feat/` branch in `/home/tower/PLM-wt`. Limits before: documents 5767/5830, extension 1529/1545, src+test 6672/6673 (full): reviewer raises by measured numbers.
* #114 bug (owner: fix, patch 0.10.1): `productTree` misses items under a folder without `item.yaml`, so the Product tree, `report document` and `report parts` are empty. feature-dev on `feat/top-level-items` (worktree `.claude/worktrees/top-level-items`). Next: check, reviewer (src+test limit full), merge; release 0.10.1 from `main` if 0.11 work is on `develop`.
* #61 and #55 parked; decision 8 of #90 (dropping `detail` from `report connections` rows) stays in the backlog.

## Open pull requests and blockers

* None yet; no blockers.

## Owner directions

* See `decisions.md`; the entries of 2026-11-14 apply to every feature: product data only (#64), agent use (#54). Since #71: the chief engineer governs the word limits; ask the owner only for key design decisions. Since #80: one owner meeting per milestone decides scope, budget and each feature; a separate feature review only for an architecture change. Since #91: context before each decision; a release meeting decides two or three milestones, no meeting per release.
