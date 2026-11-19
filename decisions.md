# Owner decisions

One line each: date, decision, source (issue or meeting). Append only; the chief engineer records what the owner said.

* 2026-11-14: Use by LLM agents is a strength of PLM: documented as a user story and in the README; every later feature takes it into account. (#54)
* 2026-11-14: Project management and product data are strictly separate: PLM holds product data only, no gates, milestones, meetings, phases or due dates; TBDs get no due gates. PLM stays general purpose, independent of hangar's definitions. (#64, #34)
* 2026-11-14: Design reviews with findings on items, and design decisions, are product data and stay in the product tree; a review has no gate field. US-9 Reviewer stays, without gates. (#64, hangar#3)
* 2026-11-14: Database or not is not decided: the architecture issues state needs, the solution stays open. (#65, #66)
* 2026-11-14: UI: a major redesign once the backend is stable (0.9); until then the VS Code extension is only kept working. (#67)
* 2026-11-14: Dropped: CAD/binary merge workflow, CAD integration model, validate rewriting files (never reproduced). (#37, #48, #16)
* 2026-11-14: Roadmap 0.4–0.9 as in `timeline.md` and the GitHub milestones; 0.4 budget 3 windows. (control room backlog cleanup)
* 2026-11-16: Feature review 0.4: go for #54, #33, #9, #20, each option A with the reviewer's cuts. (#71)
* 2026-11-16: The word limits are governed by the chief engineer; the owner is not asked about them. (#71)
* 2026-11-16: Ask the owner only for key design decisions, not every small one. (#71)
* 2026-11-17: 0.5 scope A: #58, #63 with #56 folded in (`plm trace` at depth 1 is the context view), #57, #55, and #60 as documentation (README CI section on existing commands). (#77)
* 2026-11-17: 0.5 budget 4 windows. (#77)
* 2026-11-19: One owner meeting per milestone: the release or next-milestone meeting decides scope, budget and go / smaller scope / no-go per feature; the shift then builds without asking again. (#80)
* 2026-11-19: A separate feature review only for a real architecture change (new storage, a new public interface style, a breaking data format change), prepared while other entry conditions go on. (#80)
* 2026-11-19: Meetings held in the control room while the shift waits count as held: the owner posts each decision on the meeting issue and ends with "Meeting closed". #78 is held as prepared. (#80)
* 2026-11-14: Interface detail of a port (pins, wire list, connection parameters, messages and signal layout) lives in a structured file in the port folder (e.g. `icd.yaml`) checked by the port type's schema; the port stays the smallest item, signals and messages are not items, a signal change flags the whole connection suspect. (#29)
* 2026-11-14: Messages belong to the sending port; connection-defining parameters (pin pairs between the two ports, bus baud rate) are fields of the connection, declared e.g. by the port type. (#29)
* 2026-11-14: Leave room for per-type check modules (bus load, label uniqueness, wire endpoints) in the `icd.yaml` format and type files; do not build them now. (#29)
* 2026-11-14: Blast stays as it is, neither retired nor integrated. (#29)
