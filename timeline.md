# Timeline

Milestones (usually releases), their budgets in 5-hour usage windows and the active milestone. Budgets are set by the owner. The chief engineer keeps it current (skill `chief-engineer`, Your files); the shift reads the lines of the active milestone.

## Overview

| Milestone | Budget | Used | State |
|---|---|---|---|
| 0.3.0 | — | — | done (released 2026-11-11) |
| 0.4 | 3 | 1 | done (v0.4.0, meeting #77) |
| 0.5 | 4 | 0 | active |
| 0.6 | — | — | planned |
| 0.7 | — | — | planned |
| 0.8 | — | — | planned |
| 0.9 | — | — | planned |

Roadmap set by the owner in the backlog cleanup of 2026-11-14; each milestone is a GitHub milestone holding its issues. Standing directions for every feature: PLM holds product data only, no project management (#64); use by LLM agents is a strength to keep and document (#54).

## Active milestone

**Next milestone: 0.5.** Agent interface.

Budget: 4 windows.

Scope decided in meeting #77 (option A). Each feature adds a command or interface, so #58, #63, #57 and #55 go through the 0.5 feature review first; #60 is documentation only.

### Entry conditions

- [ ] #58 The effective schema (types, prefixes, fields, required fields, link types) in machine-readable form. *Done when* one command prints it as JSON, with a test.
- [ ] #63 Trace queries, with #56 folded in. *Done when* `plm trace <ID>` walks links up or down to a given depth, depth 1 being the item's context view, text and JSON, with tests.
- [ ] #57 Atomic changes with a dry run. *Done when* a change file is applied all or nothing, a dry run shows the result without writing, with tests.
- [ ] #55 MCP server. *Done when* an MCP client lists and calls PLM commands as typed tools, with a test.
- [ ] #60 CI integration as documentation. *Done when* the README has a CI section with a generic script on `validate`, `impact` and `suspects`.

### Active topics

* 0.5 feature review: prepare for #58, #63, #57, #55.

### Coming owner meetings

* 0.5 feature review (being prepared).

## Planned milestones

* **0.6 Interfaces between subsystems:** #29 ports and connections, #30 directed port types, #31 connections report.
* **0.7 Releases and change control:** #45 item revisions, #46 baselines, #59 change requests, #66 consistency of related changes and merges, #2 HTML view and generated documents.
* **0.8 Product structure and configurations:** #40 occurrences and quantities, #42 BOM views, #43 variants and effectivity, #65 queries at scale.
* **0.9 UI redesign** once the backend is stable: #67.
* **Backlog, no milestone:** #61 requirements import and export (ReqIF, CSV).
