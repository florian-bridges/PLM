# Low-Level Requirements

Each requirement `XX-nn.m` refines component requirement `XX-nn` in [components.md](components.md).

## Core library

**CO-01.1** The core shall read `plm.yaml` (repository settings, including `folders: {<type>: <folder>}` overriding or extending each built-in home folder: `requirements` for `requirement`, `tests` for `test-case`, `runs` for `test-run`), item folders `<name>/item.yaml` with requirements and test cases in their home folder as `<home>/<name>.yaml` and `<home>/<name>/item.yaml`, both also in subfolders, test runs in the top-level home folder, other types' home folder inside their parent item only, a top-level item having none, and `meta/<ID>.yaml` with the `yaml` package, keeping comments, formatting and line width when writing back. A folder with no `item.yaml` shall be transparent, hidden folders excepted: items under it belong to the nearest enclosing item, or are top-level if none.
*Rationale:* Comment-preserving writes keep hand edits and diffs small. Nesting test cases in the tested item's folder makes changing one outdate its runs; runs stay outside so recording one doesn't change the tested item's version. A per-type home folder avoids hard-coding type names in the core.

**CO-01.2** `item.yaml` shall hold content: `id`, `type`, `title`, type-specific attributes, `text` (Markdown), `uses` and `links` with `type`, `target` and, for `executes`, `result`. `meta/<ID>.yaml` shall hold `owner`, `status` and `confirmed`.
*Rationale:* Links show where the item is edited, and adding one changes its version. Separating administrative data keeps versions stable when links are confirmed or ownership or status change (TE-01.1).

**CO-01.3** The core shall list as an item's artifacts the paths of files in its folder not ignored by Git, except `item.yaml`, home folders (CO-01.1) and nested item folders, marking unfetched Git LFS pointers; `plm show` shall print them.
*Rationale:* Artifacts can be gigabytes; listing paths keeps loading fast and works without fetched LFS files, and the mark tells users to fetch them.

**CO-02.1** The core shall validate `item.yaml` with Ajv against its type's JSON Schema (2020-12), and `meta/<ID>.yaml` against `schemas/meta.schema.json` if present; built-in schemas may be extended by `schemas/<type>.schema.json` in the repository.
*Rationale:* JSON Schema is understood by editors, Ajv and form generators; repository extensions let programs add attributes.

**CO-02.2** The core shall report as errors: YAML syntax errors in item, requirement and meta files, items outside their type's home folder (CO-01.1), other items inside them, a `meta/<ID>.yaml` with no item, duplicate IDs, unknown used items or link targets, link types not allowed between the source and target types, and composition cycles.
*Rationale:* These errors break versions, links or composition and would otherwise surface late.

**CO-02.4** Each finding shall carry file, line, column, severity and a stable code, with severity `warning` for a missing required attribute (schema `required`) of a `draft` item, otherwise `error`.
*Rationale:* Positions let editors and CI point to the problem; stable codes allow filtering and suppression; a draft is expected to be incomplete.

**CO-02.5** Built-in types shall be `requirement`, `part`, `assembly`, `test-case` and `test-run`.
*Rationale:* Others come by schema.

**CO-02.6** Links shall be allowed as `satisfies` and `implements` from any type to `requirement`, `verifies` from `test-case` to `requirement`, `executes` from `test-run` to `test-case`, `tests` from `test-run` to any type, and `derives-from` from any type to any type.
*Rationale:* Fixed semantics keep reports comparable.

**CO-02.7** Any item's `item.yaml` may hold a `parameters` list field, entries `{name, value, unit, state}`, `state` from `plm.yaml`'s `parameter_states` (default `[provisional, final]`; missing or `null` value: TBD, not a state). The core shall report as error a non-number `value`, an unlisted `state`, or `stale-value` (vs its `derives-from` target), and as warning `tbd-source` (target TBD).
*Rationale:* Replaces copies; flags stale or TBD drift.

**CO-03.1** The core shall build a full-text index (MiniSearch) over ID, title, text and attributes.
*Rationale:* One index format serves the CLI and VS Code without a search server.

