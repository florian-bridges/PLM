# Feature review: 0.4 features that add requirements (#54, #20, #33, #9)

Four 0.4 entry conditions are big features (skill `meeting`, `kinds/feature.md`, When): #54 adds a scenario, #20 changes component requirement TE-06 and adds configuration, #33 and #9 change low-level requirements and add words while the limits sit at their counts. **Decide** for each: go, go with reduced scope, or no-go. The other three (#64, #36, #35) are merged.

## 1. #54 Use by LLM agents

**Need.** The owner: PLM has mainly been used by LLM agents, which is a strength to document. Who: a team or engineer letting coding agents keep requirements, structure and traces next to the product. General: names no agent or project.

**Proposal.** No new command or component requirement.
* `scenarios.md`, new **US-12 — Agent operator:** Lets an LLM coding agent keep items and traces: the agent reads and diffs the YAML files in Git, creates items from the printed ID, reads JSON output and exit codes, and runs validation, suspects and impact before it commits.
* `requirements.md` CR-19 and `components.md` CL-05 cite US-12 as well (CL-05 already gives JSON output and exit codes).
* README: a section *Use by LLM agents*, about 120 words, built on existing commands.

**Alternatives and cost.**
* A (recommended) US-12 + README: about 40 words in `documents/`, 120 in README; under ¼ window, one part. A scenario keeps JSON output and exit codes from being cut as unneeded (`CLAUDE.md`, Scope: implement only what the scenarios need).
* B README only: no scenario change, so not a feature review; the 0.4 *done when* ("a US entry") changes.

## 2. #20 Projects define their own link types

**Need.** A project relates items in ways PLM does not build in, e.g. a requirement `mitigates` a project-defined `hazard`, and wants the hazards nothing mitigates. Today the rules are fixed (CO-02.6, `linkRules` in `src/schemas.ts`); the only fit is `derives-from`, and nothing reports gaps. Raised by one project, generalised: the names are configuration.

**Proposal.**
* New **CO-02.9:** `plm.yaml` may declare `links: {<name>: {from: [<type>…], to: [<type>…]}}` (`*` any type); declared link types are checked as the built-in ones (CO-02.6); a declaration that names a built-in link type is an error. CO-02.6 stays: built-in semantics remain fixed.
* **TE-06** changed: "…unverified requirements, suspect test evidence, unallocated requirements, **and items that no link of a given type reaches**."
* New **TE-06.5:** `plm report coverage --link <type>` lists the items of the link type's target types, in the repository or subtree, that no link of that type reaches (any state), and exits 1 if any.
* For the user: declare a link type in `plm.yaml`, use it with `plm link`, find its gaps with `plm report coverage --link`.

**Alternatives and cost.**
* A (recommended) CO-02.9 + TE-06.5, one `feature-dev` part: about 80 words in `documents/`, 250 in `src/` + `test/`; about ½ window. Reuses `report coverage` and its subtree scope instead of a new command.
* B CO-02.9 only; the gap list waits for trace queries (#63, 0.5). Smaller (about ¼ window) but the 0.4 *done when* loses "uncovered targets can be listed".
* C no-go: `derives-from` plus `plm search`; no rule checks, no gap list.

Word limits (`scripts/wordcount.py -v`, 2026-11-15): `documents/` 4791/4801, `src/`+`test/` 4977/4978. The four drafts add about 190 and 360 words: `reviewer` raises both limits for the features that go, with the reasons above.

## 3. #33 Allocation: retained requirements, subtree links only

**Need.** A requirement may stay at its item's level by design (e.g. a whole-product cost limit); the allocation report (TE-06.4) calls it `unallocated` and exits 1, with nowhere to record the reason. It also counts a `satisfies` link from a sibling requirement at the same level, and prints nothing until some lower item holds a requirement. Raised by one project, generalised.

**Proposal.** TE-06.4 changed: "…list each requirement of an item that has a lower item as allocated (a `satisfies` link, any state, from an item below its own item), retained (field `retained: <reason>` on the requirement, shown with the report) or unallocated, and exit 1 if any is unallocated…". For the user: write `retained: whole-product limit` on the requirement; the report shows `retained` and stays green.

**Alternatives and cost.**
* A (recommended) as above, reason as a requirement field: it is a design statement, so changing it changes the version and is reviewed like the text. About ⅓ window, one part; +40 words `documents/`, +60 `src/`+`test/`.
* B reason in `meta/<ID>.yaml` (administrative, no version change): same cost; the reason escapes review.

## 4. #9 Confirm a test run against a newer system-under-test version

**Need.** An edit that leaves the tested build unchanged (e.g. pinning versions already installed) outdates every run against it; the only fix is a rerun per test case. TE-02.2 refuses confirming run links ("re-confirming would falsify what was tested").

**Proposal.** TE-02.2 changed: `plm confirm <run> <sut> --reason <text>` re-confirms a run's `tests` link with the reason recorded in `confirmed`; `executes` links stay refused (a changed test case is a changed test). The run is current again (TE-03.1, TE-06.1) and the reason shows in coverage and in `plm show`.

**Alternatives and cost.**
* A (recommended) as above: about ⅓ window, one part; +30 words `documents/`, +50 `src/`+`test/`. The reason keeps the evidence honest: who judged the change irrelevant, and why.
* B no-go: runs stay immutable; rerun.

## Reviewer's findings

* #54: agree; drop the stated reason: CR-19 and CL-05 already cite US-5 and US-8, so JSON output and exit codes are not at risk. Cut US-12 to what is new (the agent reads and diffs the YAML in Git and runs the checks before it commits): about 25 words.
* #20: agree with A. CO-02.9 should cite CO-02.2 (rejects disallowed links), not CO-02.6; CL-01.1 (`link --help` lists the links) changes too; TE-06.5 follows TE-06.4's wording.
* #33: agree with A; cut "shown with the report". The `requirement` type gets the `retained` field (CO-02.8).
* #9: agree with A; drop "the reason shows in coverage and in `plm show`" (a new output requirement; TE-02.1's `confirmed` record holds it). TE-02.2's rationale citing CL-03.2 is reworded.

## Plan

For each go: its issue updated to the decided scope, naming this meeting, built in the order #54, #33, #9, #20; 0.4 keeps its seven entry conditions and budget.

## Minutes (2026-11-16, control room)

* Go: #54, #33, #9, #20, each A with the reviewer's cuts. US-12, CR-19 and CL-05 citing US-12, and TE-06 put into `documents/` with the word limits raised for them.
* The chief engineer governs the word limits; the owner is asked only for key design decisions.
* Actions: build in the order #54, #33, #9, #20 (the feature issues).
