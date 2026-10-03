# Component Requirements

Each requirement traces to top-level requirements (CR) and user scenarios (US).

## Core library (CO)

**CO-01** The core shall load items, artifacts, links and configurations from a repository. (CR-01–CR-03; US-2, US-3)
*Rationale:* All components need the same view of the repository; one loader avoids inconsistent interpretations.

**CO-02** The core shall validate items against their type's schema and report broken links and composition cycles. (CR-04; US-1–US-5)
*Rationale:* Errors in plain-text files are easy to make; early validation keeps the definition consistent before review.

**CO-03** The core shall search items by ID, type, attribute and text. (CR-05; US-2, US-6)
*Rationale:* Search is the entry point to a large product for all users and components.

**CO-04** The core shall resolve a configuration to the item versions it selects. (CR-11; US-6, US-7)
*Rationale:* Reports, product trees and comparisons all operate on a configuration, so resolving it belongs in the shared core.

## Traceability engine (TE)

**TE-01** The engine shall compute each item's version from its content, including nested items, and the versions of items it uses. (CR-07, CR-12; US-2, US-5)
*Rationale:* Including nested and used items means a change anywhere below an assembly invalidates evidence on it, as test results on assemblies require.

**TE-02** The engine shall record the target's version when a user confirms a link. (CR-07; US-1, US-4)
*Rationale:* The confirmed version records what a user actually checked. Stored outside items, confirming changes no versions and cannot cascade.

**TE-03** The engine shall flag a link as suspect when its target's version differs from the confirmed one, and show what changed. (CR-07, CR-09; US-1, US-6)
*Rationale:* Suspect links are the tool's core signal; showing the change lets users quickly judge whether it matters.

**TE-04** The engine shall resolve links to items in other repositories at a pinned commit. (CR-08; US-4)
*Rationale:* Software follows its own repository and release cycle; pinning a commit keeps the link exact.

**TE-05** The engine shall list the items, links and verification evidence affected by a change. (CR-13; US-7)
*Rationale:* Impact must be known before approving a change, both locally and in CI, so the analysis belongs in the engine.

**TE-06** The engine shall report requirements without verifying tests and tests whose evidence is suspect. (CR-09, CR-10; US-5, US-6)
*Rationale:* Coverage gaps and stale evidence are what certification reviews look for first.

## CLI (CL)

**CL-01** The CLI shall expose validation, search, link confirmation, impact analysis and reports. (CR-04–CR-07, CR-10, CR-13; US-1–US-7)
*Rationale:* A CLI makes every function scriptable and usable in CI and on rigs without an editor.

**CL-02** The CLI shall create items from type templates and retire them. (CR-04; US-2, US-3)
*Rationale:* Templates give new items a valid structure, reducing manual errors and review effort.

**CL-03** The CLI shall record test runs with SUT version, result and logs. (CR-09; US-5)
*Rationale:* Automated tests run on CI and HIL rigs without an editor and must report their results directly.

**CL-05** The CLI shall offer machine-readable output and fail with non-zero exit codes. (CR-19; US-5)
*Rationale:* Scripts and CI need parseable results and reliable failure signals.

## VS Code extension (VS)

**VS-01** The extension shall provide forms to create and edit items and links, validated while typing. (CR-04; US-1–US-5)
*Rationale:* Engineers should not need to know the YAML schemas; forms with live validation lower the entry barrier.

**VS-02** The extension shall show the product tree of the repository or a configuration. (CR-02, CR-05, CR-11; US-2)
*Rationale:* The product tree is how engineers think about the product and is their main navigation.

**VS-03** The extension shall show a requirement hierarchy as a readable document. (CR-05, CR-06; US-1)
*Rationale:* Requirements engineers read and review requirements as documents, not as single files.

**VS-04** The extension shall show an item's links with their suspect state and let users re-confirm them. (CR-06, CR-07; US-1, US-3)
*Rationale:* Suspects are resolved where the engineer works, without switching tools.

**VS-05** The extension shall display STEP, STL and glTF models. (CR-03, CR-05; US-2, US-3)
*Rationale:* Seeing the geometry helps identify items and review changes without opening a CAD tool.

**VS-06** The extension shall let users enter manual test results. (CR-09; US-5)
*Rationale:* Not every test is automated; manual results need the same traceable record.

## CI integration (CI)

**CI-01** CI shall validate each merge request and block merging on errors or unconfirmed suspect links. (CR-09, CR-12, CR-14; US-7)
*Rationale:* Checking in CI keeps errors and unconfirmed suspects out of protected branches, whatever tools users run locally.

**CI-02** CI shall post the impact analysis on each merge request and request review from owners of affected items. (CR-13, CR-14, CR-18; US-7)
*Rationale:* Reviewers see the consequences of a change where they approve it, and owners are involved automatically.

**CI-03** CI shall derive viewable glTF from CAD artifacts. (CR-05; US-2, US-6)
*Rationale:* Native CAD files are large and need licensed tools; glTF loads quickly in VS Code and browsers.

**CI-04** CI shall publish the static site for each branch and release. (CR-05, CR-10; US-6)
*Rationale:* Publishing per branch and release gives every state a stable read-only view.

## Static site (SI)

**SI-01** The site shall let users search and browse items, artifacts, links, 3D models and item history. (CR-05, CR-15; US-6)
*Rationale:* Reviewers, managers and authorities need access without installing tools or cloning repositories.

**SI-02** The site shall show traceability, coverage and compliance matrices for a configuration. (CR-10, CR-11; US-6)
*Rationale:* Matrices are the established evidence format for coverage and compliance reviews.

**SI-03** The site shall compare two releases. (CR-11; US-6)
*Rationale:* Comparisons show what changed between deliveries or certification steps.

**SI-04** The site shall be accessible only to users authorized on the Git host. (CR-17; US-7)
*Rationale:* The site exposes the full definition, so it must respect the same permissions as the repository.
