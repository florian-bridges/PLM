# Requirements

Each requirement cites the scenario (US) it serves.

**CR-01 — Engineering definition**
The tool shall represent the complete definition of a product, including its structure, software and requirements. (US-1, US-2)
*Rationale:* Disciplines kept in separate tools hide the dependencies between them.

**CR-02 — Hierarchical composition**
Engineering items shall be composable into an arbitrary hierarchical product structure. (US-2)
*Rationale:* Products are developed top-down from system to equipment; a fixed number of levels would not fit every product or program.

**CR-03 — Engineering artifacts**
The tool shall collect development artifacts (designs, software, documents, analyses, test results) and associate them with items. (US-2, US-5, US-8)
*Rationale:* The artifacts are the actual engineering work. Associating them with items lets users find the current design, analysis or test result of any item.

**CR-04 — Authoring**
The tool shall let users create and edit items, artifacts and relationships. (US-1, US-2)
*Rationale:* Engineers maintain the definition throughout development.

**CR-05 — Search and navigation**
The tool shall let users find, browse and view items, artifacts and their relationships. (US-10, US-11)
*Rationale:* A product comprises many items; without search and navigation, users cannot find what to reuse, change or review.

**CR-06 — Traceability**
The tool shall trace items and artifacts using typed relationships. (US-1, US-2)
*Rationale:* Typed links state what each relationship means, so traceability between requirements, design and verification can be shown.

**CR-07 — Versioned traceability**
Relationships shall reference specific versions of the related items. (US-10)
*Rationale:* A link is only valid for the version it was established against. Without versions, changes silently invalidate traceability.

**CR-09 — Verification**
The tool shall associate verification evidence with the item versions it verifies and identify when later versions are no longer verified. (US-5)
*Rationale:* Evidence is only valid for the version it was produced against; later changes must be detected to decide on re-verification.

**CR-10 — Reporting**
The tool shall report traceability, verification coverage and compliance status for the product or any item in it. (US-11)
*Rationale:* Reviews assess status for the product and its parts: what is traced, verified and shown compliant.

**CR-12 — Release**
The tool shall release changes by merging them into a protected branch, track item maturity and retrieve any earlier released definition. (US-11)
*Rationale:* Each merge is a reviewed, immutable reference for partners, without freezing items while the rest of the product evolves. Maturity tells users whether an item may be relied upon.

**CR-13 — Change management**
The tool shall support issues and change requests and identify affected items, artifacts, requirements and verification evidence. (US-10)
*Rationale:* Uncontrolled change is a main source of configuration errors. Knowing the affected items and evidence lets changes be assessed.

**CR-14 — Reviews and findings**
The tool shall record a review and its findings on an item and let users query open findings. (US-9)
*Rationale:* Findings need to be tracked to closure and routed to the right owner.

**CR-18 — Ownership**
The tool shall assign each item a responsible owner and let users list items by owner. (US-11)
*Rationale:* Suspect links and changes need someone to act on them; owners make responsibility explicit.

**CR-19 — Automation**
The tool shall provide its functions to scripts and external tools. (US-5, US-8)
*Rationale:* Automated rigs and analysis scripts produce and consume engineering data; automation removes manual transfer and its errors.
