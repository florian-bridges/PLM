# Timeline

Milestones (usually releases), their budgets in 5-hour usage windows and the active milestone. Budgets are set by the owner. The chief engineer keeps it current (skill `chief-engineer`, Your files); the shift reads the lines of the active milestone.

## Overview

| Milestone | Budget | Used | State |
|---|---|---|---|
| 0.3.0 | — | — | done (released 2026-11-11) |
| 0.4 | 3 | 1 | done (v0.4.0, meeting #77) |
| 0.5 | 4 | 2 | done (v0.5.0, meeting #85) |
| 0.6 | 3 | 1 | done (v0.6.0, meeting #85) |
| 0.7 | 1 | 1 | done (v0.7.0, meeting #90) |
| 0.8 | 4 | 3 | done (v0.8.0, meetings #90, #92) |
| 0.9 | 2 | 1 | done (v0.9.0, meeting #100) |
| 0.10 | 3 | 2 | done (v0.10.0, meetings #100, #107) |

Roadmap set by the owner in the backlog cleanup of 2026-11-14; each milestone is a GitHub milestone holding its issues. Standing directions for every feature: PLM holds product data only, no project management (#64); use by LLM agents is a strength to keep and document (#54).

## Active milestone

**Next milestone: 0.10.** UI views.

Budget: 3 windows.

Scope decided in release meeting #100 (2026-11-21, `meetings/2026-11-20-release-0.8.md`, 3.1 "0.10 views").

### Entry conditions

- [x] #102 UI views (#67 part 2). *Done when:* VS-03.5, VS-04.5 and VS-06.2 are implemented and tested; the document webview (VS-03.1–VS-03.4) and the VS-06.1 command removed; `scripts/check.sh` passes.

### Active topics

* #102 merged (PR #108); v0.10.0 released (PR #109).

### Coming owner meetings

* Release meeting #110 (`meetings/2026-11-21-release-0.10.md`): structure diff, overview, graph (#67); next milestone and budget.

## Planned milestones

* **Later, next release meeting:** whole-product graph, structure diff, overview (#67).
* **Parked, no milestone:** #61 requirements exchange (until a project exchanges requirements), #55 MCP server (until an agent use without a shell).
