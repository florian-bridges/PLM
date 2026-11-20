# Timeline

Milestones (usually releases), their budgets in 5-hour usage windows and the active milestone. Budgets are set by the owner. The chief engineer keeps it current (skill `chief-engineer`, Your files); the shift reads the lines of the active milestone.

## Overview

| Milestone | Budget | Used | State |
|---|---|---|---|
| 0.3.0 | — | — | done (released 2026-11-11) |
| 0.4 | 3 | 1 | done (v0.4.0, meeting #77) |
| 0.5 | 4 | 2 | done (v0.5.0, meeting #85) |
| 0.6 | 3 | 1 | done (v0.6.0) |
| 0.7 | 1 | 0 | active (meeting #90) |
| 0.8 | 4 | 0 | decided (meeting #90) |
| 0.9 | — | — | planned |

Roadmap set by the owner in the backlog cleanup of 2026-11-14; each milestone is a GitHub milestone holding its issues. Standing directions for every feature: PLM holds product data only, no project management (#64); use by LLM agents is a strength to keep and document (#54).

## Active milestone

**Next milestone: 0.7.** Releases and documents.

Budget: 1 window.

Scope decided in release meeting #90 (2026-11-20): #45 option B, #2 option B; #46, #59, #66, #65 no-go. Order: #45, then #2. Dropping `detail` from `report connections` rows and #87: the chief engineer decides, only within this window.

### Entry conditions

- [x] #45 Released items stay as released. *Done when* `plm impact` lists `released` items whose own files changed without a status change, exit 1 if any (TE-05.3), with tests; README paragraph "Revisions and baselines".
- [ ] #2 `plm report document`. *Done when* `plm report document [<item>]` prints the VS-03.1 document as Markdown without the Review link (CL-01.8), the function shared with the extension, with tests.

### Active topics

* #45 merged (PR #93). #2 in progress (`feat/report-document`). Backlog from review: #94 (neutral test data). Feature review of #40 and #43 prepared (#92).

### Coming owner meetings

* #92 Feature review of #40 and #43 (0.8): `meetings/2026-11-20-feature-review-0.8.md`; needed before 0.8 starts.

## Planned milestones

* **0.8 Product structure and configurations**, decided (meeting #90), budget 4 windows including the feature review:
  - [ ] #40 Occurrences and quantities (with #42's README paragraph on BOM views). *Done when* set in the feature review: a `uses` entry may be `{item, quantity, ref, …}` besides an ID; #66's rules for occurrences.
  - [ ] #43 Variants and effectivity. *Done when* set in the feature review: `uses` entries gain applicability conditions on parameters declared in `plm.yaml`, `--config <param>=<value>` for show and report, validate reports ambiguous or empty selections; #66's rules for configurations.
* **0.9 UI redesign**, not planned: #67.
* **Backlog, no milestone:** #61 requirements import and export (ReqIF, CSV), #55 MCP server (#78), #87.
