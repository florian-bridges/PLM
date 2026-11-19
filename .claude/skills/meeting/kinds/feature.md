# Feature review

The owner decides each milestone's features in its release or kickoff meeting, prepared as below. A separate feature review is held only for a real architecture change found later.

## When

A feature changes the architecture when it adds a new storage, a new public interface style, or breaks the data format. Found at planning (skill `chief-engineer`) or reported by `feature-dev`, which stops at such a change.

## Preparation

1. Draft in the meeting file, not in `documents/`: the need, generalised (who needs it, which project raised it, why the tool and not the project); the requirement changes at every level, new IDs unused (`git log -S`); the existing requirements and code it touches (`python3 scripts/trace.py <ID>`).
2. Alternatives: extend, merge or drop an existing feature instead; a smaller first scope.
3. Cost: words per limit (`python3 scripts/wordcount.py -v` for the margin), windows, the parts it splits into.
4. `reviewer` reads the drafts once for need, duplication and scope; its findings go into the file.

## Agenda

1. **Need:** the scenario and who it serves; how it stays general (`CLAUDE.md`, Scope).
2. **Proposal:** the requirement drafts and what changes for the user.
3. **Alternatives and cost:** each with words, windows and what it leaves out; `reviewer`'s findings.
4. **Verdict:** go, go with reduced scope, or no-go.
5. **Plan:** the feature issues and their order; the entry conditions and budget they change.

## Outcome

* Go: the approved US, CR and component requirements into `documents/` (chief engineer, one commit naming the meeting); one `type:feature` issue per part, each naming the meeting; the entry conditions in `timeline.md` as decided.
* No-go: the issue closed as `won't do` with the reason, or moved to `type:backlog`.