**CO-03.2** Queries shall combine free text, matching all words by prefix, with filters `<field>:<value>`, matching items whose field, `status` or `owner` contains `<value>` not adjoining a letter, digit, `-` or `_`.
*Rationale:* Filters answer typical questions, such as an owner's unreleased parts or requirements with a TBD, faster than text alone. Prefix matching finds items while typing.

**CO-03.3** The core shall list the objects of a named list field, scoped to an item's subtree if given, whose keys equal all filters (empty: missing, `null` or empty), each as `<source ID> (<title>)` followed by its keys, with `source` added in JSON.
*Rationale:* One mechanism covers findings and any future list field without new code.

## Traceability engine

**TE-01.1** An item's version shall be the SHA-256 hex digest of its folder's Git tree hash followed by the versions of the items it uses, in listed order; a requirement's version shall be its Git blob hash, and a link to a parameter (`<ID>:<name>`) the hash of that entry.
*Rationale:* Git hashes capture all files, including nested items and LFS pointers; adding used items' versions propagates their changes. Content, not path, decides a version, so `git mv` keeps an item's ID, links and confirmations.

**TE-01.2** Hashes of the working tree shall be computed by staging an item's artifacts (CO-01.3) and its `item.yaml` or requirement file into a temporary Git index, so LFS filters apply and uncommitted and committed states yield identical versions.
*Rationale:* Engineers need suspect states before committing; identical results avoid spurious differences between local runs and CI.

**TE-02.1** Confirming a link shall write to `confirmed.<target>` in the source's `meta/<ID>.yaml` the target's current `version` and `title`, the confirming Git `user.name` as `by`, the date as `on`, and as `commit` the short hash of HEAD if the target has the confirmed version there; a link without `version` there is unconfirmed.
*Rationale:* Keeping the version in its own file makes confirmations reviewable as diffs; title, confirmer, date and commit show what was reviewed. Uncommitted targets have no commit to name.

**TE-02.2** Confirmation shall be refused while the target fails validation or Git `user.name` is unset, and for links of test runs.
*Rationale:* Confirming against a broken item would record a meaningless state, and an anonymous confirmation is no review. Run links are confirmed when recording (CL-03.2).

**TE-03.1** A link shall be suspect when its confirmed version differs from the target's current version, and unconfirmed when it has none; it stays current when its TE-03.2 change touches only `item.yaml` or requirement files present and equal, after removing the fields under `informative:` in `plm.yaml` (default `[rationale]`), at the confirmed commit and now; no confirmed commit keeps it suspect. Links from test runs are evidence, not links to review: suspect lists shall omit them, and a run with a suspect link is outdated. A link naming a parameter (`<ID>:<name>`, TE-01.1) is suspect only when that parameter's version differs.
*Rationale:* Separating unconfirmed from suspect distinguishes new links from links invalidated by change. Re-confirming a run's links would falsify what was tested.

**TE-03.2** To show what changed, the engine shall return the diff of the target's subtree since the link's `commit` or, if it is missing or unknown, since the latest commit at which the target had the confirmed version.
*Rationale:* The user must judge whether the change matters; the diff shows exactly what happened since confirmation. The stored commit avoids searching history, which is needed only for uncommitted confirmations or squashed branches.

**TE-05.1** Given a base commit and a head commit or the working tree, the engine shall list items whose own files changed, items changed through them, links other than from test runs that became suspect, and runs that became outdated.
*Rationale:* These are the questions a change board asks before approval.

**TE-05.2** A link shall have become suspect when its confirmed version equals the target's version at base but not at head.
*Rationale:* Links already suspect at base are not caused by the change.

**TE-06.1** A requirement shall count as verified when a test case `verifies` it through a current link and that test case's latest run, by date, with current `executes` and `tests` links records `pass` for it; coverage shall list each verifying test case with its latest run, that run's result for it and whether it is outdated.
*Rationale:* Evidence counts only for the versions tested and the latest result; reusing the suspect mechanism avoids a second staleness check.

**TE-06.2** Coverage shall be reported for the repository or an item subtree as verified, verification pending (verifying test case without current passing run) and unverified (no verifying test case).
*Rationale:* Pending verification differs from a missing test and needs a different action.

