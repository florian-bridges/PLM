# Changelog

## 0.11.0 (2026-11-21)

* `impact` lists, per item, the `uses` entries added, removed, or changed in `quantity`, `ref` or `when` (#111, #67).
* `report document` begins with counts of `validate` findings by code and of items by `status` within the printed subtree (#112, #67).
* `show --down/--up --format mermaid` prints the items, their `uses` and links, coloured by state, as a Mermaid graph (#113, #67).

## 0.10.0 (2026-11-21)

* VS Code extension: the requirements document opens in VS Code's Markdown preview, replacing the document webview; Show Call Hierarchy on an ID traces its links; test cases appear in the Testing panel under their item, replacing the run-test command (#102, #67).

## 0.9.0 (2026-11-21)

* VS Code extension: `item.yaml` gets completion, hover and diagnostics from its type's schema through the Red Hat YAML extension, replacing the forms; PLM's views in their own Activity Bar container with `uses` quantities; configuration picker in the status bar; product-tree breadcrumbs; diff, confirm and remove above each suspect link, replacing the review page; suspect items tinted and badged in the Explorer (#101, #67).
* `validate` reports a file named in `files` but missing from the item's folder as `missing-file` (#87).
* Test fixtures use neutral names (#94).

## 0.8.0 (2026-11-20)

* `uses` entries may be `{item, quantity, ref, …}` besides IDs; changing an entry changes the assembly's version; `validate` reports bad entries and `ambiguous-use`; `plm report parts [<item>]` totals quantities; README paragraph on BOM views (#40, #42).
* `config` in `plm.yaml`, `when` on `uses` entries and the global `--config` make every walk through `uses` follow only selected entries; `validate` reports `config`, `ambiguous-use` and `empty-use` under every configuration; text compared by code point (#43, #66).

## 0.7.0 (2026-11-20)

* `plm impact` lists as `released` each item released at base (`status` in `plm.yaml`'s `released_states`, default `[released]`) whose own files changed while its status did not, and exits 1 if any; README section "Revisions and baselines" (#45).
* `plm report document [<item>]` prints the requirements document the VS Code extension shows as Markdown, for the repository or an item's subtree; the extension shares its renderer (#2).

## 0.6.0 (2026-11-20)

* Breaking: `ports` and `connections` are reserved home folders (built-in `port` and `connection` types); an existing artifact subfolder of either name is no longer listed as an artifact.
* Built-in `port` (`PORT-`) and `connection` (`CON-`) types; `connects` links a connection to its ports, `implements` also targets a connection. A type file's `files: {<name>: <JSON Schema>}` has `validate` check a named YAML file in an item's folder, e.g. a port's `icd.yaml` (#29).
* `plm report connections [<item>]` lists open ports, connections with fewer than two ports and directed connections (ports with a `role`) without exactly one `sender`, text and JSON, exit 1 if any; README section "Ports and connections" (#31, #30).

## 0.5.0 (2026-11-19)

* `plm types` prints the effective schema (types, prefixes, fields, required fields, link types) as JSON; `new --help` and `link --help` no longer list them (#58).
* `plm show <ID>` adds the parent and the item's requirements; `--down <n>` / `--up <n>` walk the product graph n steps, each item with its depth and how it was reached (#63).
* `plm apply <file> [--dry-run]` runs a list of `new`, `set`, `link` and `confirm` commands all or nothing (#57).
* README: a CI section with a generic script on `validate`, `impact` and `suspects` (#60).

## 0.4.0 (2026-11-16)

* Breaking: project types are defined in `types/<type>.yaml` (`prefix`, `folder`, `template`, `fields`, `required`, `base`); `schemas/`, `templates/` and `plm.yaml`'s `prefixes` and `folders` are no longer read. Convert by hand:

  | Before | After |
  |---|---|
  | `schemas/<type>.schema.json` `properties` / `required` | `fields` / `required` in `types/<type>.yaml` |
  | `templates/<type>.yaml` | `template:` in `types/<type>.yaml` |
  | `schemas/meta.schema.json` | `types/meta.yaml` |
  | `prefixes: {analysis: ANA-}` in `plm.yaml` | `prefix: ANA-` in `types/analysis.yaml` |
  | `folders: {analysis: analyses}` in `plm.yaml` | `folder: analyses` in `types/analysis.yaml` |

* A type with `base: <built-in type>` behaves as that type.
* An item's `text` cites a parameter as `{<ID>:<name>}`: a `derives-from` link, shown with its value in `plm show`.
* `plm.yaml` `links:` declares project link types; `plm report coverage --link <type>` lists the items no such link reaches.
* `plm report coverage --allocation`: `retained: <reason>` keeps a requirement at its level; only `satisfies` links from below count.
* `plm confirm <run> <sut> --reason <text>` makes a test run current again against a changed system under test.
* `plm new` writes block-style YAML; an enum finding lists the allowed values.
* README: use by LLM agents.

## 0.3.0 (2026-11-11)

* `plm new` prints the new item's path on stderr and in JSON output.
* `plm show` computes link states only for the item's own links (6 s to 0.3 s in a repository with 222 items).
* Artifacts and versions cover every file Git does not ignore, tracked or not: a link confirmed before the first commit stays current after it.
* `plm search`: `<field>:<value>` filters on any field, as a whole word, ignoring case.
* `plm validate` reports YAML errors such as duplicate keys.
* `informative:` defaults to `[rationale, links]`: adding or removing a link on an item leaves the links that target it current.
* `plm set <ID>:<name> unit <text>`; `plm get` prints nothing and exits 1 for an unset key.
* `plm new --help` lists the configured types, `plm link --help` the allowed links; every command has a one-line description.
* A deleted, unstaged file or a nested Git repository without commits no longer makes commands exit 3.

## 0.2.1 (2026-11-07)

* `plm --version`; `plm link` refuses a link type that `plm validate` rejects.
* `plm suspects`: a link to a renamed file is suspect instead of exit 3; no Git output except with exit 3.

## 0.2.0 (2026-11-07)

First public release, MIT licensed. Installed from the package attached to the GitHub release; a global install from the Git tag fails, because npm builds Git dependencies without their dev dependencies there.

* Configuration: home folder per item type (`folders:`), fields that leave links current (`informative:`), item parameters (`parameter_states:`), `schemas/meta.schema.json`.
* Commands: `plm set`, `plm get`, `plm list <field>`, `plm link --remove`, links to one file of an item (`<ID>/<path>`), `plm test record --sut` with several items, `plm report coverage --by <field>` and `--allocation`.
* Validation: `derives-from` link type with stale parameter values, warning for a missing required attribute of a draft item, artifacts and versions limited to Git-tracked files.
* Removed: `plm init`.

## 0.1.0

Proof of concept: core library, traceability engine, `plm` CLI and VS Code extension.
