# Owner decisions

One line each: date, decision, source (issue or meeting). Append only; the chief engineer records what the owner said.

* 2026-11-14: Use by LLM agents is a strength of PLM: documented as a user story and in the README; every later feature takes it into account. (#54)
* 2026-11-14: Project management and product data are strictly separate: PLM holds product data only, no gates, milestones, meetings, phases or due dates; TBDs get no due gates. PLM stays general purpose, independent of hangar's definitions. (#64, #34)
* 2026-11-14: Design reviews with findings on items, and design decisions, are product data and stay in the product tree; a review has no gate field. US-9 Reviewer stays, without gates. (#64, hangar#3)
* 2026-11-14: Database or not is not decided: the architecture issues state needs, the solution stays open. (#65, #66)
* 2026-11-14: UI: a major redesign once the backend is stable (0.9); until then the VS Code extension is only kept working. (#67)
* 2026-11-14: Dropped: CAD/binary merge workflow, CAD integration model, validate rewriting files (never reproduced). (#37, #48, #16)
* 2026-11-14: Roadmap 0.4–0.9 as in `timeline.md` and the GitHub milestones; 0.4 budget 3 windows. (control room backlog cleanup)