**TE-06.3** Given a field name, coverage shall be grouped by its value into verified, pending, unverified and total, requirements lacking the field in their own group; JSON shall use the same groups.
*Rationale:* Grouping by method gives the per-method denominator a gate needs.

**TE-06.4** With `--allocation`, coverage shall list each requirement of an item that has a lower item with requirements, as allocated (has a `satisfies` link, any state) or unallocated, and exit 1 if any is unallocated; it shall reject `--by`.
*Rationale:* An unallocated requirement is an undetected derivation gap.

## CLI

**CL-01.1** The CLI shall be a Node.js 22 program `plm` built with Commander, with `--version` (`plm`'s `package.json` version) and commands `validate`, `search`, `show`, `link <source> <type> <target>` (`<target>` an ID or `<ID>:<name>`; a type CO-02.2 disallows prints `<source type> <type> <target type>` as a usage error, writing nothing; `--remove` deletes that link and its target's `confirmed` entry, if any; an unknown link is a usage error), `confirm`, `set`, `get`, `list <field> [<item>] [<key>:<value>...]`, `suspects [<item>]`, `impact <base>[..<head>]` and `report coverage [<item>] [--by <field>] [--allocation]`, finding the repository by searching upward for `plm.yaml`.
*Rationale:* Searching upward works from any subfolder; `--version` lets CI check pins; a typo fails where made.

**CL-01.2** `confirm <source> [<target>]` shall confirm the source item's link to the target, or all its links.
*Rationale:* Links are reviewed one by one, or all at once after reviewing an item.

**CL-01.3** `set <id|ref> <field> <value>` shall write `<value>` as a string to `owner` or `status` in `meta/<ID>.yaml`, or to any other field in `item.yaml`, keeping comments and formatting (CO-01.1), refusing a field whose value is not a string; on a parameter reference (`<ID>:<name>`), `value` as a number (TBD if empty) or `state` (entry created if new).
*Rationale:* The ID spares finding the file; other lists and `links` stay with `plm link` and hand edits.

**CL-01.4** `get <ref> [<key>]` shall print a parameter's `value` or key, nothing else; exit 1 if TBD, usage error if unknown.
*Rationale:* Scripts read a value, not a copy.

**CL-02.1** `plm new <type> <title>` shall create the item and meta files from the type's template, built-in or in `templates/<type>.yaml`, in the working folder if that is inside the item folder and, for a type with a home folder (CO-01.1), inside that home folder, creating it if missing; otherwise in the home folder or the item folder containing the working folder. It shall print the new ID, and its path on stderr, name the file or folder by the title, lowercase, with runs of characters other than ASCII letters and digits replaced by `-` and trimmed of `-`, or by the ID if that is empty, and refuse names in use.
*Rationale:* Repository templates let programs prefill attributes and conventions. Names show the structure in file browsers and on the Git host; they lack the ID, so equal titles would overwrite files.

**CL-02.2** New IDs shall be a type prefix from `plm.yaml` plus six random Crockford Base32 characters.
*Rationale:* Sequential numbers collide when branches create items in parallel; Crockford Base32 avoids ambiguous characters.

**CL-03.1** `plm test record <test-case>... --sut <ID>... --result <result>... [--log <file>...]` shall create a test run in `runs/<ID>/` with date, copies of the log files, a `tests` link to each `--sut` ID and per test case an `executes` link with its result, in order: `pass`, `fail` or `inconclusive`.
*Rationale:* Rigs report without human interaction; logs are the evidence auditors ask for. One run per rig session keeps its logs together; results per test case keep one failure from discrediting the others.

**CL-03.2** The run's `executes` and `tests` links shall be confirmed at creation per TE-02.1 with the versions at `HEAD`, recorded as `commit`.
*Rationale:* The run must record exactly which version was tested; the commit makes it reproducible.

**CL-03.3** Recording shall be refused while a system under test or a test case differs from `HEAD`.
*Rationale:* Uncommitted states cannot be reproduced and so cannot serve as evidence.

**CL-05.1** Every command shall accept `--format json`, with the JSON output schema versioned.
*Rationale:* Versioned JSON lets scripts and CI rely on the output across tool updates.

