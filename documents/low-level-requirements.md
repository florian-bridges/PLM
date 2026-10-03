# Low-Level Requirements

Each requirement `XX-nn.m` refines component requirement `XX-nn` in [components.md](components.md).

## Core library

**CO-01.1** The core shall read `plm.yaml` (repository settings), item folders `<ID>-<title>/item.yaml` with their `requirements/<ID>-<title>.yaml`, test cases `tests/<ID>-<title>/item.yaml`, test runs `runs/<ID>-<title>/item.yaml`, `meta/<ID>.yaml` and `configurations/<name>.yaml` with the `yaml` package, keeping comments and formatting when writing back.
*Rationale:* Comment-preserving writes keep hand edits intact and review diffs small when tools and engineers edit the same files.

**CO-01.2** `item.yaml` shall hold content: `id`, `type`, `title`, type-specific attributes, `text` (Markdown), `uses` and `external_ids`. `meta/<ID>.yaml` shall hold `owner`, `status` and `links`.
*Rationale:* Separating content from administrative data keeps versions stable when links, ownership or status change (TE-01.1).

**CO-01.3** The core shall list artifacts as file paths without reading their contents, and detect Git LFS pointers that are not fetched.
*Rationale:* Artifacts can be gigabytes; reading them on demand keeps loading fast and works without fetched LFS files.

**CO-02.1** The core shall validate `item.yaml` with Ajv against the JSON Schema (2020-12) of its type; built-in schemas may be extended by `schemas/<type>.schema.json` in the repository.
*Rationale:* JSON Schema is understood by editors, Ajv and form generators; repository extensions let programs add their own attributes.

**CO-02.2** The core shall report as errors: names not starting with their `id`, requirements, test cases and test runs outside `requirements/`, `tests/` and `runs/` folders respectively, other items inside them, duplicate IDs or IDs differing only in case, unknown used items or link targets, link types not allowed between the source and target types, and composition cycles.
*Rationale:* These errors break versions, links or composition and would otherwise surface late, for example on case-insensitive file systems.

**CO-02.3** The core shall report files above the size limit in `plm.yaml` that are not stored in Git LFS.
*Rationale:* Binaries outside LFS bloat every clone permanently and cannot be locked.

**CO-02.4** Each finding shall carry file, line, column, severity and a stable code.
*Rationale:* Positions let editors and CI point to the problem; stable codes allow filtering and suppression.

**CO-02.5** Built-in types shall be `requirement`, `part`, `assembly`, `test-case` and `test-run`.
*Rationale:* Programs add further types by schema (CO-02.1).

**CO-02.6** Links shall be allowed as `satisfies` and `implements` from any type to `requirement`, `verifies` from `test-case` to `requirement`, `executes` from `test-run` to `test-case`, and `tests` from `test-run` to any type.
*Rationale:* Fixed semantics keep reports comparable across programs.

**CO-03.1** The core shall build a full-text index (MiniSearch) over ID, title, text and attributes, serializable to JSON for the static site.
*Rationale:* One index format serves the CLI, VS Code and the browser without a search server.

**CO-03.2** Queries shall combine free text with filters `type:`, `status:`, `owner:` and `config:`.
*Rationale:* Filters answer typical questions, such as all unreleased parts of an owner, faster than text alone.

**CO-04.1** A configuration file shall name the `root` item of one product variant.
*Rationale:* Variants as root items sharing parts through `uses` need no second selection mechanism, and each variant has its own version.

**CO-04.2** Resolution shall return the root's subtree and the requirements of its items with their versions; validation shall report unknown roots.
*Rationale:* Reports and comparisons need exact versions, including the requirements they cover.

**CO-05.1** Import shall map SPEC-OBJECTs to requirement items, a SPECIFICATION to the `requirements/` folder of an item chosen at import, and SPEC-RELATIONs to unconfirmed links.
*Rationale:* These are ReqIF's equivalents of requirements, documents and links. Imported links start unconfirmed because ReqIF carries no versions.

**CO-05.2** Import shall store each ReqIF IDENTIFIER in `external_ids.reqif`, update items matched by it and report, never delete, items missing from the file.
*Rationale:* Customers re-import our exports, so their IDs must survive round trips; deleting would silently lose data.

**CO-05.3** XHTML shall be converted to Markdown and back; conversions losing formatting shall be reported.
*Rationale:* Markdown is readable and diffable in Git; reporting losses makes round-trip limitations visible.

**CO-05.4** Attribute names and enumerations shall be mapped by per-tool profiles in `exchange/<profile>.yaml`, with profiles for DOORS and Polarion provided.
*Rationale:* DOORS and Polarion name and encode attributes differently; profiles keep tool specifics out of the code.

