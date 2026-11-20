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
| 0.8 | 4 | 0 | active (meetings #90, #92) |
| 0.9 | — | — | planned |

Roadmap set by the owner in the backlog cleanup of 2026-11-14; each milestone is a GitHub milestone holding its issues. Standing directions for every feature: PLM holds product data only, no project management (#64); use by LLM agents is a strength to keep and document (#54).

## Active milestone

**Next milestone: 0.8.** Product structure and configurations.

Budget: 4 windows.

Scope decided in release meeting #90 (2026-11-20); details in feature review #92 (2026-11-20). Requirements applied to `documents/`.

### Entry conditions

- [ ] #40 Occurrences and quantities. *Done when:* `uses` entries may be `{item, quantity, ref, …}` besides IDs, plain-ID repositories keep their versions; `validate` reports bad entries and `ambiguous-use` (CO-02.12), also after a merge (#66); changing an entry changes the assembly's version, not the part's; `plm report parts [<item>]` (CO-03.4) totals quantities; README paragraph on BOM views (#42); `scripts/check.sh` passes.
- [ ] #43 Variants and effectivity. *Done when:* `config` in `plm.yaml` (lists or `ordered`), `when` on `uses` entries and the global `--config` make every walk through `uses` follow only selected entries (CO-01.6); `validate` reports `config` and, under every configuration, `ambiguous-use` and `empty-use`, also after a merge (#66); versions read every entry; README paragraph on configurations; `scripts/check.sh` passes.

### Active topics

* #40 in progress: `feature-dev` on `feat/occurrences`, then `reviewer`. Then #43 on `feat/variants`.

### Coming owner meetings

* None until 0.8's entry conditions are ticked (release meeting: 0.9 is not planned).

## Planned milestones

* **0.9 UI redesign**, not planned: #67.
* **Backlog, no milestone:** #61 requirements import and export (ReqIF, CSV), #55 MCP server (#78), #87, #94.