**CL-05.2** Exit codes shall be 0 for success, 1 for findings, 2 for usage errors and 3 for internal errors; only the exit-3 message includes Git's error output.
*Rationale:* Separating findings from failures lets CI tell rejected changes from broken tooling; Git's messages on handled failures mislead.

**CL-05.3** `suspects`, `impact` and `report coverage` shall show each reported item as `<ID> (<title>)` in text output. JSON shall give listed IDs as `{id, title}` and add `title` to link states and coverage rows and `targetTitle` to link states. `show`'s JSON shall add `path`. JSON for `search` shall give each match's item fields, `links` and `meta`: the record `show` gives without version, link states or artifacts.
*Rationale:* IDs are stable but meaningless to readers; titles make reports readable without looking items up. Reusing `show`'s fields for `search` answers many items in one call.

## VS Code extension

**VS-01.1** The extension shall reuse the core library and run in the extension host without a separate server, bundled by esbuild into one CommonJS file and activated in workspaces containing `plm.yaml`.
*Rationale:* One core avoids duplicated logic and diverging results between editor and CI. A bundle needs no installed dependencies.

**VS-01.2** Editing the active item (the innermost item containing the active editor's file) or a product tree item shall open a webview form generated from the type's JSON Schema, with fields for its string, number, enum and string array attributes and for `status` and `owner`. The form shall show schema errors while typing; saving shall write `item.yaml` and `meta/<ID>.yaml` through the core, keeping other attributes and comments.
*Rationale:* Forms generated from schemas support new and program-specific types without extension code. Flat fields cover the built-in types; nested attributes are edited in YAML.

**VS-01.3** Diagnostics shall be updated in the Problems panel within one second of saving a file.
*Rationale:* Immediate feedback catches errors while the context is fresh. Validation reads files from disk, so unsaved edits are not seen.

**VS-01.5** A "New item" command on product tree items shall pick a type, ask for a title, create the item per CL-02.1 in that item's folder, and open its form.
*Rationale:* Items are created where they belong in the product structure.

**VS-02.1** A tree view shall show composition, nested and used items, from the top-level items, with type icons and status badges; selecting an item opens its `item.yaml`.
*Rationale:* Badges show maturity. Used items appear under each item using them, as they count toward its version.

**VS-03.1** A product tree command shall show a read-only webview of an item with a section per item of its subtree (TE-06.2), each item once, numbered and headed by depth (1, 1.1, 1.1.1), each listing the item's requirements with title in bold, ID, status, coverage state and rendered Markdown text; clicking an ID opens its file.
*Rationale:* Read-only rendering avoids a second editor; reviewers read the requirements top to bottom in the product's structure.

**VS-03.3** Each requirement shall list its links and the links to it with their state per TE-03.1 and, if not current, "Review link" (VS-04.3), and each verifying test case its latest run per TE-06.1.
*Rationale:* Links in both directions per requirement form the traceability matrix in reading order.

**VS-03.4** The document shall begin with each requirement's coverage state and the output of `plm suspects <item>`, and take all link states, coverage and runs from the core functions behind `plm suspects` and `plm report coverage`.
*Rationale:* Reviewers see the item's gaps first, including links to requirements outside the subtree.

**VS-04.2** "Review link" shall show one page with the link type, the source's and target's text, the diff from TE-03.2 or, if unconfirmed, the target's file, the previous confirmer and date, and the target's findings; "Confirm" shall confirm that link per CL-01.2, "Cancel" close the page.
*Rationale:* Users decide on one link with everything needed on one page.

**VS-04.3** In item and requirement files, hovering an ID shall show its title, type and status and, for a link target, the link's state and "Review link"; Go to definition shall open its file.
*Rationale:* Links are inspected and navigated where they are written, replacing a separate links view.

**VS-06.1** A command shall record a manual test run, picking test cases, system under test, each test case's result and log files in quick picks and a file dialog, and recording it through the core per CL-03.1 to CL-03.3.
*Rationale:* Manual and automated runs must produce identical evidence; one recording function in the core guarantees it.
