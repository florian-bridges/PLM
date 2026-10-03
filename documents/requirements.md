# Requirements

**CR-01 — Engineering definition**
The tool shall represent the complete engineering definition of an aircraft: structure, systems, software, electrical, EWIS, requirements and other engineering items.
*Rationale:* Certification requires a complete, consistent type design. Disciplines kept in separate tools hide the dependencies between them.

**CR-02 — Hierarchical composition**
Engineering items shall be composable into an arbitrary hierarchical product structure.
*Rationale:* Aircraft are developed top-down from aircraft to systems to equipment; a fixed number of levels would not fit every product or program.

**CR-03 — Engineering artifacts**
The tool shall collect development artifacts (CAD, software, documents, analyses, test results) and associate them with items.
*Rationale:* The artifacts are the actual engineering work. Associating them with items lets users find the current CAD, analysis or test result of any item.

**CR-04 — Authoring**
The tool shall let users create, edit and retire items, artifacts and relationships.
*Rationale:* Engineers maintain the definition throughout development. Retiring instead of deleting keeps links in earlier releases valid.

**CR-05 — Search and navigation**
The tool shall let users find, browse and view items, artifacts and their relationships.
*Rationale:* An aircraft comprises thousands of items; without search and navigation, engineers cannot find what to reuse, change or review.

**CR-06 — Traceability**
The tool shall trace items and artifacts using typed relationships.
*Rationale:* Development assurance (ARP4754A, DO-178C, DO-254) requires traceability between requirements, design and verification. Typed links state what each relationship means.

**CR-07 — Versioned traceability**
Relationships shall reference specific versions of the related items.
*Rationale:* A link is only valid for the version it was established against. Without versions, changes silently invalidate traceability.

**CR-08 — External sources**
The tool shall trace items and artifacts managed in other repositories or tools.
*Rationale:* Software, supplier and analysis data live in their own repositories and tools; tracing must reach them without copying.

**CR-09 — Verification**
The tool shall associate verification evidence with the item versions it verifies and identify when later versions are no longer verified.
*Rationale:* Certification credit depends on evidence for the exact version certified. Changes after a test must be detected to decide on re-verification.

**CR-10 — Reporting**
The tool shall report traceability, verification coverage and compliance status for the product or any item in it.
*Rationale:* Program reviews and certification authorities assess status for the aircraft and its systems: what is traced, verified and shown compliant.

**CR-12 — Release**
The tool shall release changes by merging them into a protected branch, track item maturity and retrieve any earlier released definition.
*Rationale:* Each merge is a reviewed, immutable reference for partners and certification, without freezing items while the rest of the product evolves. Maturity tells users whether an item may be relied upon.

**CR-13 — Change management**
The tool shall support issues and change requests and identify affected items, artifacts, requirements and verification evidence.
*Rationale:* Uncontrolled change is a main source of configuration errors. Knowing the affected items and evidence lets changes be assessed before approval.

**CR-14 — Review and approval**
The tool shall require changes to be reviewed and approved before release.
*Rationale:* Certification and quality standards demand independent review of changes. Approval before release keeps unchecked data from becoming the reference.

**CR-15 — History**
The tool shall preserve the history of engineering decisions, changes, configurations and artifacts, including who made each change, when and why.
*Rationale:* Authorities and accident investigations may ask years later why a design decision was taken. Recording who, when and why answers them.

**CR-17 — Access control**
The tool shall control who can read and change engineering data.
*Rationale:* Aerospace data is subject to export control (ITAR, EAR) and intellectual property agreements; partners must see only what they are entitled to.

**CR-18 — Ownership**
The tool shall assign each item a responsible owner and notify owners when their items are affected by a change.
*Rationale:* Suspect links and changes need someone to act on them. Owners make responsibility explicit and allow reviews to be routed.

**CR-19 — Automation**
The tool shall provide its functions to scripts and external tools.
*Rationale:* Test rigs, CI and analysis scripts produce and consume engineering data; automation removes manual transfer and its errors.
