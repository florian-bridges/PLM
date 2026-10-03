# Low-Level Requirements

Each requirement `XX-nn.m` refines component requirement `XX-nn` in [components.md](components.md).

## Core library

**CO-01.1** The core shall read `plm.yaml` (repository settings), item folders `<ID>-<title>/item.yaml` with their requirements `requirements/<ID>-<title>.yaml` and test cases `tests/<ID>-<title>/item.yaml`, test runs `runs/<ID>-<title>/item.yaml` and `meta/<ID>.yaml` with the `yaml` package, keeping comments and formatting when writing back.
*Rationale:* Comment-preserving writes keep hand edits intact and review diffs small when tools and engineers edit the same files. Test cases in the tested item's folder make its version cover its requirements and test cases, so adding or changing a test case outdates the runs against the item. Runs stay outside: inside the tested item, a run would change the version it records.

**CO-01.2** `item.yaml` shall hold content: `id`, `type`, `title`, type-specific attributes, `text` (Markdown) and `uses`. `meta/<ID>.yaml` shall hold `owner`, `status` and `links`.
*Rationale:* Separating content from administrative data keeps versions stable when links, ownership or status change (TE-01.1).

**CO-01.3** The core shall list artifacts as file paths without reading their contents, and detect Git LFS pointers that are not fetched.
*Rationale:* Artifacts can be gigabytes; reading them on demand keeps loading fast and works without fetched LFS files.

**CO-02.1** The core shall validate `item.yaml` with Ajv against the JSON Schema (2020-12) of its type; built-in schemas may be extended by `schemas/<type>.schema.json` in the repository.
*Rationale:* JSON Schema is understood by editors, Ajv and form generators; repository extensions let programs add their own attributes.

**CO-02.2** The core shall report as errors: names not starting with their `id`, requirements and test cases outside their item's `requirements/` and `tests/` folders, test runs outside the top-level `runs/` folder, other items inside them, duplicate IDs, unknown used items or link targets, link types not allowed between the source and target types, and composition cycles.
*Rationale:* These errors break versions, links or composition and would otherwise surface late.

**CO-02.3** The core shall report files above the size limit in `plm.yaml` that are not stored in Git LFS.
*Rationale:* Binaries outside LFS bloat every clone permanently and cannot be locked.

**CO-02.4** Each finding shall carry file, line, column, severity and a stable code.
*Rationale:* Positions let editors and CI point to the problem; stable codes allow filtering and suppression.

**CO-02.5** Built-in types shall be `requirement`, `part`, `assembly`, `test-case` and `test-run`.
*Rationale:* Others come by schema (CO-02.1).

**CO-02.6** Links shall be allowed as `satisfies` and `implements` from any type to `requirement`, `verifies` from `test-case` to `requirement`, `executes` from `test-run` to `test-case`, and `tests` from `test-run` to any type.
*Rationale:* Fixed semantics keep reports comparable.

**CO-02.7** The core shall warn when a name has a title part other than the slug of its `title`: lowercase, with runs of characters other than ASCII letters and digits replaced by `-`, trimmed of `-`.
*Rationale:* Names show the structure in file browsers and on the Git host; names left from earlier titles mislead.

**CO-03.1** The core shall build a full-text index (MiniSearch) over ID, title, text and attributes, serializable to JSON for the static site.
*Rationale:* One index format serves the CLI, VS Code and the browser without a search server.

**CO-03.2** Queries shall combine free text, matching all words by prefix, with filters `type:`, `status:` and `owner:`.
*Rationale:* Filters answer typical questions, such as all unreleased parts of an owner, faster than text alone. Prefix matching finds items while typing.

## Traceability engine

**TE-01.1** An item's version shall be the SHA-256 hex digest of its folder's Git tree hash followed by the versions of the items it uses, in listed order; a requirement's version shall be its file's Git blob hash.
*Rationale:* Git hashes capture all files, including nested items and LFS pointers; adding used items' versions propagates their changes.

**TE-01.2** Hashes of the working tree shall be computed by staging into a temporary Git index, so LFS filters apply and uncommitted and committed states yield identical versions.
*Rationale:* Engineers need suspect states before committing; identical results avoid spurious differences between local runs and CI.

**TE-02.1** Confirming a link shall write to the link in `meta/<ID>.yaml` the target's current `version` and `title`, the confirming Git `user.name` as `by`, the date as `on`, and as `commit` the short hash of HEAD if the target has the confirmed version there; a link without `version` is unconfirmed.
*Rationale:* Keeping the version next to the link makes confirmations reviewable as ordinary diffs; title, confirmer, date and commit show what was reviewed without looking up hashes. Uncommitted targets have no commit to name.

**TE-02.2** Confirmation shall be refused while the target fails validation or Git `user.name` is unset.
*Rationale:* Confirming against a broken item would record a meaningless state, and an anonymous confirmation is no review.

**TE-03.1** A link shall be suspect when its confirmed version differs from the target's current version, and unconfirmed when it has none. Links from test runs are evidence, not links to review: suspect lists shall omit them, and a run with a suspect link is outdated.
*Rationale:* Separating unconfirmed from suspect distinguishes new, unreviewed links from links invalidated by change. Re-confirming a run's links would falsify what was tested.

