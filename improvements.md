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
*Decision:* product owner: accepted (scope, branch), rejected (reason) or asked
```

## Items in plain folders are silently ignored
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer
*Observed:* An item folder moved into a folder without `item.yaml` (e.g. `aircraft-system/reviews/srr-review/`) disappears from `plm search` and `plm show`, and `plm validate` reports nothing.
*Impact:* Items can be lost from traceability without notice; analyses, decisions and reviews cannot be grouped.
*Workaround:* Items sit directly in their parent item folder.
*Proposal:* Report `item.yaml` files that are not reachable as a finding, or allow grouping folders.

*Decision:* 2026-10-19 done, see "Grouping folders and migration".

## `plm new` in a plain folder creates the item elsewhere
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer
*Observed:* `plm new review "SRR review"` run in `aircraft-system/reviews/` created `aircraft-system/srr-review/`.
*Impact:* Surprising location; easy to miss in scripts.
*Proposal:* Refuse, or print the created path.

*Decision:* 2026-10-19 done, see "Grouping folders and migration".

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
*Decision:* 2026-10-19, product owner: rejected as a tool change, merged into the next entry. The enums are project configuration (`schemas/`); a project that plans no flight tests states that once as a policy, and the per-method counts of the next entry show those requirements as their own group, not as hidden gaps. No `open-by-design` state: a second kind of "unverified" adds words without new information.

## `plm report coverage` is method-blind and has no denominator
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by verification-engineer)
*Observed:* The report prints only `unverified <ID>` lines. It does not group by `verification` method, gives no verified/total count, and offers no way to exclude or mark requirements that are open by design. It also counts stakeholder needs as requirements, although a need is verified indirectly through the requirements that satisfy it, so 13 such items inflate the denominator permanently.
*Impact:* The coverage figure a gate needs cannot be read off the tool. At SRR the real denominator is 29 of the 46 items listed (33 aircraft requirements minus 4 open by design, 13 needs excluded).
*Workaround:* The method distribution was obtained by grepping the requirement YAML, and the denominator is stated by hand in `aircraft-system/verification-strategy.md`.
*Proposal:* Report verified/total per method and per subtree; let an item be marked verified through its children; allow an open-by-design state with a reason.
*Decision:* 2026-10-19, product owner: accepted, trimmed (branch `integration/afw`). `plm report coverage [item] --by <field>` adds one count line per value of any item field (items without it in one group): verified, pending, unverified, total; JSON gives the same groups. Default output and exit code unchanged. No open-by-design state, no verification through children, no config. Needs without the field fall into their own group, so the denominator is read off.
*Review:* 2026-10-19, quality, commit 2d01c92. Verdict: fail, 1 major. Major: `--by` calls `openRepo()` once per row instead of reusing the repo `scoped()` already loaded, reloading the whole repository per requirement; on a copy of autonomous-fixed-wing (82 items) `--by verification` took 13.3 s against 0.8 s for the default report. Minor: net word count is +54, not the implementer's claimed +53 (14 over the +40 stream budget, still at the 4100 hard cap); commit message "+1 word in src/+test/" does not match either figure. Behaviour otherwise correct: default report, `validate`, `search`, `show`, `suspects` byte-identical to `integration/afw`; JSON matches text; TE-06.3/CL-01.1 traced and worded consistent with the rest of the document; pre-existing timeout flake only, `npm test` green at 30 s timeout.
*Review round 2:* 2026-10-19, quality, commit 68d5a59. Major closed: `--by` now reuses `scoped()`'s repo (`entry(state[0], ...)`); 0.78 s vs default report's 0.77 s on the same copy; text and JSON output byte-identical to before the fix. `npm test` green except the pre-existing unrelated timeout flake (times out identically on 82aaee3, before this stream). Minor (new, for product owner, not blocking): net words +52 (confirmed by `scripts/wordcount.py`, 4046→4098), 12 over the +40 stream target, still inside the 4100 hard cap.
*Stream:* one, `src/cli.ts`, `src/links.ts`, `test/plm.test.ts`; at most +40 net words in `src/`+`test/` (54 free; pay by shortening). Documents (requirements author): amend TE-06.2 or add one TE-06.x, add `--by` to CL-01.1; at most +45 net words. Extension unchanged.
*Done when:* on a copy of autonomous-fixed-wing, `plm report coverage ASM-92GJKY --by verification` prints a line per method and one for items without it, totals matching the requirements in scope; `npm test` green; word limits held.

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

*Decision:* 2026-10-19 done, see "Grouping folders and migration".

## A moved item folder disappears without a validate error
*Found:* 2026-10-10, autonomous-fixed-wing, chief engineer (reported by simulation-engineer)
*Observed:* After moving an item folder into a plain grouping folder, `plm show ANA-T7TECF` returned "Unknown item" while `plm validate` reported nothing. A registered item with a live `meta/<ID>.yaml` was simply invisible.
*Impact:* An item can be lost silently; the meta file and the ID survive with no item behind them.
*Proposal:* `plm validate` should report an ID with a meta file but no discoverable item, and an `item.yaml` that is not reachable as an item.

*Decision:* 2026-10-19 done, see "Grouping folders and migration".

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

## No gate review pack report
*Found:* 2026-10-13, autonomous-fixed-wing, systems-engineer
*Observed:* A gate (SRR) needs one document with requirements by folder theme (text, verification, status, parent, cited items), open `TBD`s, decisions and analyses with status and documents, review verdicts with open findings, suspects and coverage per verification method. `plm` has no such report; `plm show` gives no item path and status is only in `meta`, so it takes one `plm show` call per item (about 170 calls, 30 s).
*Impact:* Every product repository writes its own generator; hand-made packs drift from the data.
*Workaround:* Python generator over `plm --format json search/show/suspects/report coverage` and a file scan for paths: `aircraft-system/srr-review-pack/review_pack.py` in autonomous-fixed-wing, copied here as `scripts/review_pack.py`.
*Proposal:* `plm report review-pack [item] [--gate <name>] [--reviews <REV-…>]` writing Markdown with links to the item files; include `path` in `plm show`/`search` JSON and a bulk `plm show --all`.

## Migrating a repository to a new folder structure
*Found:* 2026-10-19, autonomous-fixed-wing, chief engineer
*Observed:* A gate restructures the product tree: requirements and items move from the system item into subsystem items. No documented way says whether moving folders keeps IDs, links and confirmations, and a mistake is not reported (see "A moved item folder disappears without a validate error").
*Impact:* Restructuring is risky hand work; teams avoid it and keep large flat items.
*Proposal:* A `plm move` command.
*Decision:* 2026-10-19 done with "Grouping folders and migration", without `plm move`.

## Grouping folders and migration
*Decision:* 2026-10-19, product owner. Accepted, one stream; done on `integration/afw`, accepted 2026-10-19 after removing an unrequested change (test cases had become nested items of their item). Covers the five entries above.
1. A folder without `item.yaml` is transparent everywhere (hidden folders skipped): items in it belong to the nearest enclosing item, or are top-level. Grouping folders inside `requirements/` and `tests/` work alike; placement errors (CO-02.2) still apply.
2. `plm new` creates every type in the working folder when that is inside the parent item and, for types with a home folder, inside that home folder; otherwise in the home folder or item folder as today. Output stays the ID (scripts parse it).
3. No `plm move`: IDs, links and confirmations are keyed by ID, versions by content (TE-01.1), so `git mv` keeps them; only items whose content changes (old and new parent) turn suspect, as they should. State this once in the documents.
4. `plm validate` reports an error for a `meta/<ID>.yaml` without an item. Unreachable `item.yaml` no longer exists after 1.
*Review:* 2026-10-19, plm-reviewer, commit cf69c9b. Verdict: pass, no major. Traceability, budget (4637/5000 docs, 4047/4100 src+test) and `npm test`/`tsc` all clean. Behaviour on a copy of autonomous-fixed-wing unchanged except the intended orphan error. Minor: `improvements.md` missing blank lines before four headings after the new `*Decision:*` lines (cosmetic).
*Stream:* `src/repo.ts`, `src/validate.ts`, `test/plm.test.ts`; at most +100 net words in `src/`+`test/` (153 free). Documents (requirements author): CO-01.1, CL-02.1, CO-02.2 or a new CO-02.x, TE-01.1 rationale; at most +80 net words. Extension unchanged.

## `npm test` times out on slow machines
*Found:* 2026-10-19, autonomous-fixed-wing, plm-product-owner
*Observed:* On the Jetson Orin NX, the test "recorded runs verify requirements until the SUT changes" takes about 7.3 s and fails on Vitest's 5 s default, also on `main`; with `--testTimeout=30000` all tests pass.
*Impact:* `npm test` is red at every acceptance on this machine; a real failure can hide behind the known one.
*Proposal:* Set `testTimeout` in the Vitest config, or make the test spawn fewer CLI processes.
