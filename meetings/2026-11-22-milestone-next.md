# Milestone meeting: the next target state

**Decide:** PLM's next target state, its check and a rough budget. The roadmap of 2026-11-14 is delivered (0.4 to 0.11). From now on a milestone is a target state that lasts many windows; the chief engineer breaks it into issues and adjusts them (decisions of 2026-11-22, #124). This meeting first discusses the concepts behind four directions, with questions to the owner; then the owner states the target state.

## 1. Reached

* 0.4 to 0.11 built and released, the last as v0.11.1; every feature of the roadmap; #67 closed.
* Open, small, for whichever milestone comes next: four review points from 0.11 (the Mermaid graph draws no nesting; `report document` without an item runs `validate` once per top-level item and prints an empty `findings:` line; 7 lines in `src/cli.ts` without spaces undercount words; `detail` in `report connections` rows, #90 decision 8) and #123 (document links are absolute `file:///` URLs, which VS Code's Markdown preview does not open).
* Word limits were full at 0.11: documents 5878/5878, src+test 6911/6911, extension 1533/1542.
* Parked: #55 MCP server, #61 requirements exchange.

## 2. Directions and concepts

### A. Proven on a real product

*Means:* a product team keeps its items, requirements, structure and test evidence in PLM and works with it every day; what is missing shows up and is fixed in PLM, generalised. pathfinder-uav already has a `plm.yaml`.
*Concept:* the target state is PLM's, measured on a real product, e.g. "pathfinder-uav's product data passes `plm validate`, and its requirements document and `impact` report are used in its reviews". The PLM shift writes only in PLM: moving pathfinder-uav's data is that project's work, done while it is the main project.
*Questions:* (1) Is pathfinder-uav the product to prove PLM on? (2) Which daily tasks must work for you to call it used? (3) Does its data move before, during or after this milestone?

### B. Agents use PLM as tools (#55)

*Means:* an agent without a shell (e.g. in a chat app) reads and changes product data through typed tools.
*Today:* agents use the CLI with `--format json` without problems; agent use is a standing strength (#54).
*Questions:* (1) Is there an agent use without a shell you have in mind? (2) Reading only, or changes too?

### C. Requirements exchange (#61)

*Means:* requirements come in from, or go out to, another tool (ReqIF, CSV).
*Questions:* (1) Is there a tool or partner that would exchange requirements with PLM? (2) Which format, which direction?

### D. Ready for 1.0

*Means:* PLM is declared stable: the data format does not break without a migration, every command is documented, it works on large products, the known debts are paid.
*Concept:* a check could be: a generated sample product of a few thousand items runs every command within a stated time; the data format is documented as stable; the README covers every command; the open points of section 1 are closed.
*Questions:* (1) What does 1.0 mean for you: a stable data format, or complete for a use such as A? (2) Is speed on large products a concern today? (3) Which product size is realistic?

## 3. Target state and budget

After the discussion: the target state in one or two sentences, its check, a rough budget in windows. Later milestones may be decided as well.

*Recommendation:* D, then A. D lies wholly inside PLM, so the shift can reach it alone; it gathers the open points; and it fixes the data format before a real product depends on it. A follows while pathfinder-uav is the main project. B and C stay parked until a project needs them.

*Prepared in the control room on the owner's request (2026-11-22); `reviewer` has not read this file.*

## Minutes

Held by the owner in the control room on #121; the earlier 0.12 "Tidy-up" decisions there were replaced by the last one.

**Decisions:** 0.12 "Cleanup", budget 3 windows: the six cleanups and a whole-project check and cleanup; check: the six issues closed, a whole-project `reviewer` review with no blocking findings left, `scripts/check.sh` passes, released as 0.12. Documentation for agents as in `decisions.md`. Word count change in PR #122. #55 and #61 stay parked; no later milestone.

**Actions:** see the entry conditions of 0.12 in `timeline.md`.
