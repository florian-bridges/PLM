# Handover

What the next session needs to start. Current state only; history in git. The chief engineer keeps it current (skill `tower:chief-engineer`, The record).

Latest release: 0.12.0 (2026-11-23). Milestones and entry conditions: `timeline.md`.

## Active topics

* 0.12 "Cleanup" done (v0.12.0; review confirmed by `reviewer`). No decided milestone left: milestone meeting #139 prepared (`meetings/2026-11-23-milestone-next.md`); the shift stops for it.
* PR #122 (word count by tokens, control room) is the owner's to merge; It will conflict in `scripts/wordcount.py` limits (now docs 5991, src 7320, ext 1534; #127 raised src/ext for respacing): re-measure on merge.
* #61 and #55 parked.

## Open pull requests and blockers

* #122 (owner's). No blockers.

## Owner directions

* See `decisions.md`; the entries of 2026-11-14 apply to every feature: product data only (#64), agent use (#54). Since #71: the chief engineer governs the word limits; ask the owner only for key design decisions. Since #80: one owner meeting per milestone decides scope, budget and each feature; a separate feature review only for an architecture change. Since #91: context before each decision. Since #124 (2026-11-22): a milestone is a target state with a check, defined by the owner in a milestone meeting; you break it down, adjust the breakdown, approve every requirement inside it and release whenever something is ready; only blocking review findings stop a merge; over budget is a notice, not a stop.
