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
| 0.11 | 2 | 0 | active (meeting #110) |

Roadmap set by the owner in the backlog cleanup of 2026-11-14; each milestone is a GitHub milestone holding its issues. Standing directions for every feature: PLM holds product data only, no project management (#64); use by LLM agents is a strength to keep and document (#54).

## Active milestone

**Next milestone: 0.11.** Change, status and graph.

Budget: 2 windows.

Scope decided in release meeting #110 (2026-11-21, `meetings/2026-11-21-release-0.10.md`).

### Entry conditions

- [ ] #111 Structure diff in `impact`. *Done when:* TE-05.4 is implemented and tested; `scripts/check.sh` passes.
- [ ] #112 Status counts in the requirements document. *Done when:* CL-01.9 is implemented and tested; `scripts/check.sh` passes.
- [ ] #113 Mermaid graph of `show --down/--up`. *Done when:* CL-01.10 and the US-2 clause are in place, implemented and tested; `scripts/check.sh` passes.

### Active topics

* #111, #112, #113 being built in parallel worktrees.

### Coming owner meetings

* Release meeting after 0.11 (no decided milestone left).

## Planned milestones

* **After 0.11:** #67 closes; no UI work of it left.
* **Parked, no milestone:** #61 requirements exchange (until a project exchanges requirements), #55 MCP server (until an agent use without a shell).
