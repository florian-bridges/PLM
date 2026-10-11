# PLM improvements

Limitations and improvement ideas found while using `plm` on product repositories. Each entry is a candidate for a change; it becomes work only through `documents/` (scenario, requirement) like any other change.

Add new entries at the end. Format:

```
## <short title>
*Found:* <date>, <product repository>, <agent or person>
*Observed:* what happened, with the command
*Impact:* what it costs or risks in practice
*Workaround:* what is done meanwhile, if anything
*Proposal:* a possible change (optional)
```

## Items in plain folders are silently ignored
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer
*Observed:* An item folder moved into a folder without `item.yaml` (e.g. `aircraft-system/reviews/srr-review/`) disappears from `plm search` and `plm show`, and `plm validate` reports nothing.
*Impact:* Items can be lost from traceability without notice; analyses, decisions and reviews cannot be grouped.
*Workaround:* Items sit directly in their parent item folder.
*Proposal:* Report `item.yaml` files that are not reachable as a finding, or allow grouping folders.

## `plm new` in a plain folder creates the item elsewhere
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer
*Observed:* `plm new review "SRR review"` run in `aircraft-system/reviews/` created `aircraft-system/srr-review/`.
*Impact:* Surprising location; easy to miss in scripts.
*Proposal:* Refuse, or print the created path.

## Links can only target requirements
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer
*Observed:* `satisfies` and `implements` accept only requirement targets; link types are fixed in the tool. A derived requirement cannot link to the analysis or decision its value comes from.
*Impact:* When an analysis changes, the requirements derived from it do not turn suspect; the dependency is only cited in the rationale.
*Workaround:* Analyses and decisions `implements` their input requirements; derived requirements cite `ANA-…`/`DEC-…` in `rationale`; `plm impact` shows the change.
*Proposal:* A link such as `derives-from` from any item to an analysis or decision, or link types configurable in `plm.yaml`.

## Non-normative edits make links suspect
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer
*Observed:* Changing only the `rationale` of a stakeholder need made every requirement satisfying it suspect.
*Impact:* Review noise; reconfirming without a real change trains people to confirm blindly.
*Proposal:* Let a schema mark fields as non-normative and exclude them from the version a link is confirmed against.

## `plm new` cannot set attributes
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer
*Observed:* `text`, `rationale` and other fields must be appended to the YAML after `plm new`; the file name is derived from the title and has to be found.
*Impact:* Scripts append YAML by hand and must quote correctly.
*Proposal:* `plm new requirement "<title>" --set text=… --set verification=…`, printing the path as well as the ID.

## No CLI for owner and status
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer
*Observed:* `owner` and `status` live in `meta/<ID>.yaml` and are edited by hand; the values are free text.
*Impact:* Typos split owners; no defined status flow.
*Proposal:* `plm set <id> owner|status <value>`, with allowed values configurable in `plm.yaml`.

## No report of unsatisfied parents
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer
*Observed:* `plm report coverage` covers verification only. Whether every need is satisfied by a requirement, or every requirement is allocated to a lower level, has to be checked by hand.
*Impact:* Gaps in the derivation are found only by reviewers.
*Proposal:* A report of requirements without incoming `satisfies` links, per subtree.

## Terse subcommand help
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer
*Observed:* `plm new --help` and `plm link --help` list no types, link types or examples.
*Impact:* Users and agents read the README or the source to learn the allowed values.
*Proposal:* List the configured types and link rules in the help.

## A `flight-test` requirement can never be covered
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by verification-engineer)
*Observed:* `schemas/requirement.schema.json` allows `verification: flight-test`, but `schemas/test-case.schema.json` has no `flight-test` method. A requirement verified by flight test can therefore never get a test case and stays `unverified` in `plm report coverage` by construction.
*Impact:* `plm report coverage` cannot distinguish "not yet verified" from "deliberately not verifiable in this project". The permanent verification gap has to be tracked in a separate document.
*Workaround:* The requirements that only a flight can verify are listed in `aircraft-system/verification-strategy.md` and excluded from the coverage target by hand.
*Proposal:* Align the two enums, and let `plm report coverage` report such requirements as `open-by-design` with their reason instead of `unverified`.

