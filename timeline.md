# Timeline

Milestones (target states, each with a check that shows it is reached), their budgets in 5-hour usage windows, the releases made in them and the active milestone. Budgets are set by the owner. The chief engineer keeps it current (skill `tower:chief-engineer`, The record); the shift reads the lines of the active milestone.

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
| 0.12 | 3 | 0 | active (meeting #121) |

Roadmap set by the owner in the backlog cleanup of 2026-11-14; each milestone is a GitHub milestone holding its issues. Standing directions for every feature: PLM holds product data only, no project management (#64); use by LLM agents is a strength to keep and document (#54).

## Active milestone

**Next milestone: 0.12 "Cleanup".**
What PLM has built so far is clean: six cleanups decided in meeting #121 and a general check and cleanup of the whole project (bugs, dead or duplicated code, unneeded requirements and tests, outdated docs).
Check: the six issues closed; one whole-project review by `reviewer` with no blocking findings left; `scripts/check.sh` passes; released as 0.12.
Budget: 3 windows.
### Entry conditions
- [ ] #125 Mermaid graph shows nesting: done when CL-01.10 names nesting edges, output and test match
- [ ] #126 report document: one validate run, no empty findings line: done when CL-01.9 code and test match
- [ ] #128 report connections rows without detail: done when TE-06.6, code and test drop `detail`
- [ ] #123 Requirements document links render in VS Code Markdown Preview: done when links are workspace-relative and tested
- [ ] #129 PLM documented for agents: done when the help is the complete reference, `docs/setup.md` exists, README is short and `check.sh` fails on missing help text
- [ ] #127 Normal spacing for squashed lines in src/cli.ts: done when no squashed lines remain (after PR #122)
- [ ] #130 Whole-project check and cleanup: done when `reviewer` reviewed the whole project and no blocking findings are left
- [ ] Release 0.12: done when released with `check.sh` passing

Breakdown: the six decided cleanups one issue each; the whole-project cleanup and the release as their own conditions; #127 waits for PR #122 (owner's word-count change).

### Coming owner meetings

* None.

## Planned milestones

* **Parked, no milestone:** #61 requirements exchange (until a project exchanges requirements), #55 MCP server (until an agent use without a shell).
