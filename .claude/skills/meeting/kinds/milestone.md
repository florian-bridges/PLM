# Milestone

The next target state, when no decided milestone is left. The owner defines it; the chief engineer prepares a discussion of the concepts and the questions the owner should answer, so that the target state is clear enough to break down.

## Preparation

1. **Reached:** the last milestone against its check; the releases since; open findings.
2. **Directions:** the candidates for the next target state (`improvements.md`, open `type:backlog` and parked issues, what the projects using PLM need), generalised.
3. **Concepts:** per candidate, what it would mean for users, the concepts and options behind it with their consequences (scenarios and requirements touched, words, a rough size in windows), and the questions you need answered to break it down.
4. `reviewer` reads the file once for need, duplication and scope; its findings go into it.

## Agenda

1. **Reached:** in a few lines.
2. **Concepts:** per candidate the concepts and options; then your questions, one at a time.
3. **Target state:** the owner states it; read back the target state, its check and the scenarios and tool requirements it needs. Later milestones may be decided the same way.
4. **Budget:** rough, in usage windows.

## Outcome

The target state, its check and budget as the active milestone in `timeline.md`, later ones under *Planned milestones* marked `decided (meeting #n)`; the approved scenarios and tool requirements into `documents/` (one commit naming the meeting); the GitHub milestone; one line per decision in `decisions.md`. Then break the active milestone down (skill `chief-engineer`) and build it without asking again.