## `plm report coverage` is method-blind and has no denominator
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by verification-engineer)
*Observed:* The report prints only `unverified <ID>` lines. It does not group by `verification` method, gives no verified/total count, and offers no way to exclude or mark requirements that are open by design. It also counts stakeholder needs as requirements, although a need is verified indirectly through the requirements that satisfy it, so 13 such items inflate the denominator permanently.
*Impact:* The coverage figure a gate needs cannot be read off the tool. At SRR the real denominator is 29 of the 46 items listed (33 aircraft requirements minus 4 open by design, 13 needs excluded).
*Workaround:* The method distribution was obtained by grepping the requirement YAML, and the denominator is stated by hand in `aircraft-system/verification-strategy.md`.
*Proposal:* Report verified/total per method and per subtree; let an item be marked verified through its children; allow an open-by-design state with a reason.

## Only three verification methods; no inspection or demonstration
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by verification-engineer)
*Observed:* `verification` allows analysis, simulation, test-bench, flight-test and the test-case `method` only the first three. There is no `inspection` or `demonstration`.
*Impact:* Design-constraint requirements (a named sensor is installed, an interface is published) have to be shoehorned into `analysis`, which hides what the evidence actually is.
*Proposal:* Add `inspection` and `demonstration` to both enums, or make the method set configurable in `plm.yaml`.

## No `plm artifact` command; dropping a file changes another owner's item
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by verification-engineer)
*Observed:* Artifacts are discovered from the files in an item folder; there is no command to register or list them. Adding a file to an item folder therefore changes that item's version hash.
*Impact:* Any agent can silently change an item it does not own, and make links to it suspect, just by adding a file to its folder. Convenient for handing over a document, wrong for ownership.
*Workaround:* Agents are told not to write into folders of items they do not own; the chief engineer routes documents at merge.
*Proposal:* `plm artifact add|list <id> <path>`, and exclude files not registered as artifacts from the item version.

## `plm new` ignores the working directory for folder-type items
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by simulation-engineer)
*Observed:* `plm new analysis "<title>"` run in a plain grouping folder (`verification-environment/analyses/`) printed the new ID but created the item folder in the enclosing *item* folder instead of the working directory. File-type items such as requirements are created in the working directory as expected, so the behaviour differs by item type and nothing is printed about it.
*Impact:* The item is not where the author put it; scripts that write the fields afterwards do not find the file.
*Workaround:* Create folder-type items directly in the item folder and do not use grouping folders for them.
*Proposal:* Print the created path, and either honour the working directory or refuse with the reason.

## A moved item folder disappears without a validate error
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by simulation-engineer)
*Observed:* After moving an item folder into a plain grouping folder, `plm show ANA-T7TECF` returned "Unknown item" while `plm validate` reported nothing. A registered item with a live `meta/<ID>.yaml` was simply invisible.
*Impact:* An item can be lost silently; the meta file and the ID survive with no item behind them.
*Proposal:* `plm validate` should report an ID with a meta file but no discoverable item, and an `item.yaml` that is not reachable as an item.

## `plm new` writes `status` into `item.yaml` as well as meta
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by simulation-engineer)
*Observed:* `plm new` writes `status: draft` into both `item.yaml` and `meta/<ID>.yaml`. The convention keeps status in meta only, and the existing `aircraft-system/item.yaml` has no status field. `plm validate` accepts both.
*Impact:* Two places claim the status; they can disagree and nothing detects it.
*Workaround:* Remove the field from `item.yaml` after `plm new`.
*Proposal:* Write status only where it belongs, and have `validate` reject a duplicate.

