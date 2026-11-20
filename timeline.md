# Timeline

Milestones (usually releases), their budgets in 5-hour usage windows and the active milestone. Budgets are set by the owner. The chief engineer keeps it current (skill `chief-engineer`, Your files); the shift reads the lines of the active milestone.

## Overview

| Milestone | Budget | Used | State |
|---|---|---|---|
| 0.3.0 | — | — | done (released 2026-11-11) |
| 0.4 | 3 | 1 | done (v0.4.0, meeting #77) |
| 0.5 | 4 | 2 | done (v0.5.0, meeting #85) |
| 0.6 | 3 | 0 | active |
| 0.7 | — | — | planned |
| 0.8 | — | — | planned |
| 0.9 | — | — | planned |

Roadmap set by the owner in the backlog cleanup of 2026-11-14; each milestone is a GitHub milestone holding its issues. Standing directions for every feature: PLM holds product data only, no project management (#64); use by LLM agents is a strength to keep and document (#54).

## Active milestone

**Next milestone: 0.6.** Interfaces between subsystems.

Budget: 3 windows.

Scope decided in release meeting #85 (2026-11-20): #29 option A, #30 folded into #31, #31 option A without `mixed`. Order: #29, then #31.

### Entry conditions

- [ ] #29 Ports and connections. *Done when* built-in `port` and `connection` types, `connects`, `implements` to a connection, and `files` schemas checked by `validate`, with tests.
- [ ] #31 `plm report connections` with #30. *Done when* `plm report connections [<item>]` lists `open`, `few` and `senders`, text and JSON, exit 1 if any, with tests.
- [ ] README section "Ports and connections" (#31). *Done when* the README covers port and connection types, `connects`, `files` schemas, `role` and the report.

### Active topics

* #29 in progress: `feature-dev` on `feat/ports`.

### Coming owner meetings

* None.

## Planned milestones

* **0.7 Releases and change control:** #45 item revisions, #46 baselines, #59 change requests, #66 consistency of related changes and merges, #2 HTML view and generated documents.
* **0.8 Product structure and configurations:** #40 occurrences and quantities, #42 BOM views, #43 variants and effectivity, #65 queries at scale.
* **0.9 UI redesign** once the backend is stable: #67.
* **Backlog, no milestone:** #61 requirements import and export (ReqIF, CSV), #55 MCP server (#78).
