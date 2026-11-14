---
name: meeting
description: Prepare, hold and record an owner meeting - kickoff, release, decision meeting, re-plan or status. Use "/meeting <issue>" to hold a prepared meeting, and to prepare one when the work needs the owner.
---

# Owner meeting

The chief engineer chairs and presents; agents answer detail questions on request; only the owner decides.

## Kinds

* **Kickoff:** milestones, their entry conditions and budgets; standing directions.
* **Release:** what the release contained against its entry conditions, open findings; the next milestone, its entry conditions and budget.
* **Decision:** one or more `needs-owner` questions that block the remaining work.
* **Re-plan:** a milestone over budget or stalled; new scope or budget, or stop.
* **Status:** where the work stands, no decision needed.

## 1. Prepare (chief engineer, usually on shift)

1. Write `meetings/<yyyy-mm-dd>-<topic>.md`, at most about a page: a one-paragraph summary of what the owner must decide; per agenda point the facts (test count, word counts from `scripts/wordcount.py`, issues and pull requests); per decision the question, the options with their consequences, the recommendation and why.
2. `gh issue create --label meeting --title "Meeting: <topic> ready"` with the decisions needed and the path of the file.
3. Add it to *Coming owner meetings* in `timeline.md`, commit, push. End the shift cycle with state `meeting` and the issue in `for_owner`.

## 2. Hold (interactive, the owner is present)

1. Check that the shift is not running. Hold the meeting only then.
2. Open with the summary in a few lines; go through the agenda, each point in at most ten lines, then wait for questions.
3. Answer from the repository; never invent an answer: what it cannot answer becomes an action.
4. Present each decision with AskUserQuestion, the recommended option first. Note the option chosen and the owner's reason.
5. Read back all decisions and actions; the owner confirms or corrects them.

## 3. Record (right after the meeting, same session)

1. Decisions into `decisions.md`; actions become issues with a *done when* line.
2. Append the minutes to the meeting file: decisions, actions with issue numbers, nothing else.
3. By kind: **release** and **re-plan:** the next milestone, its entry conditions and budget, or the new scope and budget, into `timeline.md`.
4. Close the meeting issue and the answered `needs-owner` issues; update `timeline.md` and `handover.md`; commit, push.
5. Ask the owner whether to start the shift.

## Rules

* The owner's time is scarce: short file, short answers, one question per decision.
* Nothing is recorded as decided that the owner did not say.