## `plm link` reflows the whole item YAML
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by simulation-engineer)
*Observed:* `plm link` rewrites and re-wraps the entire file, not just the links block. Scripted edits that matched exact strings before the link call no longer match after it, and re-wrapped long text can fold a hyphenated word across the break.
*Impact:* Any tooling or agent that edits item files textually breaks mid-run; text can be corrupted by re-wrapping.
*Workaround:* Write all fields before calling `plm link`, and re-read the file afterwards.
*Proposal:* Touch only the links block, and add `plm set <id> <field>=<value>` so no one has to edit these files textually.

## An incomplete item passes `plm validate`
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by sizing-engineer)
*Observed:* `plm new <type> "<title>"` writes an `item.yaml` with only `id`, `type` and `title` — no stub for the type-specific fields the schema names (`method`, `run`, `result` for an analysis) — and a `meta/<ID>.yaml` with no `owner`. `plm validate` reports nothing, so an item missing every substantive field and its owner looks green.
*Impact:* Incompleteness is invisible to the tool and has to be caught in review. Two agents in this project were terminated mid-write and left items in exactly this state; nothing flagged them.
*Workaround:* Write `item.yaml` and `meta/<ID>.yaml` by hand from the schema, and check by eye.
*Proposal:* Have `plm new` write the type's fields as empty stubs, and `plm validate` report an item with a missing required field or no owner.

## `analysis.method` has no value for a qualitative assessment
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by safety-engineer)
*Observed:* `method` allows only `calculation|simulation|measurement`. A functional hazard assessment or a SORA is an assessment against a published method, not a calculation.
*Impact:* The field misdescribes the work; a reader cannot tell a computed result from a regulatory assessment.
*Workaround:* `method: calculation`, with the counting and table lookups put into the script so the label is not a lie.
*Proposal:* Add `assessment`, or make the method set configurable in `plm.yaml`.

## No item type for a hazard or a requirement proposal
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by safety-engineer)
*Observed:* Nine requirement proposals handed from safety-engineer to systems-engineer live in a plain markdown file that `plm` does not track. The same for the 32 hazards, which sit in a `hazards.yaml` inside an analysis.
*Impact:* The handover between two owners has no traceable link, and no report can show which proposals are still open. A hazard cannot be linked to the requirement that mitigates it.
*Workaround:* The FHA script reads the requirement files from disk and reports each proposal as open or closed, which makes the handover checkable but not linkable.
*Proposal:* A `hazard` item type, and a link type from a hazard to the requirement that mitigates it.

## No way to mark a value as provisional
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by safety-engineer)
*Observed:* A requirement carrying a deliberately provisional value (a safe climb height of 35 m, to be confirmed by phase 2 sizing) is indistinguishable from one whose value is settled. The only alternatives are a hard number or `TBD`.
*Impact:* Provisional values harden silently. Work built on them cannot be found when the value moves.
*Proposal:* A `provisional: true` flag with the item that will close it, and a report listing provisional values per subtree.

## `plm validate` and `plm suspects` disagree on exit codes
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by safety-engineer)
*Observed:* `plm validate` exits 0 on success while `plm suspects` exits 1 when it has unconfirmed links to report, so `plm validate && plm suspects` cannot be used as a gate check.
*Impact:* Gate scripts need per-command special casing.
*Proposal:* Document the exit codes, and give `suspects` a flag that separates "there is something to report" from "the check failed".

## `plm show` lists untracked and ignored files as artifacts
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by simulation-engineer)
*Observed:* Every file in an item folder is listed as an artifact, including untracked and `.gitignore`d ones. Deliberately uncommitted generated test images appeared as eight committed-looking artifacts of `ANA-CMV6C5`.
*Impact:* The artifact list is machine-dependent — a fresh clone shows a different one — so it cannot be used as the record of what an item contains, and a reviewer cannot tell generated output from a committed artifact.
*Workaround:* Delete generated output from the item folder before `plm show` or commit, and keep a local `.gitignore`.
*Proposal:* List only files tracked by git, or mark untracked and ignored files as such.
