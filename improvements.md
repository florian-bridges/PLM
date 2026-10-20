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
*Impact:* Review noise; reconfirming without a real change trains people to confirm blindly. 2026-10-19: blocks the Structure-gate clean-up — shortening 14 rationales/results (no value change) made 21 links suspect (8 → 29); the remaining ~140 overlong fields would add about 100 more. Branch `wp/cleanup-1` step 2 held unmerged.
*Proposal:* Let a schema mark fields as non-normative and exclude them from the version a link is confirmed against.

*Decision:* 2026-10-19, product owner: accepted, trimmed. No change to how versions are computed, so no migration and no re-confirming. Link targets are requirement files, and a requirement's confirmed version is a Git blob. A link whose version differs stays current when the confirmed blob, read from Git, differs from the target only in fields listed under `informative:` in `plm.yaml` (default `[rationale]`). This applies to `suspects`, `impact` and CI alike. If the blob is missing (e.g. a confirmation made before a commit, in a fresh clone), the link stays suspect. Not schema-based: one list in the config is enough. `result` and other fields stay normative. Nothing targets analyses, so editing ANA-JP8J3Y caused none of the 21 suspects; all 21 come from the 13 rationale edits. Streams: (1) requirements author amends TE-03.1 and the `plm.yaml` settings text, net ≤ +60 words in `documents/`. (2) One implementer: `src/links.ts`, `src/repo.ts` (settings type), `test/plm.test.ts`, keeping `src/` + `test/` ≤ 4100, so it must delete as many words as it adds (3 free). `extension/` +0. Done when `plm suspects` on AFW `wp/cleanup-1` (3b9a872) reports 6 without any confirm.

