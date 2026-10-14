# PLM

## Word limits

Word counts are capped:

| Folder | Limit |
|---|---|
| `documents/` | 5000 |
| `src/` + `test/` | 4100 |
| `extension/` | 1700 |

Check with `python3 scripts/wordcount.py --max-docs 5000 --max-src 4100 --max-ext 1700 -u` (`-v` lists per-file counts). Run it before every commit; a change that exceeds a limit is not done.

Make every change in as few words as possible: reuse existing code and text, don't restate what another requirement, comment or test already says, and prefer deleting to adding.

## Requirements and traceability

`documents/` holds a hierarchy:

1. `scenarios.md` (US-n) and `requirements.md` (CR-nn): user scenarios and tool requirements
2. `components.md` (CO, TE, CL, VS, CI, SI-nn): component requirements, each citing the CR and US it serves
3. `low-level-requirements.md` (XX-nn.m): refines component requirement XX-nn

* Every requirement traces to its parent level; none may exist without one.
* Code relates to a requirement: a `// XX-nn.m` comment on the function or block that implements it. Code that implements no requirement is removed, or a requirement is added first.
* Tests test only what requirements state, and name the IDs they cover: `test('TE-01.1: ...')`.
* IDs of removed requirements are not reused or renumbered.

## Scope

**PLM is a general tool.** It serves any product that is split into subsystems with their own requirements, tests and items, not one project. No code, requirement, test or document names a project, its item kinds, folders or tooling; what varies by project is configuration in `plm.yaml` with a default. Example data in tests and documents is neutral. Projects that use PLM (such as `autonomous-fixed-wing`) are sources of needs, not of specifications: generalise the need before building it.

Keep the tool tight: implement only what the scenarios need. For every feature, ask whether it can be dropped or merged into an existing one, and propose that before adding to it. When a change touches a requirement, update requirement, code and test together.

## Commits

Commit messages do not include a `Co-Authored-By: Claude` line or any other Claude attribution.

## Agents

Use the agents in `.claude/agents/`. Start `quality` together with `requirements-author`; it frees words before new ones are written and reviews drafts, plans and diffs as the other agents send them. Split implementation into streams touching disjoint files and run one `implementer` per stream in parallel, each in its own worktree; merge and commit stream by stream, then let `quality` do a final pass.