**TE-03.2** To show what changed, the engine shall return the diff of the target's subtree since the link's `commit` or, if it is missing or unknown, since the latest commit at which the target had the confirmed version.
*Rationale:* The user must judge whether the change matters; the diff shows exactly what happened since confirmation. The stored commit avoids searching history, which is needed only for uncommitted confirmations or squashed branches.

**TE-04.1** `plm.yaml` shall map repository aliases to a URL and pinned commit; links shall target `<alias>:<path>`.
*Rationale:* One pin per alias updates all links into a repository in a single reviewed change.

**TE-04.2** The engine shall fetch aliased repositories into `.plm/repos/` and use the Git object hash of `<path>` at the pinned commit as the version, or the item version if the alias is a PLM repository.
*Rationale:* Software repositories are usually not PLM repositories; object hashes give them versions without imposing the item model.

**TE-05.1** Given a base commit and a head commit or the working tree, the engine shall list items whose own files changed, items changed through them, links other than from test runs that became suspect, and runs that became outdated.
*Rationale:* These are the questions a change board asks before approval.

**TE-05.2** A link shall have become suspect when its confirmed version equals the target's version at base but not at head.
*Rationale:* Links already suspect at base are not caused by the change.

**TE-06.1** A requirement shall count as verified when a test case `verifies` it through a current link and that test case's latest run, by date, with current `executes` and `tests` links has result `pass`; a pending requirement shall name its test cases' outdated latest runs.
*Rationale:* Evidence counts only for the versions tested and the latest result; reusing the suspect mechanism avoids a second staleness check.

**TE-06.2** Coverage shall be reported for the repository or an item subtree as verified, verification pending (verifying test case without current passing run) and unverified (no verifying test case).
*Rationale:* Pending verification differs from a missing test and needs a different action.

## CLI

**CL-01.1** The CLI shall be a Node.js 22 program `plm` built with Commander, with commands `validate`, `search`, `show`, `link`, `confirm`, `suspects`, `impact <base>[..<head>]` and `report trace|coverage|compliance [<item>]`, finding the repository by searching upward for `plm.yaml`.
*Rationale:* Commander is the established choice.

**CL-01.2** `confirm <source>` shall confirm all links of the source item.
*Rationale:* After review, engineers typically confirm all links of an item at once.

**CL-02.1** `plm new <type> [title]` shall create the item and meta files from the type's template, built-in or in `templates/<type>.yaml`, in the item folder containing the working folder, requirements and test cases in its `requirements/` and `tests/` folders, and print the new ID.
*Rationale:* Repository templates let programs prefill attributes and conventions.

**CL-02.2** New IDs shall be a type prefix from `plm.yaml` plus six random Crockford Base32 characters.
*Rationale:* Sequential numbers collide when branches create items in parallel; Crockford Base32 avoids ambiguous characters.

**CL-02.3** `plm retire <ID>` shall set `status: retired`; validation shall warn about links to retired items.
*Rationale:* Retired items may still be referenced by earlier releases; warnings show links that need attention.

**CL-02.4** `plm init` shall run `git init` and write a `plm.yaml` with ID prefixes for the built-in types.
*Rationale:* Items can follow at once.

**CL-02.5** `plm rename <ID> <title>` shall set the item's `title` and rename its folder or file to match it per CO-02.7.
*Rationale:* Retitling and renaming in one step keeps names current; links refer to IDs and need no change.

**CL-03.1** `plm test record <test-case> --sut <ID> --result pass|fail|inconclusive [--log <file>...]` shall create a test run in `runs/` with date, result and copies of the log files.
*Rationale:* Rigs report without human interaction; logs are the evidence auditors ask for.

**CL-03.2** The run's `executes` and `tests` links shall be confirmed at creation per TE-02.1 with the versions at `HEAD`, recorded as `commit`.
*Rationale:* The run must record exactly which version was tested; the commit makes it reproducible.

**CL-03.3** Recording shall be refused while the system under test or test case differs from `HEAD`.
*Rationale:* Uncommitted states cannot be reproduced and so cannot serve as evidence.

**CL-05.1** Every command shall accept `--format json`, with the JSON output schema versioned.
*Rationale:* Versioned JSON lets scripts and CI rely on the output across tool updates.

**CL-05.2** Exit codes shall be 0 for success, 1 for findings, 2 for usage errors and 3 for internal errors.
*Rationale:* Separating findings from failures lets CI tell rejected changes from broken tooling.

**CL-05.3** `suspects`, `impact` and `report coverage` shall show each reported item as `<ID> (<title>)` in text output. In JSON, IDs listed alone shall become `{id, title}` objects, and link states and coverage rows shall gain the `title` of their source or requirement and, for link targets, `targetTitle`.
*Rationale:* IDs are stable but meaningless to readers; titles make reports readable without looking items up.

## VS Code extension

**VS-01.1** The extension shall reuse the core library and run in the extension host without a separate server, bundled by esbuild into one CommonJS file and activated in workspaces containing `plm.yaml`.
*Rationale:* One core avoids duplicated logic and diverging results between editor and CI. A bundle needs no installed dependencies; other workspaces stay unaffected.