*Review:* 2026-10-19, quality, commits 83bd13c (TE-03.1/CL-02.4 text) and a6efc3b (`wp/afw-stream2-nonnormative`). Typecheck and tests pass except the pre-existing CO-01.1 timeout (also fails unchanged on parent 52a71f8; already tracked as "`npm test` times out on slow machines", not a flake — the implementer's "flaky" is imprecise but the pre-existing claim holds). `src/`+`test/` 4100/4100: at the cap, no margin for the next change. On AFW `wp/cleanup-1` (3b9a872) `plm suspects` gives 6, not the written 8: verified both cited pairs, ANA-DQJ17K→REQ-4B021F and ANA-0MKGQF→REQ-AFVYXW, by diffing the confirmed Git blob against the current file — only `rationale` differs in each, so clearing them is correct; these 2 were already-stale entries inside the original "8" baseline, not new. **Minor:** this entry's "Done when ... reports 8" is now wrong by the above; reword to 6 or drop the number. No major found; traceability, generality and behaviour otherwise match the decision.
*Done:* 2026-10-19, product owner. Merged to `integration/afw` (edd03f7); minor fixed (8 → 6 above). `plm suspects` on AFW `wp/cleanup-1` gives 6 without confirm. Projects: list non-normative fields under `informative:` in `plm.yaml` if more than `rationale`; no migration.

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
*Decision:* 2026-10-19 done (TE-06.3, CL-01.1): `plm report coverage [item] --by <field>` prints verified, pending, unverified and total per field value; items without the field form one group with an empty value. No open-by-design state, no verification through children.

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

*Decision:* 2026-10-20, product owner: accepted, trimmed. Key fields are project configuration, not a tool list: a project lists them under `required` (with `minLength: 1` where empty text is incomplete) in `schemas/<type>.schema.json`, which `validate` already enforces (CO-02.1). No flag, no stubs from `plm new` (empty stubs would pass the check). Tool change only: a missing required attribute of an item whose status is `draft` is a warning, otherwise an error. Owner check not included. Streams: (1) requirements author amends CO-02.2 or CO-02.4, net ≤ +40 words in `documents/`. (2) One implementer: `src/validate.ts`, `test/plm.test.ts`, net ≤ +0 words in `src/`+`test/` (4099/4100), `extension/` +0. Project: add `required` to its schemas.

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

*Decision:* 2026-10-19, product owner. Trimmed. Rejected: `plm report review-pack` and `show --all`. A pack's layout (themes, gate, which sections) is project presentation, it would cost hundreds of words with 8 free, and `search` covers bulk reads. Accepted: `plm --format json search <query>` gives per match the item fields (with `links`), `path` and `meta`, the record of `plm show` without version, link states and artifacts. One call then replaces the file scan and the ~170 `show` calls. With `search TBD`, `search type:review`, `suspects` and `report coverage --by verification`, the project can delete `review_pack.py` and list these commands in its gate review instead.
*Stream:* `src/cli.ts` (share one record helper between `show` and `search`), `test/plm.test.ts`; net at most +8 words in `src/`+`test/` (limit 4100, at 4092): pay by trimming tests or code; delete `scripts/review_pack.py`. Documents (requirements author): amend CL-05.3 or CO-03.2, at most +40 net words. Extension unchanged.

*Review:* 2026-10-19, quality, commit de325d2. Word budget 4099/4100: correct. `search` JSON on an autonomous-fixed-wing copy gives `path`, `meta` and flat `links` (type+target, no state) per match, matching CL-05.3's wording; `search`/`validate`/`suspects` text output and `show` text output unchanged. **Major:** `src/cli.ts`, the shared `record()` helper also adds an untraced `path` field to `show`'s JSON (confirmed by diff against the parent commit); no requirement states this for `show` (CL-05.3 only mandates it for `search`; CO-01.3 covers only artifact paths), no test covers it, and `schema` stays 3 though the output changed, unlike the 2→3 bump for the last output change (8dd64bb). **Minor:** `test/plm.test.ts`'s new `CL-05.3` assertion runs before `addLink`, so it never checks `links` content; a regression dropping `links` from `search` would pass. Not blocking, not closed: raise with the implementer.
*Review round 2:* 2026-10-19, quality, commit 2392b92. Both closed. Major: CL-05.3 now states `show`'s JSON adds `path` (7e98111); `schema` bumped 3→4, matching the 2→3 precedent; `test/plm.test.ts:70` asserts `path` on `show`. Minor: the `search` links assertion (line 235) now runs after `addLink`. `tsc --noEmit` clean; `npm test` 14/14 green (pre-existing unrelated timeout flake at the 5 s default, green at 30 s, same as before this stream). Word budget 4097/4100. Behaviour on an autonomous-fixed-wing copy (`validate`, `show`, `search`) unchanged except the intended `path`/schema addition. New minor, not blocking: the stream's "delete `scripts/review_pack.py`" was never done (still present on `integration/afw`); for the product owner.

*Decision:* 2026-10-19, chief engineer. Traced, not removed: CL-05.3 now states `show`'s JSON adds `path`, matching the original proposal. Implementer: bump `schema` to 4 (output changed, as for the 2→3 precedent) and add the minor's `links`-content assertion.
*Done:* 2026-10-19, product owner. Accepted on `integration/afw`; `scripts/review_pack.py` deleted. Projects: replace their pack generator with `plm --format json search`, `suspects` and `report coverage --by verification`. JSON `schema` is now 4.

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

## The `run` field has no defined working directory
*Found:* 2026-10-19, autonomous-fixed-wing, systems-engineer
*Observed:* Some analyses write `run` relative to the item folder (`python3 fha.py`), others relative to the repo root (`python3 aircraft-system/evasion-clearance-budget/clearance_budget.py`). After `git mv` into a kind folder the root-relative ones point to nothing, and `plm validate` reports nothing.
*Impact:* The trial structure migration needed a `sed` pass over `run` fields and script docstrings (3 analyses, 4 scripts); a missed one surfaces only when someone reruns it.
*Workaround:* Rewrite moved paths with `sed` in the migration script.
*Proposal:* Define `run` as executed in the item folder, and have `plm validate` warn when the file it names does not exist there.

## Item folders per type are hard-coded
*Found:* 2026-10-19, autonomous-fixed-wing, chief engineer
*Observed:* Only `requirements/`, `tests/` and `runs/` are home folders, built into the code. A structure with one folder per type in each parent item (e.g. analyses in `analyses/`) cannot be configured: `plm new analysis "Motor sizing"` in an item folder creates `motor-sizing/` beside the item's other children.
*Impact:* Blocks replaying the approved structure migration at the gate; in the next phase every agent places folders by hand, and nothing reports a misplaced one.
*Workaround:* None; the migration waits.
*Proposal:* Per-type folder in `plm.yaml`, next to `prefixes:`.
*Decision:* 2026-10-19, product owner. Accepted, trimmed. `plm.yaml` `folders: {<type>: <folder>}` overrides and extends the built-in home folders (`requirement: requirements`, `test-case: tests`, `test-run: runs`); no new command, `plm init` unchanged. The one table drives all home-folder behaviour as today: `plm new` places the item in the type's folder inside the parent item (created if missing), `plm validate` reports items outside their type's folder (CO-02.2), artifacts skip home folders. Projects whose items are not yet in the configured folders get validate errors until they migrate; that is intended.
*Stream:* branch `wp/afw-type-folders`; `src/repo.ts`, `src/validate.ts`, `src/links.ts`, `test/plm.test.ts`; net 0 words in `src/`+`test/` (4100/4100: pay by deleting). Documents (requirements author): CO-01.1, CL-02.1, CO-02.2; at most +60 net words. Extension unchanged.

*Review:* 2026-10-19, quality, commits bff9dc7, e9d0848, ddf19fe. Typecheck and tests pass (14/14; the pre-existing CO-01.1 timeout needed a bump, unrelated and reproducible unchanged on parent e6fd879 — bundled into ddf19fe without mention in the commit message). Documents 4819/5000, `src/`+`test/` 4100/4100 (no margin left), extension unchanged: within budget. Tested on a scratch copy of `autonomous-fixed-wing` with `folders: {assembly: subsystems, part: parts, software: software, analysis: analyses, decision: decisions, interface: interfaces, review: reviews}` per DEC-74N41V. **Major:** a type's home folder only works for items that always have a parent (requirement, test-case); for assembly/part/software/etc., which can be top-level, `newItem` (`src/repo.ts:112`, CL-02.1) builds the path from `` `${parent?.path}/${home}` `` even when `parent` is `undefined`, so `plm new assembly "X"` at the repository root silently creates `undefined/subsystems/x/item.yaml`; `validate`'s `misplaced` check (`src/validate.ts:52-55`, CO-02.2) doesn't catch this corrupt path (it contains "subsystems") but permanently flags the real top-level assemblies `aircraft-system` and `verification-environment` as misplaced — they can never be inside their own home folder. CL-02.1/CO-02.2 don't define the no-parent case; untested (the one new test only covers a nested type). Blocks accepting the decision as done. **Minor:** the `misplaced` message was shortened to the literal string `'Misplaced'` (`src/validate.ts:55`), duplicating the `code` field and dropping the folder name a user needs to fix it. No generality or traceability issues otherwise.

*Review:* 2026-10-19, quality, commit 4efbf2c (second round, major and minor only). Typecheck and tests pass (14/14). Re-tested on a scratch copy of `autonomous-fixed-wing` with the same `folders:` table: `plm new assembly "X"` at the repository root now creates `x/item.yaml` directly, no `undefined/` path; `plm validate` no longer flags the top-level `aircraft-system`/`verification-environment` assemblies, while a genuinely misplaced item (items not yet migrated) is still reported, message now `outside <home>` naming the folder. Both findings closed.

*Acceptance:* 2026-10-19, product owner, commit 3c7a90d. Not accepted, not merged. **Major:** `validate` (`src/validate.ts:54`, CO-02.2) no longer reports a test run outside the top-level `runs/` folder: the new `innermostItem` guard skips every item without a parent, runs included (reproduced: a run moved to `r1/` passes at 3c7a90d, fails at e6fd879); untested. Fix: keep the guard off for `test-run`, add a test. **Budget:** documents +73 net words against +60 allotted; trim 13. `src/`+`test/` stays 4100/4100: pay the fix by deleting.

*Review:* 2026-10-19, quality, commit f9a099a. Major closed: re-ran the repro (scratch copy of `autonomous-fixed-wing`, a run moved to `r1/`) — now reported `misplaced: outside runs`; new test covers it. Round-1/2 fixes still hold: top-level `plm new assembly` creates no `undefined/` path, `aircraft-system`/`verification-environment` stay unflagged. Shortened messages in `repo.ts`/`links.ts` change no condition or code, only wording; no requirement states literal text. Typecheck and tests pass (14/14). `scripts/wordcount.py`: documents 4820/5000, `src/`+`test/` 4099/4100 — both within cap; the stream's own +60/-13 allotment matches exactly (2926→2913 words in `low-level-requirements.md`). No new findings.
