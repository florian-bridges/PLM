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

## Configuration

`plm.yaml` marks the repository root:

```yaml
informative: [rationale, links] # fields whose change leaves links current
parameter_states: [provisional, final]
```

Built-in types, with ID prefix and home folder, are `requirement` (`REQ-`, `requirements`), `test-case` (`TC-`, `tests`), `test-run` (`RUN-`, `runs`), `assembly` (`ASM-`) and `part` (`PRT-`). An item holds only the fields its type declares. A project type is defined by a file `types/<type>.yaml`; all its keys are optional, but `plm new` needs a `prefix`:

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
```

A file named after a built-in type extends or overrides it, e.g. `types/requirement.yaml` with `fields: {rationale: {type: string}}`. `types/meta.yaml` gives the fields of `meta/<ID>.yaml`. `plm validate` reports any other key in a type file as error `type-file`.

`schemas/`, `templates/` and `plm.yaml`'s `prefixes` and `folders` are no longer read; convert them by hand:

| Before | After |
|---|---|
| `schemas/<type>.schema.json` `properties` / `required` | `fields` / `required` in `types/<type>.yaml` |
| `templates/<type>.yaml` | `template:` in `types/<type>.yaml` |
| `schemas/meta.schema.json` | `types/meta.yaml` |
| `prefixes: {analysis: ANA-}` in `plm.yaml` | `prefix: ANA-` in `types/analysis.yaml` |
| `folders: {analysis: analyses}` in `plm.yaml` | `folder: analyses` in `types/analysis.yaml` |

A schema that uses keywords other than `properties` and `required` cannot be carried over.

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