**VS-01.2** Editing the active item or a product tree item shall open a webview form generated from the type's JSON Schema, with fields for its string, number, enum and string array attributes and for `status` and `owner`. The form shall show schema errors while typing; saving shall write `item.yaml` and `meta/<ID>.yaml` through the core, keeping other attributes and comments.
*Rationale:* Forms generated from schemas support new and program-specific types without extension code. Flat fields cover the built-in types; nested attributes are edited in YAML.

**VS-01.3** Diagnostics shall be updated in the Problems panel within one second of saving a file.
*Rationale:* Immediate feedback catches errors while the context is fresh. Validation reads files from disk, so unsaved edits are not seen.

**VS-01.4** Adding a link to the active item shall offer the link types allowed from its type and select the target through the core search, filtered to the allowed target type.
*Rationale:* Typing IDs by hand is error-prone; search finds targets by title or text.

**VS-02.1** A tree view shall show composition, nested and used items, from the top-level items, with type icons and status badges; selecting an item opens its `item.yaml`.
*Rationale:* Badges show maturity. Used items appear under each item using them, as they count toward its version.

**VS-03.1** A product tree command shall show a read-only webview of an item's requirements and those of its nested items, as numbered sections with ID, title, status and rendered Markdown; clicking an ID opens its file.
*Rationale:* Read-only rendering avoids a second editor; reviewers read the requirements from aircraft to equipment level as one document.

**VS-04.1** A links view shall list the active item's outgoing and incoming links with their state; the active item is the innermost item containing the active editor's file.
*Rationale:* Incoming links show what depends on an item before it is changed.

**VS-04.2** "Show change" shall open the files changed since the commit from TE-03.2 in the VS Code multi-file diff editor; "Confirm" shall confirm all links of the item per CL-01.2.
*Rationale:* The built-in diff editor is familiar and handles text and YAML well. Confirming per item matches the CLI.

**VS-06.1** A command shall record a manual test run, picking test case, system under test, result and log files in quick picks and a file dialog, and recording it through the core per CL-03.1 to CL-03.3.
*Rationale:* Manual and automated runs must produce identical evidence; one recording function in the core guarantees it.

## CI integration

**CI-01.1** CI shall be provided as a GitHub Action and a GitLab CI component, both running the CLI in a published container image.
*Rationale:* GitHub and GitLab cover most hosts, and Forgejo Actions largely runs GitHub Actions; a container keeps tool versions identical everywhere.

**CI-01.2** On each merge request CI shall run `plm validate` and `plm suspects` on the merge result and fail on any error, suspect or unconfirmed link.
*Rationale:* Checking the merge result catches problems that arise only when branches combine.

**CI-01.3** Findings shall appear as merge request annotations: GitHub check annotations or a GitLab Code Quality report.
*Rationale:* Annotations show findings at the affected lines, where reviewers look.

**CI-02.1** CI shall post the output of `plm impact` as one merge request comment, updated on each push and linking a full report when it exceeds the host's comment size limit.
*Rationale:* One updated comment avoids noise; large changes still show a summary.

**CI-02.2** CI shall request review from the owners of affected items through the host API, mapping `owner` to host usernames.
*Rationale:* Owners know their items best and must accept changes affecting them.

**CI-04.1** CI shall build the site on every push and deploy it under `<site>/<branch>/`, removing sites of deleted branches, and under `<site>/<commit>/` for each release, keeping those.
*Rationale:* Every branch can be reviewed in the browser; release sites preserve released states.

## Static site

**SI-01.1** The site shall be built with Astro from the core library and contain only static files.
*Rationale:* Static files can be hosted anywhere, including isolated networks, without a server to maintain.

**SI-01.2** Each item shall have a page with attributes, text, artifact downloads, nested and used items, links with their state, and history: the commits touching its files, with date, author, message and merge request.
*Rationale:* Reviewers need the complete picture of an item, including why it changed.

**SI-02.1** For each top-level item the site shall show a traceability matrix (requirements against satisfying, implementing and verifying items), coverage per TE-06.2, and a compliance matrix (certification basis requirements against evidence).
*Rationale:* These matrices are the evidence reviewed in certification and program reviews.

**SI-02.2** Each matrix shall be exportable as CSV.
*Rationale:* Matrices are often attached to certification documents or processed in spreadsheets.

**SI-03.1** Each site shall publish `versions.json` listing every item's ID, title and version.
*Rationale:* A small published file per site enables comparisons without a server.

**SI-03.2** A compare page shall load two published `versions.json` files in the browser and list added, removed and changed items.
*Rationale:* Comparing in the browser supports any pair of releases without precomputing all combinations.

**SI-04.1** CI shall deploy only to targets enforcing host login: GitLab Pages access control, or a reverse proxy with the host's OAuth such as oauth2-proxy.
*Rationale:* Static sites have no login of their own; the host login reuses existing permissions.

**SI-04.2** CI shall refuse to deploy to a public target unless `plm.yaml` sets `site.public: true`.
*Rationale:* Publishing export-controlled data must be an explicit decision.
