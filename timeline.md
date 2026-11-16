# Timeline

Milestones (usually releases), their budgets in 5-hour usage windows and the active milestone. Budgets are set by the owner. The chief engineer keeps it current (skill `chief-engineer`, Your files); the shift reads the lines of the active milestone.

## Overview

| Milestone | Budget | Used | State |
|---|---|---|---|
| 0.3.0 | — | — | done (released 2026-11-11) |
| 0.4 | 3 | 0 | active |
| 0.5 | — | — | planned |
| 0.6 | — | — | planned |
| 0.7 | — | — | planned |
| 0.8 | — | — | planned |
| 0.9 | — | — | planned |

Roadmap set by the owner in the backlog cleanup of 2026-11-14; each milestone is a GitHub milestone holding its issues. Standing directions for every feature: PLM holds product data only, no project management (#64); use by LLM agents is a strength to keep and document (#54).

## Active milestone

**Next milestone: 0.4.** Findings from real use and scope.

Budget: 3 windows.

Already on `develop` and unreleased, shipping with 0.4: #26–#28 type files (breaking: the CHANGELOG gives the conversion tables) and #19 parameter citations in `text`.

### Entry conditions

- [x] #64 Product data only: no gates, milestones, meetings or due dates in scenarios, requirements, README or code; the rule stands in `CLAUDE.md` Scope. *Done when* the grep in the issue finds nothing.
- [x] #54 Use by LLM agents: a US entry in `documents/scenarios.md` and a README section. *Done when* both exist, built on existing commands.
- [x] #36 `plm new` writes block style whatever the template's style. *Done when* a flow-style template gives a block-style item, with a test.
- [x] #35 An enum finding lists the allowed values. *Done when* text and JSON output name them, with a test.
- [x] #33 Allocation: a requirement can be retained at its level with a reason; only links from the subtree below count. *Done when* the report shows `retained` and ignores sibling links.
- [x] #9 A test run can be confirmed against a newer system-under-test version with a reason. *Done when* the run is current again without a rerun.
- [x] #20 Projects define their own link types. *Done when* a declared `mitigates` link is accepted, others refused, and uncovered targets can be listed.

### Active topics

* Feature review #71 held 2026-11-16: go for #54, #33, #9, #20 (A with the reviewer's cuts). #54 (#72), #9 (#73), #33 (#74) merged. #20 being built (`feat/link-types`).

### Coming owner meetings

* None. The release meeting follows the 0.4 release.

## Planned milestones

* **0.5 Agent interface:** #58 schema in machine-readable form, #56 context view of an item, #63 trace queries, #57 atomic changes with dry run, #55 MCP server, #60 CI integration.
* **0.6 Interfaces between subsystems:** #29 ports and connections, #30 directed port types, #31 connections report.
* **0.7 Releases and change control:** #45 item revisions, #46 baselines, #59 change requests, #66 consistency of related changes and merges, #2 HTML view and generated documents.
* **0.8 Product structure and configurations:** #40 occurrences and quantities, #42 BOM views, #43 variants and effectivity, #65 queries at scale.
* **0.9 UI redesign** once the backend is stable: #67.
* **Backlog, no milestone:** #61 requirements import and export (ReqIF, CSV).
