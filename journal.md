# Journal

## 2026-11-28, review (#149)

* **Since the last review:** 0.12 "Cleanup" done and released (v0.12.0); no work cycles since. pathfinder-uav filed eight requests (#140 to #147); the owner asked for weight and balance (#148).
* **Changed:** the record converted to the tower base method: `goal.md` drafted, `timeline.md` deleted (its only remaining content, #55 and #61, is in `type:backlog` issues), `handover.md` in the new form, the milestone decisions of #80 and #124 marked superseded, the project skills without `timeline.md` and the old meeting kinds. CI workflow `check` added; it passes on develop. #140 to #147 labelled `request:pathfinder-uav`; #139 closed, replaced by the direction meeting #150. No `needs-owner` issues were open.
* **Watch:** Node.js is missing in the container (#151), so the gate runs only in CI; the word limits are full, so every feature must cut as much as it adds or the reviewer raises a limit.
* **Hypotheses:** the link-version requests (#142, #144, #146) share one cause, what a version covers; one design fixes all three.
* **Actions and expected effect:** after #150, a 0.13 of small fixes plus one feature review should close the eight requests in about 3 windows and let pathfinder-uav work without hand edits.
