# Milestone meeting: the next target state

**Decide:** PLM's next target state, its check and a rough budget. 0.12 "Cleanup" is done and released; no decided milestone is left. The four directions of meeting #121 (`meetings/2026-11-22-milestone-next.md`, section 2: their meaning, concepts and questions) still stand; this file only adds what changed.

## 1. Reached

* 0.12 "Cleanup" (budget 3 windows): #123, #125, #126, #127, #128, #129 and the whole-project review #130 merged; its one blocking finding (`list <field> <item>` missed the item's own requirements) fixed and confirmed by `reviewer`; `scripts/check.sh` passes; released as v0.12.0.
* Word limits after 0.12: documents 5991/5991, src+test 7318/7320, extension 1534/1534. PR #122 (count code by tokens) is still the owner's to merge; it must be re-measured against develop first.
* Backlog: only #55 (MCP server) and #61 (requirements exchange), both parked. `improvements.md` holds no entries.

## 2. Directions: what changed

* **A. Proven on a real product.** New fact: pathfinder-uav's data (49 items) fails `plm validate` with v0.12.0: 138 errors. 97 `schema` errors (`rationale`/`verification must NOT have unevaluated properties`) and 30 of the 41 `unknown-type` errors (`analysis`, `decision`, `hazard`, `interface`) come from its own types still being in a `schemas/` folder, which PLM no longer reads; PLM reads `types/*.yaml`. These are fixed in pathfinder-uav's data, which is that project's work. In PLM, two findings: no migration note says that `schemas/` became `types/`, and the message names the property as if it had bad content when the property is simply undeclared. The other 11 are `meeting` and `review` items: process data, which PLM does not hold (#64), so they leave pathfinder-uav's product tree. The questions of #121 remain: is pathfinder-uav the product, and which daily tasks must work?
* **B. MCP server (#55), C. requirements exchange (#61):** no project has asked for them.
* **D. Ready for 1.0:** A's errors argue for D's "data format stable, changes come with a migration": 0.12 changed no format, but earlier milestones did, and a product had to catch up by hand.

## 3. Target state and budget

The target state in one or two sentences, its check, a rough budget in windows; later milestones may be decided too.

*Recommendation:* D, checked on A: "PLM's data format is documented as stable, with a migration note for every format change so far; pathfinder-uav's product data passes `plm validate` once it follows them." Check: the format and migration notes are in the help; the `unevaluated properties` message names the undeclared field; `plm validate` passes on a copy of pathfinder-uav's data migrated by those notes alone (meetings and reviews removed). About 2 windows in PLM; migrating pathfinder-uav itself stays that project's work. B and C stay parked.

*Prepared on shift (2026-11-23); read once by `reviewer`; its findings (item count, process data, which errors are PLM work) are in section 2.*
