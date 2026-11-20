# Feature review: 0.8 Occurrences and quantities (#40, with #42), variants and effectivity (#43)

Meeting #90 decided that #40 and #43 go ahead in principle (option B), that #42 is merged into #40, that #66's rules go into their *done when*, and a budget of 4 windows. **Decide** the details: the format of a `uses` entry and what `ref` is (1), where part totals appear (2), the condition syntax (3), what a configuration selects and which commands take it (4), what `validate` checks (5), whether to split the work into parts (6) and the requirement levels (7). Each decision has a recommendation, and all of them together fit the budget. Both features change the data format that the schema, `usesOf` and the version read as plain IDs. Plain IDs stay valid, and a repository that uses only plain IDs keeps its versions.

## 1. Need

An assembly uses one part several times, and each use has its own quantity, reference (position, designator) and other data. Changing a use must change the assembly, not the part. The same assembly exists in variants and in serial or date ranges that use different items, and one unit's exact definition must follow from stated inputs. Structures for different purposes (design, manufacturing, service) group the same parts and must be comparable. All three needs fit any product split into subsystems, and none is project process. Today `uses` is a list of IDs (`src/schemas.ts:11`). Listing an ID twice passes `validate`, nothing records per-use data, and nothing selects between alternatives. Examples below are neutral (`variant: [standard, extended]`).

## 2. Proposal

