# Changelog

## Unreleased

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
