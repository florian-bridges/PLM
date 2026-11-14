# PLM

## Word governance

The aim: no code or documentation that nothing needs, no text with little content, no two pieces of code with similar functionality. Make every change in as few words as possible: reuse existing code and text, don't restate what another requirement, comment or test already says, and prefer deleting to adding.

`scripts/check.sh` enforces the word limits (the defaults in `scripts/wordcount.py`) and the traces (`scripts/trace.py`); the `reviewer` agent judges every feature against the aim and alone may raise a limit, with a stated reason. A change that fails either is not done.

## Requirements and traceability

`documents/` holds a hierarchy:

1. `scenarios.md` (US-n) and `requirements.md` (CR-nn): user scenarios and tool requirements
2. `components.md` (CO, TE, CL, VS-nn): component requirements, each citing the CR and US it serves
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

Work is feature-driven: one feature is one GitHub issue (`type:feature`: the scenario it serves, what the user can do afterwards, a *done when*, the requirement IDs and files it touches), one branch `feat/<name>` in its own worktree and one pull request into `develop`.

* `feature-dev` builds the feature end to end: low-level requirements, code, tests, until `scripts/check.sh` passes. A large feature may be split into parts touching disjoint files, one `feature-dev` each in its own worktree on a branch `feat/<name>-<part>`, merged into the feature branch part by part.
* `reviewer` reviews the finished branch once, applies behaviour-preserving cuts and proposes removals.
* Read narrowly: `python3 scripts/trace.py <ID>` shows where an ID is defined, implemented and tested; read those lines, not whole documents. `concepts/` holds past plans: read it only when the brief names it.
