# Handover

Latest release: 0.12.0 (2026-11-23). No open milestone: the direction meeting #150 sets the goal and the next one.

## Active topics

* #150 direction meeting (`meetings/2026-11-28-direction.md`): next step, after `Meeting closed`, record it, confirm `goal.md`, plan the milestones in GitHub as decided.
* pathfinder-uav requests #140 to #147 and weight and balance #148: wait for #150.
* PR #122 (word count by tokens) is the owner's to merge; on merge re-measure the limits in `scripts/wordcount.py` (now documents 5991, src+test 7320, extension 1534).
* #55 and #61 parked (`type:backlog`).

## Blockers

* No Node.js in the container (#151): `scripts/check.sh` cannot run locally. CI job `check` runs it on every push and pull request into `develop` and `main`; use its result until #151 is fixed.

## Owner directions

`decisions.md`; the entries of 2026-11-14 apply to every feature: product data only (#64), agent use (#54). Word limits are the chief engineer's (#71); ask the owner only for key design decisions; architecture changes get a feature review (#80). The milestone entries of #80 and #124 are superseded by #149, pending #150.

## Next issue

None until #150 is closed.

## From the review (2026-11-28)

* **Direction:** the base method replaces `timeline.md` and milestone meetings (#149). The `goal.md` draft makes pathfinder-uav's daily use the proof and 1.0 the end. Proposed: 0.13 "Fit for daily use" (#140 to #147), 0.14 "Weight and balance" (#148), 1.0 "Stable".
* **Do:** generalise each pathfinder-uav request before building it (`CLAUDE.md`, Scope); one feature review for the link-version changes #142, #144, #146; run the gate in CI while #151 is open.
* **Stop doing:** keeping `timeline.md`; per-milestone owner meetings.
* **Next issues, in order** (once #150 decides): the small requests #143, #145, #147, #141, #140; the link-version feature review (#142, #144, #146); then #148.
