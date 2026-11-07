# Changelog

## 0.2.0 (2026-11-07)

First public release, MIT licensed, installable from the Git tag: `npm i -g github:florian-bridges/PLM#v0.2.0`.

* Configuration: home folder per item type (`folders:`), fields that leave links current (`informative:`), item parameters (`parameter_states:`), `schemas/meta.schema.json`.
* Commands: `plm set`, `plm get`, `plm list <field>`, `plm link --remove`, links to one file of an item (`<ID>/<path>`), `plm test record --sut` with several items, `plm report coverage --by <field>` and `--allocation`.
* Validation: `derives-from` link type with stale parameter values, warning for a missing required attribute of a draft item, artifacts and versions limited to Git-tracked files.
* Removed: `plm init`.

## 0.1.0

Proof of concept: core library, traceability engine, `plm` CLI and VS Code extension.
