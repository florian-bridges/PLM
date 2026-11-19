---
name: meeting
description: Prepare, hold and record an owner meeting - kickoff, feature review, release, decision meeting, re-plan or status. Use "/meeting <issue>" to hold a prepared meeting, and to prepare one when the work needs the owner.
---

# Owner meeting

The chief engineer chairs and presents; agents answer detail questions on request; only the owner decides. The agenda and outcome of each kind are in `kinds/<kind>.md`; read only the one at hand.

| Kind | When |
|---|---|
| `kickoff` | no milestone defined |
| `feature` | before an architecture change is built (`kinds/feature.md`, When) |
| `release` | after a release, or every entry condition ticked and no next milestone |
| `decision` | a `needs-owner` question blocks all remaining work, or three or more are open |
| `replan` | a milestone over budget or stalled |
| `status` | the owner asks where the work stands |

## 1. Prepare (chief engineer, usually on shift)

1. Write `meetings/<yyyy-mm-dd>-<topic>.md`, at most about a page, following the kind's agenda: a one-paragraph summary of what the owner must decide; per agenda point the facts (`scripts/check.sh`, `python3 scripts/wordcount.py -v`, `python3 scripts/trace.py <ID>`, issues and pull requests), generated, never hand-counted; per decision the question, the options with their consequences, the recommendation and why.
2. `gh issue create --label meeting --title "Meeting: <topic> ready"` with the decisions needed and the path of the file.
3. Add it to *Coming owner meetings* in `timeline.md`, commit, push. If other entry conditions can go on without the meeting, continue with them; otherwise end the shift cycle with state `meeting` and the issue in `for_owner`.

## 2. Hold (interactive, the owner is present)

1. Check that the shift is not running. Hold the meeting only then. Or the owner holds it in the control room while the shift waits: each decision as a comment on the meeting issue, ending with "Meeting closed"; the shift records it (section 3).
2. Open with the summary in a few lines; go through the agenda, each point in at most ten lines, then wait for questions.
3. Answer from the repository; never invent an answer: what it cannot answer becomes an action.
4. Present each decision with AskUserQuestion, the recommended option first. Note the option chosen and the owner's reason.
5. Read back all decisions and actions; the owner confirms or corrects them.

## 3. Record (right after the meeting, same session)

1. Decisions into `decisions.md`; actions become issues with a *done when* line.
2. Append the minutes to the meeting file: decisions, actions with issue numbers, nothing else.
3. What the kind's *Outcome* names: `timeline.md`, issues, requirement changes.
4. Close the meeting issue and the answered `needs-owner` issues; update `timeline.md` and `handover.md`; commit, push.
5. Ask the owner whether to start the shift.

## Rules

* The owner's time is scarce: short file, short answers, one question per decision.
* Nothing is recorded as decided that the owner did not say.
