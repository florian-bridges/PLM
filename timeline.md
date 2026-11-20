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
| 0.8 | 4 | 0 | active (meeting #90) |
| 0.9 | — | — | planned |

Roadmap set by the owner in the backlog cleanup of 2026-11-14; each milestone is a GitHub milestone holding its issues. Standing directions for every feature: PLM holds product data only, no project management (#64); use by LLM agents is a strength to keep and document (#54).

## Active milestone

**Next milestone: 0.8.** Product structure and configurations.

Budget: 4 windows.

Scope decided in release meeting #90 (2026-11-20): #40 option B (with #42's README paragraph), then #43 option B, both go in principle; architecture changes, so their details are decided in feature review #92 before work starts; the budget includes it.

### Entry conditions

- [ ] #40 Occurrences and quantities. *Done when* set in feature review #92: a `uses` entry may be `{item, quantity, ref, …}` besides an ID; #66's rules for occurrences; README paragraph on BOM views (#42).
- [ ] #43 Variants and effectivity. *Done when* set in feature review #92: `uses` entries gain applicability conditions on parameters declared in `plm.yaml`, `--config <param>=<value>`, validate reports ambiguous or empty selections; #66's rules for configurations.

### Active topics

* 0.7 released as v0.7.0 (PR #96; #45 PR #93, #2 PR #95). 0.8 waits for feature review #92.

### Coming owner meetings

* #92 Feature review of #40 and #43: `meetings/2026-11-20-feature-review-0.8.md`; needed before 0.8 starts.

## Planned milestones

* **0.9 UI redesign**, not planned: #67.
* **Backlog, no milestone:** #61 requirements import and export (ReqIF, CSV), #55 MCP server (#78), #87, #94.
