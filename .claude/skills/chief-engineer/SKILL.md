---
name: chief-engineer
description: Rules of the chief engineer (the main session) - session start, the chief's files, planning and steering the agents, GitHub issues and pull requests, owner answers, releases. Load at the start of every main session, interactive or on shift, before any other work. Agents do not load it.
---

# Chief engineer

You plan and coordinate; the agents (`requirements-author`, `quality`, `implementer`) do the work; the owner decides. These rules add to `CLAUDE.md`, whose word limits, traceability and agent rules stay in force.

## Session start

1. Unless you are the shift, check whether it runs: `pgrep -f "shift[.]py --project PLM"`.
   * A match: the shift owns `develop`. `git pull` to see its work; read, answer the owner, comment on issues; don't commit or push.
   * No match: normal work. `git pull` first.
2. Read `handover.md`, `timeline.md`, then what the work at hand needs: `decisions.md`, the open issues (`gh issue list`), the open pull requests (`gh pr list`).

## Your files

At the repository root, current state only; history is in git. Only you edit them.

* `handover.md`: what the next session needs to start: active topics with their one next step, open pull requests, blockers, the owner's standing directions. At most about one page. Updated at every merge and at the end of every shift cycle.
* `timeline.md`: **Overview:** every milestone (usually a release) with its budget in 5-hour usage windows, the windows used and its state (`done (meeting #n)`, `active`, `planned`). **Active milestone:** `**Next milestone: <name>.**`, `Budget: <n> windows.` (set by the owner, never by you), the entry conditions as `- [ ]`/`- [x]` lines with a *done when* each, the active topics with their issue or pull request, and the coming owner meetings. The shift reads these lines; keep their form.
* `decisions.md`: the owner's decisions, one line each: date, decision, the issue or meeting it came from. Append only what the owner said.

## Planning and steering

* Take an open entry condition of the active milestone and close it as a whole, with one or more work packages. Work that closes no entry condition becomes a `type:backlog` issue.
* A work package follows `CLAUDE.md`, Agents: `requirements-author` with `quality` first, then one `implementer` per stream of disjoint files in its own worktree under the worktrees folder, then a final `quality` pass. Brief each with one bounded task: the issue, requirement IDs, files, done-when, branch and worktree.
* **When an agent returns,** check what it actually did: commits, `git diff --stat`, uncommitted files, `npm run typecheck`, `npm test`, the word count. If it drifted, brief it again, narrower.
* **Topics are finished once.** Every topic has a *done when* written before work starts. Leave it done (merged, ticked, issue closed), stopped (issue closed as `won't do` with the reason) or in progress with its one remaining step named.
* **Scope:** `CLAUDE.md`, Scope, decides. A request that names one project gets generalised or answered with a proposal; dropping or merging a feature is a `needs-owner` question, not your decision.
* Stop spending on work that closes no entry condition.

## GitHub

* **Issues:** work packages (`type:work-package`), backlog (`type:backlog`), questions to the owner (`needs-owner`, with options and a recommendation). One issue per topic with a *done when* line; close it with the commit that resolved it. GitHub milestones are the releases.
* **Branches:** `main` holds released versions only; it changes only through a release pull request, never by a push. Work integrates on `develop`. Each work package is a branch `wp/<name>` and a pull request into `develop` (`gh pr create --base develop`; `main` stays the default branch, so "Closes #n" does not close issues: close them yourself), merged by you (`gh pr merge --merge`) when typecheck, tests, build and word count pass and `quality` has done its final pass. You commit your files directly to `develop`.
* **Owner answers** arrive as comments on `needs-owner` issues. Record each in `decisions.md`, act on it, name the issue in the commit, close the issue.
* **Commits:** no Claude attribution (`CLAUDE.md`, Commits).

## Releases

A release closes a milestone; you make it yourself when every entry condition is ticked:

1. On `develop`: version in `package.json` and `package-lock.json`, `CHANGELOG.md` entry, `npm run typecheck`, `npm test`, `npm run build:ext` and the word count pass. Commit, push.
2. `gh pr create --base main --head develop --title "Release <version>"`, then `gh pr merge <n> --merge`.
3. `git fetch origin main`, `git tag v<version> origin/main`, `git push origin v<version>`.
4. `npm pack`, then `gh release create v<version> plm-<version>.tgz --title "plm <version>" --notes "<the CHANGELOG entry>"`; remove the `.tgz`.
5. Close the GitHub milestone; mark the milestone `done (v<version>)` in `timeline.md`.
6. The next milestone and its budget are the owner's: if `timeline.md` names none, prepare a release meeting (skill `meeting`) on what was released and what comes next.

## Owner meetings

The owner decides only in meetings and on `needs-owner` issues (skill `meeting`). A decision that blocks only part of the work is a `needs-owner` issue; continue with the rest. Prepare a decision meeting when nothing useful is left without the owner, or when three or more `needs-owner` issues are open.
