# Component Requirements

Each requirement traces to top-level requirements (CR) and user scenarios (US).

## Core library (CO)

**CO-01** The core shall load items, artifacts and links from a repository. (CR-01–CR-03; US-2)
*Rationale:* All components need the same view of the repository; one loader avoids inconsistent interpretations.

**CO-02** The core shall validate items against their type's schema and report broken links and composition cycles. (CR-04; US-1, US-2, US-5)
*Rationale:* Errors in plain-text files are easy to make; early validation keeps the definition consistent before review.

**CO-03** The core shall search items by ID, type, attribute and text, and list a named list field such as findings or items by owner. (CR-05, CR-14, CR-18; US-2, US-9, US-11)
*Rationale:* Search and listing are the entry point to a large product for all users and components.

## Traceability engine (TE)

**TE-01** The engine shall compute each item's version from its content, including nested items, and the versions of items it uses and parameters it cites. (CR-07, CR-09, CR-12; US-2, US-5, US-8)
*Rationale:* Including nested and used items means a change anywhere below an assembly invalidates evidence on it, as test results on assemblies require.

**TE-02** The engine shall record the target's version when a user confirms a link. (CR-07; US-1, US-10)
*Rationale:* The confirmed version records what a user actually checked. Stored outside items, confirming changes no versions and cannot cascade.

**TE-03** The engine shall flag a link as suspect when its target's version differs from the confirmed one, and show what changed. (CR-07, CR-09; US-10, US-11)
*Rationale:* Suspect links are the tool's core signal; showing the change lets users quickly judge whether it matters.

**TE-05** The engine shall list the items, links and verification evidence affected by a change. (CR-13; US-10)
*Rationale:* Impact must be known before approving a change, both locally and in CI, so the analysis belongs in the engine.

**TE-06** The engine shall report requirements without verifying tests, suspect test evidence, and unallocated requirements. (CR-09, CR-10; US-5, US-11)
*Rationale:* Coverage gaps and stale evidence are what reviews look for first.

## CLI (CL)

**CL-01** The CLI shall expose validation, search, editing, impact analysis and reports. (CR-04–CR-07, CR-09, CR-10, CR-13; US-1, US-2, US-5, US-8–US-11)
*Rationale:* A CLI makes every function scriptable and usable in CI and on rigs without an editor.

**CL-02** The CLI shall create items from type templates. (CR-04; US-2)
*Rationale:* Templates give new items a valid structure, reducing manual errors and review effort.

**CL-03** The CLI shall record test runs of test cases with SUT version, results and logs. (CR-09; US-5)
*Rationale:* Automated tests run on CI and HIL rigs without an editor and must report their results directly.

**CL-05** The CLI shall offer machine-readable output and fail with non-zero exit codes. (CR-19; US-5, US-8)
*Rationale:* Scripts and CI need parseable results and reliable failure signals.

## VS Code extension (VS)

**VS-01** The extension shall create and edit items in forms validated while typing. (CR-04; US-1, US-2, US-5)
*Rationale:* Engineers should not need to know the YAML schemas; forms with live validation lower the entry barrier.

**VS-02** The extension shall show the product tree of the repository. (CR-02, CR-05; US-2)
*Rationale:* The product tree is how engineers think about the product and is their main navigation.

**VS-03** The extension shall show an item's requirements as a readable document with their traceability, verification coverage and suspect links. (CR-05, CR-06, CR-09, CR-10; US-1, US-5)
*Rationale:* Requirements engineers review requirements as documents; links, tests and coverage next to each requirement make the document the traceability matrix and the place to resolve gaps.

**VS-04** The extension shall show an item's links with their suspect state and let users re-confirm them. (CR-06, CR-07; US-10)
*Rationale:* Suspects are resolved where the engineer works, without switching tools.

**VS-06** The extension shall let users enter manual test results. (CR-09; US-5)
*Rationale:* Not every test is automated; manual results need the same traceable record.
