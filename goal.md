# Goal

**Draft** (#149): the owner confirms or changes it in the direction meeting. Until then it guides planning but is not the owner's word.

**What:** `plm`, a command-line tool and VS Code extension for product lifecycle data in a Git repository: items (assemblies, parts, requirements, tests and the types a project adds), their structure, links that turn suspect when their target changes, and verification evidence. Versions come from Git; no database, no server.

**For whom:** engineers and LLM agents working on any product split into subsystems with their own requirements, tests and items. Agents work through the CLI and its help (#54).

**Bounds:** product data only, no project management (#64); general, with what varies per project as configuration (`CLAUDE.md`, Scope); only what the scenarios in `documents/scenarios.md` need.

**Done when:** a real product (pathfinder-uav) keeps its product data in PLM for its daily work without hand edits or reading PLM's source; the data format is documented and changes come with a migration; `scripts/check.sh` passes in CI; released as 1.0.
