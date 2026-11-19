# Timeline

Milestones (usually releases), their budgets in 5-hour usage windows and the active milestone. Budgets are set by the owner. The chief engineer keeps it current (skill `chief-engineer`, Your files); the shift reads the lines of the active milestone.

## Overview

| Milestone | Budget | Used | State |
|---|---|---|---|
| 0.3.0 | — | — | done (released 2026-11-11) |
| 0.4 | 3 | 1 | done (v0.4.0, meeting #77) |
| 0.5 | 4 | 1 | done (v0.5.0) |
| 0.6 | — | — | planned |
| 0.7 | — | — | planned |
| 0.8 | — | — | planned |
| 0.9 | — | — | planned |

Roadmap set by the owner in the backlog cleanup of 2026-11-14; each milestone is a GitHub milestone holding its issues. Standing directions for every feature: PLM holds product data only, no project management (#64); use by LLM agents is a strength to keep and document (#54).

## Active milestone

**Next milestone: 0.5.** Agent interface.

Budget: 4 windows.

Scope decided in meeting #77 (option A); feature review #78 held 2026-11-19: #58, #63, #57 go with option A and the reviewer's corrections, #55 to the backlog.

### Entry conditions

- [x] #58 The effective schema (types, prefixes, fields, required fields, link types) in machine-readable form. *Done when* one command prints it as JSON, with a test.
- [x] #63 Trace queries, with #56 folded in. *Done when* `plm trace <ID>` walks links up or down to a given depth, depth 1 being the item's context view, text and JSON, with tests.
- [x] #57 Atomic changes with a dry run. *Done when* a change file is applied all or nothing, a dry run shows the result without writing, with tests.
- [x] #60 CI integration as documentation. *Done when* the README has a CI section with a generic script on `validate`, `impact` and `suspects`.

### Active topics

* #60 merged (PR #79), #58 merged (PR #81). #63 merged (PR #82), #57 merged (PR #83). Released as v0.5.0 (PR #84). Next milestone and budget: release meeting (owner).

### Coming owner meetings

* Release meeting 0.5 / next milestone 0.6: in preparation (`meetings/2026-11-19-release-0.5.md`).

## Planned milestones

* **0.6 Interfaces between subsystems:** #29 ports and connections, #30 directed port types, #31 connections report.
* **0.7 Releases and change control:** #45 item revisions, #46 baselines, #59 change requests, #66 consistency of related changes and merges, #2 HTML view and generated documents.
* **0.8 Product structure and configurations:** #40 occurrences and quantities, #42 BOM views, #43 variants and effectivity, #65 queries at scale.
* **0.9 UI redesign** once the backend is stable: #67.
* **Backlog, no milestone:** #61 requirements import and export (ReqIF, CSV), #55 MCP server (#78).
