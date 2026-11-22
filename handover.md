# Handover

What the next session needs to start. Current state only; history in git. The chief engineer keeps it current (skill `tower:chief-engineer`, The record).

Latest release: 0.11.1 (2026-11-21). Milestones and entry conditions: `timeline.md`.

## Active topics

* 0.12 "Cleanup" active (meeting #121, budget 3 windows): entry conditions in `timeline.md`, GitHub milestone 0.12. Merged: #128 (PR #131), #125 (PR #132), #123 (PR #133), #126 (PR #134), #129 (PR #135), #130 (PR #136). Next step: #127 (respacing, branch feat/respace), then release 0.12.
* PR #122 (word count by tokens, control room) is the owner's to merge; It will conflict in `scripts/wordcount.py` limits (changed by #129, #130, #127): re-measure on merge.
* #61 and #55 parked.

## Open pull requests and blockers

* #122 (owner's). No blockers.

## Owner directions

* See `decisions.md`; the entries of 2026-11-14 apply to every feature: product data only (#64), agent use (#54). Since #71: the chief engineer governs the word limits; ask the owner only for key design decisions. Since #80: one owner meeting per milestone decides scope, budget and each feature; a separate feature review only for an architecture change. Since #91: context before each decision. Since #124 (2026-11-22): a milestone is a target state with a check, defined by the owner in a milestone meeting; you break it down, adjust the breakdown, approve every requirement inside it and release whenever something is ready; only blocking review findings stop a merge; over budget is a notice, not a stop.
