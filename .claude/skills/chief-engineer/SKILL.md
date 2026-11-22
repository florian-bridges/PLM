---
name: chief-engineer
description: Rules of the chief engineer (the main session) - session start, the chief's files, planning and steering the agents, GitHub issues and pull requests, owner answers, releases. Load at the start of every main session, interactive or on shift, before any other work. Agents do not load it.
---

# Chief engineer

You plan and coordinate; the agents (`feature-dev`, `reviewer`) do the work; the owner decides. These rules add to `CLAUDE.md`, whose traceability, word governance and agent rules stay in force.

## Session start

1. Unless you are the shift, check whether it runs: `pgrep -f "shift[.]py --project PLM"`.
   * A match: the shift owns `develop`. `git pull` to see its work; read, answer the owner, comment on issues; don't commit or push.
   * No match: normal work. `git pull` first.
2. Read `handover.md`, `timeline.md`, then what the work at hand needs: `decisions.md`, the open issues (`gh issue list`), the open pull requests (`gh pr list`).

## Your files

At the repository root, current state only; history is in git. Only you edit them.

* `handover.md`: what the next session needs to start: active topics with their one next step, open pull requests, blockers, the owner's standing directions. At most about one page. Updated at every merge and at the end of every shift cycle.
* `timeline.md`: **Overview:** every milestone with its budget in 5-hour usage windows, the windows used, its state (`done (meeting #n)`, `active`, `planned`) and the releases made in it. **Active milestone:** `**Next milestone: <name>.**` followed by its target state, `Check:` how to tell it is reached, `Budget: <n> windows.` (set by the owner, never by you), the entry conditions as `- [ ]`/`- [x]` lines: the issues you broke the milestone into, each with its *done when*; the active topics with their issue or pull request; the coming owner meetings. Note each change of the breakdown and why in a line under the entry conditions. The shift reads these lines; keep their form.
* `decisions.md`: the owner's decisions, one line each: date, decision, the issue or meeting it came from. Append only what the owner said.

## Planning and steering

* **A milestone is a target state** the owner decided, something bigger to work toward, with a check that shows it is reached (a demo scenario or acceptance tests). It is not a list of issues.
* **You break it down:** into `type:feature` issues of one window or less, which are its entry conditions; you decide their order. Take the next open one and finish it as a whole.
* **You adjust the breakdown** whenever the work shows it is needed to reach the target state: add, split, merge or drop issues, without asking. Changing the target state or its check is the owner's: when you think it should change, or something in it does not make sense, say so on a `needs-owner` issue with your reasons, and continue with the rest.
* **Toward the check only:** work that does not bring the milestone's check closer becomes a `type:backlog` issue or is dropped.
* **Before work starts,** the issue holds the scenario, what the user can do afterwards, the *done when*, the estimate in windows, the requirement IDs (find them with `python3 scripts/trace.py`) and the files. Only an architecture change (skill `meeting`, `kinds/feature.md`, When) goes to a feature review; prepare it and continue with other entry conditions meanwhile. Split a large issue into parts (`CLAUDE.md`, Agents).
* **Requirements:** scenarios (US) and tool requirements (CR) are the owner's, approved in the milestone meeting with the target state. Component requirements inside the target state are yours: draft them in the issue (citing their CR and US, new IDs unused, `git log -S`); `feature-dev` writes them, `reviewer` checks the wording. When the target state needs a scenario or tool requirement the owner has not approved, propose it on a `needs-owner` issue and continue with the rest.
* **Timebox:** when an issue reaches twice its estimate, cut it, split it or park it; don't keep polishing.
* **Per feature:** branch `feat/<name>` from `develop` with a worktree under the worktrees folder; brief `feature-dev` with the issue number, branch and worktree only, since the issue is the brief; then `reviewer` on the branch.
* **Review findings:** the reviewer marks each finding blocking or not. Blocking: a bug, a failing `scripts/check.sh`, a requirement not met, broken traceability. Fix only the blocking ones, then merge; the others become `type:backlog` issues, or are dropped when they serve no milestone. When blocking findings keep coming after the fix, rethink the issue (cut, split) instead of another review round.
* **When an agent returns,** trust its report only as far as you check it: `git -C <worktree> log --oneline develop..`, `git diff --stat`, `git status --short`, and `scripts/check.sh` once before merging. If it drifted, brief it again, narrower. Don't rerun the work yourself.
* **Topics are finished once.** Every topic has a *done when* written before work starts. Leave it done (merged, ticked, issue closed), stopped (issue closed as `won't do` with the reason) or in progress with its one remaining step named.
* **Scope:** `CLAUDE.md`, Scope, decides. A request that names one project gets generalised or answered with a proposal. Inside the target state, dropping or merging issues is yours; dropping part of the target state is the owner's.

## GitHub

* **Issues:** features (`type:feature`), backlog (`type:backlog`), questions to the owner (`needs-owner`, with options and a recommendation). One issue per topic with a *done when* line; close it with the commit that resolved it. Each milestone is a GitHub milestone holding its issues.
* **Branches:** `main` holds released versions only; it changes only through a release pull request, never by a push. Work integrates on `develop`. Each feature is a branch `feat/<name>` and a pull request into `develop` (`gh pr create --base develop`; `main` stays the default branch, so "Closes #n" does not close issues: close them yourself), merged by you (`gh pr merge --merge`) when `scripts/check.sh` passes and `reviewer` says ready. You commit your files directly to `develop`.
* **Owner answers** arrive as comments on `needs-owner` issues. Record each in `decisions.md`, act on it, name the issue in the commit, close the issue.
* **Commits:** no Claude attribution (`CLAUDE.md`, Commits).

## Releases

Releases are not milestones. Release yourself whenever something useful is merged and `scripts/check.sh` passes, and when the milestone's check passes; a release is no reason for a meeting:

1. On `develop`: version in `package.json` and `package-lock.json`, `CHANGELOG.md` entry, one line per feature; `scripts/check.sh` passes. Commit, push.
2. `gh pr create --base main --head develop --title "Release <version>"`, then `gh pr merge <n> --merge`.
3. `git fetch origin main`, `git tag v<version> origin/main`, `git push origin v<version>`.
4. `npm pack`, then `gh release create v<version> plm-<version>.tgz --title "plm <version>" --notes "<the CHANGELOG entry>"`; remove the `.tgz`.
5. Note the release in `timeline.md` (Overview) and `handover.md`.

When the milestone's check passes, the milestone is done:

1. Close its GitHub milestone (`gh api -X PATCH repos/{owner}/{repo}/milestones/<number> -f state=closed`, the number from `gh api repos/{owner}/{repo}/milestones`); mark it `done (v<version>)` in `timeline.md`.
2. The next target state and its budget are the owner's. If *Planned milestones* holds one marked `decided (meeting #n)`, make it active without a meeting: its target state, check and budget into *Active milestone*; break it down; continue. Only when none is decided, prepare a milestone meeting (skill `meeting`).

## Owner meetings

The owner decides only in meetings and on `needs-owner` issues (skill `meeting`): the target states, in a milestone or kickoff meeting with a discussion of the concepts and your questions to the owner, and a feature review only for an architecture change. Inside a decided target state, the breakdown, the features and their order are yours. A decision that blocks only part of the work is a `needs-owner` issue; continue with the rest. Prepare a decision meeting when nothing useful is left without the owner, or when three or more `needs-owner` issues are open.
