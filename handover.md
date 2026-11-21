# Handover

What the next session needs to start. Current state only; history in git. The chief engineer keeps it current (skill `chief-engineer`, Your files).

Latest release: 0.11.1 (2026-11-21). Milestones and entry conditions: `timeline.md`.

## Active topics

* 0.11 done: #111 (PR #115), #112 (PR #117), #113 (PR #116), v0.11.0 (PR #118); #67 closed.
* #114 fixed (PR #119), v0.11.1 (PR #120). Limits full: documents 5878/5878, src+test 6911/6911, extension 1533/1542.
* Release meeting #121 prepared (`meetings/2026-11-21-release-0.11.md`, review points of 0.11 in it): waits for the owner; no decided milestone left.
* #114 bug (owner: fix, patch 0.10.1): `productTree` misses items under a folder without `item.yaml`, so the Product tree, `report document` and `report parts` are empty. feature-dev on `feat/top-level-items` (worktree `.claude/worktrees/top-level-items`). Next: check, reviewer (src+test limit full), merge; release 0.10.1 from `main` if 0.11 work is on `develop`.
* #61 and #55 parked; decision 8 of #90 (dropping `detail` from `report connections` rows) stays in the backlog.

## Open pull requests and blockers

* None. Blocker: next milestone needs meeting #121.

## Owner directions

* See `decisions.md`; the entries of 2026-11-14 apply to every feature: product data only (#64), agent use (#54). Since #71: the chief engineer governs the word limits; ask the owner only for key design decisions. Since #80: one owner meeting per milestone decides scope, budget and each feature; a separate feature review only for an architecture change. Since #91: context before each decision; a release meeting decides two or three milestones, no meeting per release.
