Continue the "ports, connections and YAML type definitions" work for PLM.

Read first, in this order:
1. concepts/multi-discipline.md            (concept and the decisions taken)
2. concepts/multi-discipline-walkthrough.md (examples of usage and file layout)
3. concepts/multi-discipline-plan.md        (phases, draft requirement texts, tests, code sketches)
4. GitHub issues #26–#32 (gh issue view <n>); they are the unit of work.

Current state:
- Branch feat/parameter-references has uncommitted work for issue #19 in src/cli.ts,
  src/repo.ts, src/validate.ts, src/version.ts, test/plm.test.ts. npm test passes.
- CLAUDE.md is modified, uncommitted: word limits for documents/ and src/ + test/
  raised to 10000 for this change. The extension limit stays at 1659.
- concepts/ and test_products/ are untracked. Leave test_products/ alone.

Step 0, before any issue:
- Run npm test, npm run typecheck and the word count from CLAUDE.md.
- Let the quality agent review the #19 diff, then commit it. Commit the CLAUDE.md limit
  change and concepts/ as separate commits.
- Ask me before merging into main or pushing.

Then work the issues strictly in order: #26, #27, #28, #29, #30, #31, #32.
One issue at a time, each on its own branch from main, each leaving a working version.
For every issue follow CLAUDE.md:
- requirements-author together with quality first: update documents/ (and README where
  the issue says so) and commit that before any code.
- Then implementer(s) in their own worktree, test first, every function and test tagged
  with its requirement ID. The streams within one issue share files, so use one
  implementer per issue unless files are clearly disjoint.
- quality final pass, checks green, word limits respected, then commit.
- Stop after each issue, summarise what changed and what you verified, and wait for my
  go before merging and starting the next one.

Notes:
- The code and tests in the plan are sketches written before implementation. Treat them
  as a starting point; where the real code disagrees, follow the code and the issue's
  "Done when" list, and tell me what differed.
- The plan's Phase 1 is split across #26, #27 and #28; do not implement prefix/folder or
  `base` while working on #26.
- New requirement IDs reserved and checked unused: US-12, CR-20, CO-02.8, CO-02.9, TE-07,
  TE-07.1.
- Examples in documents/, tests and README stay neutral: no aircraft, bus or project names.
- Do not change the VS Code extension beyond what #26 and #27 require. If its word limit
  blocks you, stop and ask.
- No Claude attribution in commit messages.

Start with step 0.
