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
| 0.10 | 3 | 3 | done (v0.10.0, meetings #100, #107) |
| 0.11 | 2 | 1 | done (v0.11.0, meeting #110) |

Roadmap set by the owner in the backlog cleanup of 2026-11-14; each milestone is a GitHub milestone holding its issues. Standing directions for every feature: PLM holds product data only, no project management (#64); use by LLM agents is a strength to keep and document (#54).

## Active milestone

**Next milestone: 0.11.** Change, status and graph.

Budget: 2 windows.

Scope decided in release meeting #110 (2026-11-21, `meetings/2026-11-21-release-0.10.md`).

### Entry conditions

- [x] #111 Structure diff in `impact`. *Done when:* TE-05.4 is implemented and tested; `scripts/check.sh` passes.
- [x] #112 Status counts in the requirements document. *Done when:* CL-01.9 is implemented and tested; `scripts/check.sh` passes.
- [x] #113 Mermaid graph of `show --down/--up`. *Done when:* CL-01.10 and the US-2 clause are in place, implemented and tested; `scripts/check.sh` passes.

### Active topics

* #111 (PR #115), #112 (PR #117), #113 (PR #116) merged; v0.11.0 released (PR #118); #67 closed.
* #114 (owner, bug: items under a folder without `item.yaml` not top-level): building on `feat/transparent-top`, release 0.11.1.
* #114 bug fix on `feat/top-level-items`, for patch 0.10.1.

### Coming owner meetings

* Release meeting after 0.11.1 (no decided milestone left).

## Planned milestones

* **Parked, no milestone:** #61 requirements exchange (until a project exchanges requirements), #55 MCP server (until an agent use without a shell).