**CO-05.5** Export shall write `.reqif` or `.reqifz` with attachments and validate it against the ReqIF 1.2 XSD.
*Rationale:* Attachments travel in `.reqifz`; schema validation catches export errors before partners do.

## Traceability engine

**TE-01.1** An item's version shall be the SHA-256 hex digest of its folder's Git tree hash followed by the versions of the items it uses, in listed order; a requirement's version shall be its file's Git blob hash.
*Rationale:* Git hashes capture all files, including nested items and LFS pointers; adding used items' versions propagates their changes.

**TE-01.2** Hashes of the working tree shall be computed by staging into a temporary Git index, so LFS filters apply and uncommitted and committed states yield identical versions.
*Rationale:* Engineers need suspect states before committing; identical results avoid spurious differences between local runs and CI.

**TE-01.3** Versions shall be cached in `.plm/cache` keyed by tree hash and used items' versions.
*Rationale:* Recomputing deep assemblies on every command would be slow; the key changes whenever the result could.

**TE-02.1** Confirming a link shall write the target's current version to the link's `version` field in `meta/<ID>.yaml`; a link without `version` is unconfirmed.
*Rationale:* Keeping the version next to the link makes confirmations reviewable as ordinary diffs.

**TE-02.2** Confirmation shall be refused while the target fails validation.
*Rationale:* Confirming against a broken item would record a meaningless state.

**TE-03.1** A link shall be suspect when its confirmed version differs from the target's current version, and unconfirmed when it has none.
*Rationale:* Separating unconfirmed from suspect distinguishes new, unreviewed links from links invalidated by change.

**TE-03.2** To show what changed, the engine shall find the latest commit at which the target had the confirmed version and return the diff of the target's subtree since then.
*Rationale:* The user must judge whether the change matters; the diff shows exactly what happened since confirmation.

**TE-04.1** `plm.yaml` shall map repository aliases to a URL and pinned commit; links shall target `<alias>:<path>`.
*Rationale:* One pin per alias updates all links into a repository in a single reviewed change.

**TE-04.2** The engine shall fetch aliased repositories into `.plm/repos/` and use the Git object hash of `<path>` at the pinned commit as the version, or the item version if the alias is a PLM repository.
*Rationale:* Software repositories are usually not PLM repositories; object hashes give them versions without imposing the item model.

**TE-05.1** Given a base commit and a head commit or the working tree, the engine shall list items whose own files changed, items changed through them, links that became suspect, test runs whose evidence is no longer current, and configurations selecting a changed item or whose file changed.
*Rationale:* These are the questions a change board asks before approval.

**TE-05.2** A link shall have become suspect when its confirmed version equals the target's version at base but not at head.
*Rationale:* Links already suspect at base are not caused by the change.

**TE-06.1** A requirement shall count as verified when a test case `verifies` it through a current link and that test case's latest run, by date, with current `executes` and `tests` links has result `pass`.
*Rationale:* Evidence counts only for the versions tested and the latest result; reusing the suspect mechanism avoids a second staleness check.

**TE-06.2** Coverage shall be reported per configuration or item subtree as verified, verification pending (verifying test case without current passing run) and unverified (no verifying test case).
*Rationale:* Pending verification differs from a missing test and needs a different action.

## CLI

**CL-01.1** The CLI shall be a Node.js 22 program `plm` built with Commander, with commands `validate`, `search`, `show`, `link`, `confirm`, `suspects`, `impact <base>[..<head>]`, `configuration <name>` and `report trace|coverage|compliance [--config <name>]`, finding the repository by searching upward for `plm.yaml`.
*Rationale:* Commander is the established Node.js CLI library.

**CL-01.2** `confirm` shall accept a source item and optionally a link type and target, confirming all links of the source by default.
*Rationale:* After review, engineers typically confirm all links of an item at once.

**CL-02.1** `plm new <type> [title]` shall create the item and meta files from the type's template, built-in or in `templates/<type>.yaml`, in the item folder containing the working folder, requirements in its `requirements/` folder, test cases in `tests/`, and print the new ID.
*Rationale:* Repository templates let programs prefill attributes and conventions.

**CL-02.2** New IDs shall be a type prefix from `plm.yaml` plus six random Crockford Base32 characters, so parallel branches cannot collide.
*Rationale:* Sequential numbers collide when branches create items in parallel; Crockford Base32 avoids ambiguous characters.

**CL-02.3** `plm retire <ID>` shall set `status: retired`; validation shall warn about links to retired items.
*Rationale:* Retired items may still be referenced by earlier releases; warnings show links that need attention.

**CL-02.4** `plm init` shall run `git init` and write a `plm.yaml` with ID prefixes for the built-in types.
*Rationale:* Users can create items right away.

