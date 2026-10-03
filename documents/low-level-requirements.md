# Low-Level Requirements

Each requirement `XX-nn.m` refines component requirement `XX-nn` in [components.md](components.md).

## Core library

**CO-01.1** The core shall read `plm.yaml` (repository settings), `items/<ID>/item.yaml`, `meta/<ID>.yaml` and `configurations/<name>.yaml` with the `yaml` package, keeping comments and formatting when writing back.

**CO-01.2** `item.yaml` shall hold content: `id`, `type`, `title`, type-specific attributes, `text` (Markdown), `children` and `external_ids`. `meta/<ID>.yaml` shall hold `owner`, `status`, `revision` and `links`.

**CO-01.3** The core shall list artifacts as file paths without reading their contents, and detect Git LFS pointers that are not fetched.

**CO-01.4** The core shall load a repository of 10,000 items in under 5 seconds on a current laptop.

**CO-02.1** The core shall validate `item.yaml` with Ajv against the JSON Schema (2020-12) of its type; built-in schemas may be extended by `schemas/<type>.schema.json` in the repository.

**CO-02.2** The core shall report as errors: an `id` differing from its directory name, IDs differing only in case, unknown child or link targets, link types not allowed between the source and target types, and composition cycles.

**CO-02.3** The core shall report files above the size limit in `plm.yaml` that are not stored in Git LFS.

**CO-02.4** Each finding shall carry file, line, column, severity and a stable code.

**CO-03.1** The core shall build a full-text index (MiniSearch) over ID, title, text and attributes, serializable to JSON for the static site.

**CO-03.2** Queries shall combine free text with filters `type:`, `status:`, `owner:` and `config:`.

**CO-04.1** A configuration file shall name a root item and the optional children it includes; children marked `optional: true` in `item.yaml` are excluded unless listed.

**CO-04.2** Resolution shall walk the composition from the root and return each selected item with its version, reporting listed items that are unreachable.

**CO-05.1** Import shall map SPEC-OBJECTs to requirement items, SPECIFICATIONs to `specification` items whose children follow the SPEC-HIERARCHY, and SPEC-RELATIONs to unconfirmed links.

**CO-05.2** Import shall store each ReqIF IDENTIFIER in `external_ids.reqif`, update items matched by it and report, never delete, items missing from the file.

**CO-05.3** XHTML shall be converted to Markdown and back; conversions losing formatting shall be reported.

**CO-05.4** Attribute names and enumerations shall be mapped by per-tool profiles in `exchange/<profile>.yaml`, with profiles for DOORS and Polarion provided.

**CO-05.5** Export shall write `.reqif` or `.reqifz` with attachments and validate it against the ReqIF 1.2 XSD.

## Traceability engine

**TE-01.1** An item's version shall be the SHA-256 hex digest of its directory's Git tree hash followed by its children's versions in listed order.

**TE-01.2** Tree hashes of the working tree shall be computed by staging into a temporary Git index, so LFS filters apply and uncommitted and committed states yield identical versions.

**TE-01.3** Versions shall be cached in `.plm/cache` keyed by tree hash and child versions.

**TE-02.1** Confirming a link shall write the target's current version to the link's `version` field in `meta/<ID>.yaml`; a link without `version` is unconfirmed.

**TE-02.2** Confirmation shall be refused while the target fails validation.

**TE-03.1** A link shall be suspect when its confirmed version differs from the target's current version, and unconfirmed when it has none.

**TE-03.2** To show what changed, the engine shall find the latest commit at which the target had the confirmed version and return the diff of the target's subtree since then.

**TE-04.1** `plm.yaml` shall map repository aliases to a URL and pinned commit; links shall target `<alias>:<path>`.

**TE-04.2** The engine shall fetch aliased repositories into `.plm/repos/` and use the Git object hash of `<path>` at the pinned commit as the version, or the item version if the alias is a PLM repository.

**TE-05.1** Given two commits, the engine shall list changed items, their ancestors, links that became suspect, affected configurations and test runs whose evidence is no longer current.

**TE-06.1** A requirement shall count as verified when a test case `verifies` it, a test run `executes` that test case with result `pass`, and the run's `tests` link to its system under test is not suspect.

**TE-06.2** Coverage shall be reported per configuration and specification as verified, verification pending (test case without current passing run) and unverified.

## CLI

**CL-01.1** The CLI shall be a Node.js 22 program `plm` built with Commander, with commands `validate`, `search`, `show`, `link`, `confirm`, `suspects`, `impact <base>..<head>` and `report trace|coverage|compliance`.

**CL-01.2** `confirm` shall accept a source item and optionally a link type and target, confirming all links of the source by default.

**CL-02.1** `plm new <type>` shall create the item and meta files from the type's template, built-in or in `templates/<type>.yaml`, and print the new ID.

**CL-02.2** New IDs shall be a type prefix from `plm.yaml` plus six random Crockford Base32 characters, so parallel branches cannot collide.

