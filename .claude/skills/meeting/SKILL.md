---
name: meeting
description: PLM's additions to the base skill `tower:meeting` - where the facts come from, what PLM adds to the kinds, and the feature review for architecture changes. Load it with `tower:meeting`; "/meeting <issue>" holds a prepared meeting.
---

# Owner meeting: PLM

These rules add to the base `tower:meeting` and win where they differ.

* **Facts** come from `scripts/check.sh`, `python3 scripts/wordcount.py -v`, `python3 scripts/trace.py <ID>`, the issues and pull requests.
* **Kickoff and direction:** the needs and directions come from `improvements.md`, open `type:backlog` and parked issues, and what the projects using PLM need, generalised. *Where it stands* adds the releases since the last direction meeting. Per concept, name the scenarios and requirements touched and the words it adds. The reviewer is the agent `reviewer`.
* **Decision:** the consequences of each option include the words it adds.
* **Feature review** (`kinds/feature.md`), a kind PLM adds: before an architecture change is built.
