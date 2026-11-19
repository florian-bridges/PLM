# Feature review: 0.5 Agent interface (#58, #63, #57, #55)

The four 0.5 entry conditions each add a command or interface (meeting #77, option A; `kinds/feature.md`, When). **Decide** for each: go, go with reduced scope, or no-go. All four serve US-12 and the humans who script PLM; none names a project. Shared change: US-12 becomes "…reads and diffs the YAML files in Git, **looks up the schema, follows traces, applies related edits all or nothing** and runs validation, suspects and impact before it commits"; CR-05 and CL-01 cite US-12. No new CR or component requirement. New IDs CL-01.5, CL-01.6, CL-05.4, CL-05.5 are unused (`git log --all -S`, `trace.py`).

Word limits (`scripts/wordcount.py -v`, 2026-11-19): `documents/` 5000/5000, `src/`+`test/` 5316/5340. Every go needs `reviewer` to raise both limits.

## 1. #58 The effective schema

**Need.** Types, prefixes, fields, required fields and link types are spread over built-ins, `types/` and `plm.yaml`. Today only `new --help` (type names) and `link --help` (link rules) show them, as text (CL-01.1). `repo.types` already holds the merged types (CO-02.8), `allowedLinks` the links (CO-02.9).

**Proposal.** New **CL-05.4:** `plm types` shall print each type with its base, prefix, home folder, fields and required fields, and each link type with its source and target types (CO-02.6, CO-02.9). CL-01.1 drops its two help lists.

**Options.** A (recommended) `plm types`, replacing the help lists: about +20 `documents/`, +40 `src/`+`test/`; ¼ window. B `plm types` beside the help lists: +45, +70. C extend `show` (no ID: schema): mixes item and schema output.

## 2. #63 Trace queries, with the context view (#56)

**Need.** "What hangs below this requirement, what does this part satisfy up to the top" needs several commands. `show` already gives the item, version, artifacts and its links in both directions with states (CO-01.3, CL-05.3); it lacks parent, requirements and their tests. `subtree` (TE-03.2, TE-06.2) walks down without depth; `impact` and `suspects` answer other questions and stay.

**Proposal.** New **CL-01.5:** `show <id>` shall add the parent and the item's requirements, and include its requirements' links; `--down <n>` / `--up <n>` shall list the items reached within n steps, each with its depth and the link or relation it came by: down through nested and used items, requirements and links to it; up through the parent, users and its links' targets. `subtree` gains the depth.

**Options.** A (recommended) extend `show`: about +60 `documents/`, +130 `src/`+`test/`; ¾ window. The *done when* reads `plm show <ID> --down/--up` instead of `plm trace`. B new `plm trace` as in the *done when*, `show` unchanged: +10 words more and two views of one item. C context view only (depth 1): ½ window; the 0.5 *done when* loses depth.

## 3. #57 Atomic changes with a dry run

**Need.** Related edits are made one command at a time; a failure halfway leaves a half-done change. Every write already goes through `writeYaml` (`src/repo.ts:34`), except log copies in `test record`.

**Proposal.** New **CL-01.6:** `plm apply <file> [--dry-run]` shall run a YAML list of `plm` command lines (`new`, `set`, `link`, `confirm`), `$n` standing for the ID the n-th printed; if a command fails or validation finds an error the run did not start with, or with `--dry-run`, it shall restore every file written and exit 1 (0 for a clean dry run), printing each command's output and the files written.

**Options.** A (recommended) as above: the commands run through the existing Commander definitions, so no second write path; `writeYaml` keeps a journal for the rollback. About +60 `documents/`, +150 `src/`+`test/`; 1 window. B a dedicated change format (`{item, set, links}`): a second write path, more words. C no rollback, stop at the first failure: ½ window, not atomic.

## 4. #55 MCP server

**Need.** Agents reach PLM through the shell and parse its output; an MCP client wants typed tools. US-12 is met by the CLI today, so this is the one feature that adds an interface rather than data.

**Proposal.** New **CL-05.5:** `plm mcp` shall serve over stdio one MCP tool per command, named, described and typed from its Commander arguments and options, each call running the command with `--format json` and returning its output and exit code.

**Options.** A (recommended) hand-written JSON-RPC (initialize, tools/list, tools/call), no dependency: about +45 `documents/`, +170 `src/`+`test/`; 1 window. B `@modelcontextprotocol/sdk` 1.32: fewer words for the protocol, but 17 direct dependencies (express, hono, zod, cors, jose…) for a three-method server. C defer to the backlog: saves 1 window; agents keep using the shell and JSON.

## Cost and order

All A: about +200 `documents/`, +500 `src/`+`test/`; 3 windows, one `feature-dev` part each, of the 4-window budget (#60 documentation about ¼ more). Order #58, #63, #57, #55: the MCP server derives its tools from the commands, so built last it covers `types` and `apply` with no change.

## Reviewer findings

* **Scope:** none of the four names a project; all neutral. Claims checked: new IDs unused; margins 0 and 24 words, as stated; every write goes through `writeYaml` (`src/repo.ts:34`) except `copyFileSync` in `src/links.ts:98`, as stated.
* **#58:** A is right. It merges two help lists into one command, and dropping them from CL-01.1 also cuts `src/cli.ts:58` and `:124`. B duplicates the help lists.
* **#63:** A is right. B would be a second view of the same item. Corrections: `subtree` (`src/repo.ts:186`) is a core function, not a command. No requirement states what `show` prints (CO-01.3 covers artifacts; CL-05.3 adds only JSON fields), so CL-01.5 cannot "add" to it: it has to state what `show` prints. "Users" and "relation" are undefined; write "items that use it" and "nesting, `uses` or link type". Put the depth walk in core beside `subtree` so the extension tree (VS-02.1) can reuse it. `--down` overlaps the subtree walk in `report coverage` (`src/links.ts:110`): use one function.
* **#57:** A is right. Rollback must also delete files and folders that `writeYaml` created (`mkdirSync`, `src/repo.ts:36`). Running Commander repeatedly in one process needs `exitCode` (`src/cli.ts:39`) reset for each command. "`$n` standing for the ID the n-th printed" needs the word "command".
* **#55:** Need not shown. The new US-12 wording does not mention typed tools, and the draft says the CLI already meets US-12. Under "only what the scenarios need" I recommend C (backlog), or else US-12 has to name the need. If it goes ahead, A (no dependency) is right.
* **Limits:** I would raise them per feature, each in its own commit, using measured numbers after cuts, not all at once up front. Estimate: `documents/` 5000 to 5200 (5150 without #55, less about 25 cut from CL-01.1); `src/`+`test/` 5340 to 5850 (5670 without #55).

## Plan

For each go: its issue updated to the decided scope, naming this meeting; the approved US-12, CR-05 and CL-01 changes into `documents/` with the word limits raised; built in the order above.