**Format (#40).** Example `uses` list:

```yaml
uses:
  - PRT-A                                    # = {item: PRT-A}
  - {item: PRT-B, quantity: 4, ref: front, torque: 5}
  - {item: PRT-C, ref: drive, when: {variant: [standard]}}
  - {item: PRT-D, ref: drive, when: {variant: [extended], serial: {from: 50}}}
```

* `quantity` is a positive integer, default 1. `ref` is free text naming the use. Other keys are allowed and unchecked; a type that wants them checked overrides `uses` in its `fields` (CO-02.8).
* The entry lives in the assembly's `item.yaml`. Editing it therefore changes the assembly's folder hash, so the assembly's version changes and links to the assembly become suspect (TE-01.1, TE-03.1). The part's version does not change.
* The version digest takes each entry's `item` version in listed order, as today. A list of plain IDs therefore gives the same digest as before.

**plm.yaml (#43).** Parameters are declared as `config: {variant: [standard, extended], serial: ordered}`. A parameter declared with a list of values is "listed"; one declared `ordered` takes ranges.

**Selection (#43).**

* The configuration is a global option, `--config variant=extended,serial=57`, like `--format`. The core keeps an entry when each parameter its `when` names is unset, has a listed value, or lies within `from`–`to` (inclusive; either bound may be left open).
* Values compare as numbers when both are numbers, otherwise as text, so ISO dates work.
* Without `--config`, every entry is kept, which is today's behaviour.
* Only `usesOf` applies the selection. Every walk through `uses` therefore follows it: `show`, `show --down/--up`, `report coverage|connections|parts [<item>]`, and the scope of `list`, `search` and `suspects`. The extension tree has no `--config` and always shows all entries.
* Versions and `validate` ignore `--config` and always read all entries. A version is therefore one per commit, not one per configuration.

**What differs from the concept removed in ea3257d** (2026-10-03, no reason recorded):

| | Removed (CO-04, CR-11) | Now |
|---|---|---|
| What a configuration was | a file `configurations/<name>.yaml` naming a variant's root item (earlier: optional items listed) | no file and no name: parameter values given on the command line, declared once in `plm.yaml` |
| Where alternatives sat | in separate roots | on the `uses` entry, inside one tree |
| Effectivity | none | ordered parameters (serial, date) |
| Commands | `plm configuration <name>`, the `config:` search filter, configurations in `impact`, an unknown-root check | none of these come back; `impact` is unchanged |

Variant roots that share items through `uses` stay possible without code. CR-11, CO-04 and their IDs stay retired.

**Requirement drafts.** New IDs CO-01.5, CO-01.6, CO-02.12 and CO-03.4 were checked unused (`git log --all -S`, grep in `documents/`, `src/`, `test/`, `extension/`). CO-02.11 is retired and is skipped.

* **US-2** adds: "…uses a part several times, each use with its own quantity and reference, and states which uses apply to which variant or serial range." **CR-02** adds: "…, an item used several times with its own data per use and in alternatives chosen by configuration parameters."
* **CO-01** adds "selecting used items by configuration if given". **CO-02** adds "and ambiguous or empty selections". **CO-03** adds "and total the items below one" and cites CR-02 besides CR-05, CR-14 and CR-18. CO-01 (CR-01–CR-03) and CO-02 (CR-04) keep their parents; all three already cite US-2.
* **CO-01.2:** `uses` becomes "`uses` (CO-01.5)".
* **CO-01.5 (#40)** A `uses` entry shall be an item ID, equal to `{item: <ID>}`, or a map with `item`, `quantity` (positive integer, default 1), `ref` (free text naming the use) and other keys; `list uses` (CO-03.3) shall list entries as maps.
* **CO-02.12 (#40)** The core shall report as error two or more `uses` entries of one item with the same `ref` that are selected together under some configuration (CO-01.6; without `config`, always) (`ambiguous-use`).
* **CO-03.4 (#40)** `report parts [<item>]` shall list each item reached from the item, or from the top-level items, through nesting and `uses`, with its total: the product of `quantity` along each path, nesting counting 1, summed over paths, sorted by ID, adding `quantity` to CL-05.3's output. **CL-01.1** adds `report parts [<item>]` (CO-03.4).
* **CO-01.6 (#43)** `plm.yaml` may declare `config: {<parameter>: [<value>…] or ordered}`. A `uses` entry's `when: {<parameter>: [<value>…] or {from, to}}` shall select the entry for a configuration (`--config <parameter>=<value>,…`, a global option) when each parameter it names is unset, has a listed value or lies within `from`–`to` (inclusive, either bound open; numbers compared as numbers, other values as text). Walks through `uses` shall follow only selected entries; versions and `validate` shall ignore `--config` and read all entries.
* **CO-02.12 (#43)** adds: as error (`config`), a `when` that names an undeclared parameter or value, or gives a range for a listed parameter; and (`empty-use`) two or more entries of one item with the same `ref` of which none is selected under some configuration. "Some configuration" ranges over every combination of the declared values of listed parameters and the `from`/`to` values used in `when`s for ordered ones. An unknown parameter or value in `--config` shall be a usage error.

**Requirements and code touched** (`trace.py`):

* CO-01.2: `src/repo.ts:1`, `src/schemas.ts:11`
* CO-02.2: traced at `src/validate.ts:45,48,84,99`; the `unknown-use` check (`:62`) and cycles through `childrenOf` (`:106`) carry no trace comment
* `usesOf` (`src/repo.ts:124`) becomes the only reader of `data.uses`, mapping each entry to its `item` and applying `--config`. Today `src/version.ts:22` (TE-01.1) and `list` (`src/search.ts:21`, CO-03.3) read it raw.
* CL-01.5 and TE-06.2: `walk` at `src/repo.ts:206`, via `usesOf`
* TE-03.2: `subtree` at `src/repo.ts:196`
* CO-03.3: in `list`, the `{source, ...data}` spread would break a plain-ID entry into characters today.
* Extension: `childrenOf` at `extension/src/logic.ts:57` and `:80` and `extension.ts:28`. No change is needed if `usesOf` maps.
* `Settings`: `src/repo.ts:22`
* `architecture.md:25` gains one clause.

## 3. Decisions for the owner

1. **The `uses` entry and `ref`.** Repeated parts and per-use data need a place, and `ref` names one use. A *(recommended)* `ref` is one free-text string, and `quantity` is set separately. This is the smallest option: "R1–R4" is one entry with quantity 4. Two equal `ref`s are compared as whole strings. B `ref` is a list, and `quantity` defaults to its length and must equal it. This checks each designator, at about +15 `documents/` and +40 code words. C the key name is set in `plm.yaml`, like `released_states`, for about +10/+20 words with no case that needs it. Under every option, `ref` is fixed as the grouping key for #43.
2. **Part totals for BOM views (#42).** A view's root uses the same parts, and two views are compared by diffing their totals. A *(recommended)* new `report parts [<item>]` (CO-03.4). Its sorted `{id, title, quantity}` output diffs directly with `diff <(plm report parts ASM-1 --format json) <(…ASM-2…)`. B a `quantity` column in `show --down` rows. This needs no new command, but `depth` and `via` differ between views, so a diff needs filtering, and the walk stops at the first path, so the total needs a second walk anyway. C no totals: `list uses` (CO-03.3) shows quantities per assembly, and the user sums them in a script. This costs 0 words, but #42's comparison then lives outside PLM.
3. **Condition syntax.** A lists only (`when: {variant: [a, b]}`). This is the smallest, but serial or date effectivity then means listing every serial. B *(recommended)* lists, plus `{from, to}` for parameters declared `ordered`, which covers serial and date ranges for about +25 words. C expression strings (`serial >= 50 and variant == a`). This needs a parser at about +150 code words, and its conditions are harder to check for overlap.
4. **Unset parameters and which commands take `--config`.** A *(recommended)* an entry that names an unset parameter is kept. So no `--config` gives today's full view and each value narrows it, and `--config` is global, so every walk through `uses` honours it at one place in the code. B such entries are dropped, so no `--config` gives the base product, which changes today's output for repositories that use `when`. C every parameter named on the walked path must be given, or the command stops with a usage error. This is strict but noisy. Keeping `--config` to `show` and `report` only, as written in #90, takes per-command wiring for more words and leaves `list`, `search` and `suspects` scopes unfiltered.
5. **What `validate` checks.** A *(recommended)* CO-02.12: undeclared names and values; and, under every configuration, two or more entries sharing a `ref` that are selected together (`ambiguous-use`, from #40 on) or none of which is selected (`empty-use`). A use with its own `ref` and a `when` stays optional. Adding a new variant value without an alternative is then reported. B no `empty-use`, so a forgotten variant goes unnoticed, at about −15 words. C checks only at command time, for the given `--config`. Nothing would be caught in CI.
6. **Split into parts.** A *(recommended)* one `feature-dev` per feature, run in sequence. #43 builds on #40's entry format, and both features edit `src/repo.ts`, `src/validate.ts`, `src/schemas.ts` and the single test file `test/plm.test.ts`. B split #43 into a core part and a CLI part. This is parallel in theory, but the test file and `documents/` would conflict, and it saves no window.
7. **Requirement levels.** A *(recommended)* extend US-2, CR-02 and CO-01–CO-03 as drafted, with no new US or CR. B a new CR-21 "Configurations" and US-13, for about +60 words, repeating CR-02.

## 4. Alternatives and cost

The options rejected in #90 (A: no code; C: occurrence items, or version pinning beside Git) are not reopened.

**Word limits.** Margins today (`scripts/wordcount.py -v`, 2026-11-20): `documents/` 5368/5375 (7 left), `src/`+`test/` 5913/5913 (0), `extension/` 1635/1635 (0). 0.7 (#45, #2) is built first and will use these margins, so nothing is raised in advance: `reviewer` raises each limit per feature after the cuts, in one commit each, with measured numbers (as decided in the 0.5 feature review). `extension/` stays unchanged because `usesOf` does the mapping.

| Feature | `documents/` (counted drafts, after the reviewer's cuts) | `src/`+`test/` | `extension/` | Windows |
|---|---|---|---|---|
| #40 with #42 (all A) | about +120 | measured, expected +200 | 0 | 1–1½ |
| #43 (all A) | about +145 | measured, expected +250 | 0 | 1½ |
| This review | | | | ¼ |

The total is 2¾–3¼ of the 4 windows. The README paragraphs (BOM views and configurations, replacing nothing) are not counted. Choosing B in decision 1 adds +55 words, and choosing C in decision 3 adds +150.

**Parts.** One each, in sequence (decision 6). #40 touches:

* `src/repo.ts` (`usesOf` as the only reader of `uses`, `report parts` core), `src/schemas.ts`, `src/validate.ts`, `src/version.ts`, `src/search.ts`, `src/cli.ts`
* `test/plm.test.ts`, `README.md`, `documents/`

#43 adds `when` and `config` to the same files and `--config` to `src/cli.ts:17`.

## 5. Plan

On go:

* The approved US-2, CR-02 and CO-01–CO-03 changes go into `documents/`, in one commit naming this meeting.
* #40 and #43 are updated to the decided scope.
* `timeline.md` 0.8 gets the entry conditions below.
* Build order: #40, then #43.

**#40 Occurrences and quantities, with BOM views.** *Done when:*

- [ ] `uses: [PRT-A, {item: PRT-B, quantity: 4, ref: front}]` validates. A repository with plain IDs only gives the same versions and output as before.
- [ ] `plm validate` reports an object entry without `item` or with a quantity that is not a positive integer, its unknown item (`unknown-use`), a cycle through it, and two entries of one item with the same `ref` (`ambiguous-use`, CO-02.12). The same is reported when the two come from branches merged without a Git conflict and the merge result is validated in CI (#66).
- [ ] Changing an entry's `quantity` or `ref` changes the assembly's version and makes links to the assembly suspect, but not links to the part.
- [ ] `plm report parts ASM-1 --format json` gives each item below with its total quantity. `plm list uses ASM-1 ref:front` lists the entry.
- [ ] The README paragraph on BOM views is written: a view is a root of its own type using the same parts, and views are compared by diffing their `report parts` JSON. `scripts/check.sh` passes.

**#43 Variants and effectivity.** *Done when:*

- [ ] With `config: {variant: [standard, extended], serial: ordered}` in `plm.yaml`, `plm show ASM-1 --down 9 --config variant=extended,serial=57` and `plm report parts|coverage ASM-1 --config …` follow only the selected entries. Without `--config` they follow all entries. The same commit and inputs give the same output (#66).
- [ ] `plm validate` reports an undeclared parameter or value, or a range on a listed parameter (`config`). It also reports, under every configuration, two or more entries sharing a `ref` and selected together (`ambiguous-use`) or none of them selected (`empty-use`), including after a merge (#66). An unknown parameter or value in `--config` is a usage error (exit 2).
- [ ] Versions include every entry, whatever the configuration. Changing a `when` changes the assembly's version.
- [ ] The README paragraph on configurations is written. `scripts/check.sh` passes.

## Reviewer's findings

* **Scope:** neutral. Variants and serial or date effectivity are product data, not process. `torque: 5` and "reference designator" are examples only, so keep them out of requirement text: "free text naming the use" is enough (−6 words in CO-01.5).
* **Need:** #40 and #43 serve US-2. `report parts` (#42) is the only part a script could replace (option 2C). It is still worth keeping, because diffing views is #42's whole scenario.
* **Duplication, `ambiguous-use`:** #40 writes it into CO-02.2 and #43 moves it into CO-02.12. Define it once in CO-02.12 from #40 on, as "selected together under some configuration" (with no `config` that means always). #43 then only adds `config` and `empty-use`. This saves about 15 words and one rewrite.
* **Duplication, JSON output:** CO-03.4 "JSON is `{id, title, quantity}`" restates CL-05.3. Write "adding `quantity` to CL-05.3's output" (−4).
* **Duplication, entry mapping:** one shared function for the entry-to-ID mapping, not one per caller. `usesOf` (`src/repo.ts:124`) should be the only place that reads `data.uses`. Today `src/version.ts:22` and `list` (`src/search.ts:21`, the `{source, ...data}` spread) also read it raw.
* **Traces:** CO-03's parents are CR-05, CR-14, CR-18; US-2, US-9, US-11, and it does not cite CR-02. CO-03.4 serves CR-02, so either add CR-02 to CO-03 or put the totals under TE-06 next to `report coverage`. "The parents stay" (line 49) is wrong for CO-03. The line numbers on lines 60–62 are stale: CO-02.2 is traced at `src/validate.ts:45,48,84,99`, while `:62`/`:106` have no trace comment.
* **Consistency:** the extension tree has no `--config`, so it always shows all entries. Line 32 says otherwise. `validate` finds cycles through `childrenOf` (`src/validate.ts:106`), so if `usesOf` filters by a repository-wide config, CO-01.6 must say that `validate` and versions ignore `--config`. Today only versions are named.
* **Wording, CO-02.12:** "every combination of declared values and range bounds" leaves the bounds undefined, because ordered parameters declare no values. Say "the `from`/`to` values used in `when`s". "A group sharing a `ref`" should be "two or more entries". Otherwise a single optional entry is reported as `empty-use`, which contradicts decision 5A.
* **Limits:** do not raise anything in advance; 0.7 is built first. Raise per feature after the cuts above, in one commit each:
  * `documents/` by about +120 for #40 and +145 for #43 (drafts +135/+160, minus about 30 saved).
  * `src/`+`test/` by the measured amount, expected +200/+250. One `usesOf` mapping keeps this at the low end of the estimate.
  * `extension/` stays unchanged: it needs 0 words if `usesOf` maps.


## Minutes (2026-11-20, control room)

Decisions: 1 A, 2 A, 3 B, 4 A, 5 A, 6 A, 7 A, as recommended except 3 (B was recommended too); recorded in `decisions.md` (#92). Budget stays 4 windows.

Actions: requirement changes applied to `documents/` (documents limit 5449→5823, measured, reviewers cut per feature); #40 and #43 updated to the decided scope and *done when*; entry conditions in `timeline.md`; build #40, then #43.
