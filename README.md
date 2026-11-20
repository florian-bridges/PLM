# PLM

`plm` is a command-line tool for product lifecycle management in a Git repository. A product is split into items: assemblies, parts, requirements, test cases, test runs and the types a project adds. Each item is a folder with an `item.yaml`, and nesting is the product structure, so every subsystem holds its own requirements and tests. Links (`satisfies`, `implements`, `verifies`, ...) record the version of their target when confirmed and turn suspect when it changes. Versions come from Git; there is no database or server.

## Install

Requires Node.js 22.18 or later and Git. Install the package of a [release](https://github.com/florian-bridges/PLM/releases):

```sh
npm install -g https://github.com/florian-bridges/PLM/releases/download/v0.3.0/plm-0.3.0.tgz
```

## Quickstart

```sh
git init product && cd product
touch plm.yaml
SYS=$(plm new assembly "Drone") && cd drone      # plm new prints the new ID
REQ=$(plm new requirement "Takeoff mass")        # drone/requirements/takeoff-mass.yaml
plm set $REQ text "The drone shall have a takeoff mass of at most 2 kg."
PRT=$(plm new part "Frame")                      # drone/frame/item.yaml
plm link $PRT satisfies $REQ && plm suspects     # unconfirmed
plm confirm $PRT && plm validate && git add -A && git commit -m "Drone"
plm set $REQ text "The drone shall have a takeoff mass of at most 1.8 kg."
plm suspects; plm show $PRT                      # suspect until confirmed again
```

`plm --help` lists all commands, among them `search`, `impact <base>[..<head>]`, `test record` and `report coverage`. `plm` works from any folder of the repository; `--format json` gives machine-readable output. Exit codes: 0 success, 1 findings, 2 usage error, 3 internal error.

## Use by LLM agents

PLM suits an LLM coding agent as well as a human: items are plain YAML files the agent reads and diffs like code, and the commands above script cleanly, since `plm new` prints the ID and `--format json` and the exit codes replace parsing prose. Before it commits, an agent runs `plm validate` (schema errors), `plm suspects` (links unconfirmed after a change) and `plm impact` (what a change in a range may affect).

The same three commands check a pull request in any CI service; set `BASE`/`HEAD` to its range and run this in a job:

```sh
s=0
plm validate || s=1
plm suspects || s=1
plm impact "$BASE..$HEAD"     # also fails on a released item changed without a status change
exit $s
```

## Configuration

`plm.yaml` marks the repository root:

```yaml
informative: [rationale, links] # fields whose change leaves links current
parameter_states: [provisional, final]
released_states: [released]     # plm impact fails on a changed item in one of these
```

Built-in types, with ID prefix and home folder, are `requirement` (`REQ-`, `requirements`), `test-case` (`TC-`, `tests`), `test-run` (`RUN-`, `runs`), `assembly` (`ASM-`), `part` (`PRT-`), `port` (`PORT-`, `ports`) and `connection` (`CON-`, `connections`, `connects` to its ports, `implements` like a requirement). An item holds only the fields its type declares. A project type is defined by a file `types/<type>.yaml`; all its keys are optional, but `plm new` needs a `prefix`:

```yaml
# types/analysis.yaml
prefix: ANA-
folder: analyses     # home folder inside the parent item
template:            # what `plm new analysis "<title>"` writes besides id, type, title
  method: simulation
fields:              # JSON Schema properties, written in YAML
  method: {enum: [simulation, test, review]}
  tool: {type: string}
required: [method]
files:               # <name>: JSON Schema checking that YAML file in an item's folder
  icd.yaml: {type: object, required: [pins]}
```

A file named after a built-in type extends or overrides it, e.g. `types/requirement.yaml` with `fields: {rationale: {type: string}}`. `types/meta.yaml` gives the fields of `meta/<ID>.yaml`. With `base: test-case`, e.g. in `types/inspection.yaml`, a type behaves as a test case and has its fields, required, files, home folder and, unless set, prefix; `folder` is then not allowed. `plm validate` reports any other key in a type file as error `type-file`.

`schemas/`, `templates/` and `plm.yaml`'s `prefixes` and `folders` are no longer read; convert them by hand:

| Before | After |
|---|---|
| `schemas/<type>.schema.json` `properties` / `required` | `fields` / `required` in `types/<type>.yaml` |
| `templates/<type>.yaml` | `template:` in `types/<type>.yaml` |
| `schemas/meta.schema.json` | `types/meta.yaml` |
| `prefixes: {analysis: ANA-}` in `plm.yaml` | `prefix: ANA-` in `types/analysis.yaml` |
| `folders: {analysis: analyses}` in `plm.yaml` | `folder: analyses` in `types/analysis.yaml` |

A schema that uses keywords other than `properties` and `required` cannot be carried over.

## Ports and connections

A `port` (built in, `PORT-`, folder `ports`) is where an item meets another; a `connection` (`CON-`, folder `connections`) joins ports with a `connects` link and may `implement` a requirement like any item. A port's interface data is a YAML artifact, e.g. `icd.yaml`, checked against the type's `files` schema (Configuration). A directed port type adds `required: [role]` and `fields: {role: {enum: [sender, receiver]}}`; no new key.

`plm report connections [<item>]` lists ports no `connects` link reaches (`open`), connections with fewer than two ports (`few`) and connections whose ports' `role` is not exactly one `sender` (`senders`); exit 1 if any.

`plm report document [<item>]` prints the requirements document the VS Code extension shows, as Markdown, for the repository or an item's subtree.

## Occurrences and BOM views

A `uses` entry is an item ID, used once, or `{item, quantity, ref}` for a repeated or distinguished occurrence; `plm list uses <item>` lists the entries. `plm report parts [<item>]` totals each item reached through nesting and `uses` below it, or below the top-level items. A BOM view is a root of its own type using the same parts; views are compared by diffing their `report parts --format json` output.

## Configurations

`plm.yaml`'s `config: {variant: [standard, extended], serial: ordered}` declares parameters; a `uses` entry's `when: {variant: [extended], serial: {from: 57}}` selects it for a configuration given as `--config variant=extended,serial=57` (unnamed parameters always match). `plm show --down`/`--up` and `plm report parts`/`coverage` follow only entries selected by `--config`; without it, and for versions and `plm validate`, every entry counts. `plm validate` reports an undeclared parameter or value, or a range on a listed one (`config`), and two or more entries of one item sharing a `ref` that, under some configuration, are selected together (`ambiguous-use`) or none selected (`empty-use`), also in the gaps between ranges. An unknown parameter or value in `--config` is a usage error.

## Revisions and baselines

An item's revision is its version (`plm show`), computed from its own content, what it uses and the parameters it cites; its history is `git log -- <folder>`. A human-readable revision label, if wanted, is a type field like any other; maturity is tracked in `status`. There is no separate baseline object: a release is a Git tag, and `plm impact` fails when an item released at base (`status` in `released_states`, default `[released]`) changed its own files without its status changing.

## Documentation

[`documents/`](documents/) holds the user scenarios, requirements, architecture, and component and low-level requirements. A VS Code extension is in [`extension/`](extension/) (`npm run build:ext`, run from source).

## Development

```sh
npm install     # also builds dist/
npm test
npm run typecheck
```

Changes follow [`CLAUDE.md`](CLAUDE.md): requirements first, traceable code and tests, word limits.

## License

MIT, see [LICENSE](LICENSE).