**CL-03.1** `plm test record <test-case> --sut <ID> --result pass|fail|inconclusive [--log <file>...]` shall create a test run in `runs/` with date, result and copies of the log files.
*Rationale:* Rigs report without human interaction; logs are the evidence auditors ask for.

**CL-03.2** The run's `executes` and `tests` links shall be confirmed at creation with the versions at the commit given by `--commit` (default `HEAD`).
*Rationale:* The run must record exactly which version was tested; the commit makes this reproducible on rigs.

**CL-03.3** Recording shall be refused while the system under test or test case differs from that commit.
*Rationale:* Uncommitted states cannot be reproduced and so cannot serve as evidence.

**CL-05.1** Every command shall accept `--format json`, with the JSON output schema versioned.
*Rationale:* Versioned JSON lets scripts and CI rely on the output across tool updates.

**CL-05.2** Exit codes shall be 0 for success, 1 for findings, 2 for usage errors and 3 for internal errors.
*Rationale:* Separating findings from failures lets CI tell rejected changes from broken tooling.

## VS Code extension

**VS-01.1** The extension shall reuse the core library and run in the extension host without a separate server.
*Rationale:* One core avoids duplicated logic and diverging results between editor and CI.

**VS-01.2** Item editing shall use a webview form generated from the type's JSON Schema, writing changes to `item.yaml` and `meta/<ID>.yaml` through the core.
*Rationale:* Forms generated from schemas support new and program-specific types without extension code.

**VS-01.3** Diagnostics shall be updated in the Problems panel within one second of a change.
*Rationale:* Immediate feedback catches errors while the context is fresh.

**VS-01.4** Link targets shall be selected through the core search.
*Rationale:* Typing IDs by hand is error-prone; search finds targets by title or text.

**VS-02.1** A tree view shall show composition from the configuration chosen in its title bar, or all top-level items, with type icons and status badges.
*Rationale:* Engineers work on one variant at a time; badges show maturity at a glance.

**VS-03.1** Opening an item's `requirements/` folder shall show a read-only webview of its requirements as numbered sections with ID, status and rendered Markdown; clicking a requirement opens its form.
*Rationale:* Read-only rendering avoids a second editor; reviewers see the document as exchanged with customers.

**VS-04.1** A links view shall list the active item's outgoing and incoming links with their state.
*Rationale:* Incoming links show what depends on an item before it is changed.

**VS-04.2** "Show change" shall open the diff from TE-03.2 in the VS Code diff editor; "Confirm" shall perform TE-02.1.
*Rationale:* The built-in diff editor is familiar and handles text and YAML well.

**VS-05.1** A custom editor shall render `.step`, `.stp`, `.stl`, `.gltf` and `.glb` with three.js, converting STEP through occt-import-js in the webview.
*Rationale:* Converting in the webview needs no CAD license or external tool.

**VS-05.2** The viewer shall provide orbit, pan, zoom, fit to view and the STEP assembly tree.
*Rationale:* These are the minimum interactions to identify parts and review geometry.

**VS-05.3** For LFS pointers not fetched, the viewer shall offer to fetch the file.
*Rationale:* Engineers often clone without LFS content to save time and space.

**VS-06.1** A command shall record a manual test run through a form, applying CL-03.1 to CL-03.3.
*Rationale:* Manual and automated runs must produce identical evidence.

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

**CI-03.1** CI shall convert each STEP artifact to Draco-compressed glTF binary using occt-import-js and glTF-Transform, with tessellation tolerance from `plm.yaml`.
*Rationale:* Draco compression greatly reduces mesh size; the tolerance trades accuracy for size per program.

**CI-03.2** Converted models shall not be committed but cached by the STEP file's blob hash and published with the site.
*Rationale:* Derived files are reproducible, so committing them would only bloat the repository.

**CI-04.1** CI shall build the site on every push and deploy it under `<site>/<branch>/`, removing sites of deleted branches, and under `<site>/<commit>/` for each release, keeping those.
*Rationale:* Every branch can be reviewed in the browser; release sites preserve released states.

## Static site

**SI-01.1** The site shall be built with Astro from the core library and contain only static files.
*Rationale:* Static files can be hosted anywhere, including isolated networks, without a server to maintain.

**SI-01.2** Each item shall have a page with attributes, text, artifact downloads, nested and used items, links with their state, and history: the commits touching its files, with date, author, message and merge request.
*Rationale:* Reviewers need the complete picture of an item, including why it changed.

**SI-01.4** 3D models shall be shown with three.js using the converted models from CI-03.1.
*Rationale:* Converted models load fast in browsers without CAD tools.

**SI-02.1** For each configuration the site shall show a traceability matrix (requirements against satisfying, implementing and verifying items), coverage per TE-06.2, and a compliance matrix (certification basis requirements against evidence).
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