**CL-02.3** `plm retire <ID>` shall set `status: retired`; validation shall warn about links to retired items.

**CL-03.1** `plm test record <test-case> --sut <ID> --result pass|fail|inconclusive` shall create a test run item with date, environment and attached log files.

**CL-03.2** The run's `executes` and `tests` links shall be confirmed at creation, the `tests` version taken from the commit given by `--commit` (default `HEAD`).

**CL-03.3** Recording shall be refused while the system under test has uncommitted changes.

**CL-04.1** `plm release <ID>` shall set `status: released` and the next revision letter, skipping I, O, Q, S, X and Z (ASME Y14.35).

**CL-04.2** Release shall be refused if the item or its subtree has validation errors, suspect or unconfirmed links, or unreleased children.

**CL-04.3** `plm tag` shall create annotated tags `rev/<ID>/<revision>` for newly released items and `baseline/<name>` for configurations, recording versions in the tag message.

**CL-05.1** Every command shall accept `--format json`, with the JSON output schema versioned.

**CL-05.2** Exit codes shall be 0 for success, 1 for findings, 2 for usage errors and 3 for internal errors.

## VS Code extension

**VS-01.1** The extension shall reuse the core library and run in the extension host without a separate server.

**VS-01.2** Item editing shall use a webview form generated from the type's JSON Schema, writing changes to `item.yaml` and `meta/<ID>.yaml` through the core.

**VS-01.3** Diagnostics shall be updated in the Problems panel within one second of a change.

**VS-01.4** Link targets shall be selected through the core search.

**VS-02.1** A tree view shall show composition from the configuration chosen in its title bar, or all top-level items, with type icons and status badges.

**VS-02.2** The view shall refresh on file changes through a file system watcher.

**VS-03.1** Opening a `specification` item shall show a read-only webview of its subtree as numbered sections with ID, status and rendered Markdown; clicking a requirement opens its form.

**VS-04.1** A links view shall list the active item's outgoing and incoming links with their state.

**VS-04.2** "Show change" shall open the diff from TE-03.2 in the VS Code diff editor; "Confirm" shall perform TE-02.1.

**VS-05.1** A custom editor shall render `.step`, `.stp`, `.stl`, `.gltf` and `.glb` with three.js, converting STEP through occt-import-js in the webview.

**VS-05.2** The viewer shall provide orbit, pan, zoom, fit to view and the STEP assembly tree.

**VS-05.3** For LFS pointers not fetched, the viewer shall offer to fetch the file.

**VS-06.1** A command shall record a manual test run through a form, applying CL-03.1 to CL-03.3.

## CI integration

**CI-01.1** CI shall be provided as a GitHub Action and a GitLab CI component, both running the CLI in a published container image.

**CI-01.2** On each merge request CI shall run `plm validate` and `plm suspects` on the merge result and fail on any error, suspect or unconfirmed link.

**CI-01.3** Findings shall appear as merge request annotations: GitHub check annotations or a GitLab Code Quality report.

**CI-01.4** Hosts shall require this job to pass before merging into protected branches.

**CI-01.5** After merges into protected branches CI shall run `plm tag`.

**CI-02.1** CI shall post the output of `plm impact` as one merge request comment, updated on each push and linking a full report when it exceeds the host's comment size limit.

**CI-02.2** CI shall request review from the owners of affected items through the host API, mapping `owner` to host usernames.

**CI-03.1** CI shall convert each STEP artifact to Draco-compressed glTF binary using occt-import-js and glTF-Transform, with tessellation tolerance from `plm.yaml`.

**CI-03.2** Converted models shall not be committed but cached by the STEP file's blob hash and published with the site.

**CI-04.1** CI shall build the site on every push to a branch or tag and deploy it under `<site>/<ref>/`, removing sites of deleted branches and keeping those of tags.

## Static site

**SI-01.1** The site shall be built with Astro from the core library and contain only static files.

**SI-01.2** Each item shall have a page with attributes, text, artifact downloads, children, links with their state, and history: the commits touching its files, with date, author, message and merge request.

**SI-01.3** Search shall run in the browser on the index from CO-03.1.

**SI-01.4** 3D models shall be shown with three.js using the converted models from CI-03.1.

**SI-02.1** For each configuration the site shall show a traceability matrix (requirements against satisfying, implementing and verifying items), coverage per TE-06.2, and a compliance matrix (certification basis requirements against evidence).

**SI-02.2** Each matrix shall be exportable as CSV.

**SI-03.1** Each site shall publish `versions.json` listing every item's ID, title and version.

**SI-03.2** A compare page shall load two published `versions.json` files in the browser and list added, removed and changed items.

**SI-04.1** CI shall deploy only to targets enforcing host login: GitLab Pages access control, or a reverse proxy with the host's OAuth such as oauth2-proxy.

**SI-04.2** CI shall refuse to deploy to a public target unless `plm.yaml` sets `site.public: true`.
