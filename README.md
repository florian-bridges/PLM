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
printf 'prefixes: {assembly: ASM-, requirement: REQ-, part: PRT-}\n' > plm.yaml
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
prefixes: {assembly: ASM-, part: PRT-, requirement: REQ-, test-case: TC-, test-run: RUN-, analysis: ANA-}
folders: {analysis: analyses}   # home folder per type; defaults: requirements, tests, runs
informative: [rationale, links] # fields whose change leaves links current
parameter_states: [provisional, final]
```

Built-in types are `requirement`, `assembly`, `part`, `test-case` and `test-run`. An item holds only the fields its type's JSON Schema declares. A project type, such as `analysis` above, needs an ID prefix and a schema in `schemas/<type>.schema.json`; the same file for a built-in type extends it, e.g. `schemas/requirement.schema.json` with `{"properties": {"rationale": {"type": "string"}}}`. `schemas/meta.schema.json` validates `meta/<ID>.yaml`.

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
