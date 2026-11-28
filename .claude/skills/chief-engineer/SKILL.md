---
name: chief-engineer
description: PLM's additions to the base skill `tower:chief-engineer` - features as work packages, requirements, the agents feature-dev and reviewer, branches and merging, releases. Load at the start of every main session, right after `tower:chief-engineer`. Agents do not load it.
---

# Chief engineer: PLM

These rules add to the base `tower:chief-engineer` and to `CLAUDE.md` (traceability, word governance, scope, agents), and win where they differ. The project is `PLM`.

## Features

* **A work package is a `type:feature` issue:** the scenario it serves, what the user can do afterwards, the *done when*, the estimate in windows, the requirement IDs (`python3 scripts/trace.py`) and the files. Split a large one into parts (`CLAUDE.md`, Agents).
* **Architecture changes** (skill `meeting`, `kinds/feature.md`, When) go to a feature review; prepare it and continue with other entry conditions meanwhile.
* **Scope:** `CLAUDE.md`, Scope, decides. A request that names one project gets generalised or answered with a proposal.
* **Requirements:** you approve every requirement the target state needs: scenarios (US), tool requirements (CR) and component requirements. Draft them in the issue (each citing its parent, new IDs unused, `git log -S`); `feature-dev` writes them, `reviewer` checks the wording.
* **Per feature:** branch `feat/<name>` from `develop` with a worktree under the worktrees folder; brief `feature-dev` with the issue number, branch and worktree only; then `reviewer` on the branch. Run `scripts/check.sh` once before merging.

## Branches

`main` holds released versions only; it changes only through a release pull request, never by a push. Each feature is a pull request into `develop` (`gh pr create --base develop`; `main` stays the default branch, so "Closes #n" does not close issues: close them yourself), merged by you (`gh pr merge --merge`) when `scripts/check.sh` passes and `reviewer` says ready. You commit your files directly to `develop`. No Claude attribution in commits (`CLAUDE.md`, Commits).

## Releases

Releases are not milestones. Release whenever something useful is merged and `scripts/check.sh` passes, and when the milestone's check passes; a release is no reason for a meeting:

1. On `develop`: version in `package.json` and `package-lock.json`, `CHANGELOG.md` entry, one line per feature; `scripts/check.sh` passes. Commit, push.
2. `gh pr create --base main --head develop --title "Release <version>"`, then `gh pr merge <n> --merge`.
3. `git fetch origin main`, `git tag v<version> origin/main`, `git push origin v<version>`.
4. `npm pack`, then `gh release create v<version> plm-<version>.tgz --title "plm <version>" --notes "<the CHANGELOG entry>"`; remove the `.tgz`.
5. Note the release in `handover.md`.

When a milestone's check passes, close its GitHub milestone with `gh api -X PATCH repos/{owner}/{repo}/milestones/<number> -f state=closed` (the number from `gh api repos/{owner}/{repo}/milestones`).
