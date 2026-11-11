# Changelog

## Unreleased

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
