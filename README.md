# PLM

`plm` is a command-line tool for product lifecycle management in a Git repository. A product is split into items: assemblies, parts, requirements, test cases, test runs and the types a project adds. Each item is a folder with an `item.yaml`, and nesting is the product structure, so every subsystem holds its own requirements and tests. Links (`satisfies`, `implements`, `verifies`, ...) record the version of their target when confirmed and turn suspect when it changes. Versions come from Git; there is no database or server.

## Install

Requires Node.js 22.18 or later and Git. Install the package of a [release](https://github.com/florian-bridges/PLM/releases):

```sh
npm install -g https://github.com/florian-bridges/PLM/releases/download/v0.11.1/plm-0.11.1.tgz
```

## Quickstart

```sh
git init product && cd product
touch plm.yaml
SYS=$(plm new assembly "Widget") && cd widget    # plm new prints the new ID
REQ=$(plm new requirement "Mass")                # widget/requirements/mass.yaml
plm set $REQ text "The widget shall have a mass of at most 2 kg."
PRT=$(plm new part "Frame")                      # widget/frame/item.yaml
plm link $PRT satisfies $REQ && plm suspects     # unconfirmed
plm confirm $PRT && plm validate && git add -A && git commit -m "Widget"
plm set $REQ text "The widget shall have a mass of at most 1.8 kg."
plm suspects; plm show $PRT                      # suspect until confirmed again
```

`plm --help` lists every command and option with an example; `plm help <topic>` covers `structure`, `interfaces`, `variants` and `files`. See [`docs/setup.md`](docs/setup.md) for setting up a new product repository, and [`documents/`](documents/) for PLM's own requirements.

## Development

```sh
npm install     # also builds dist/
npm test
npm run typecheck
npm run build:ext   # VS Code extension, run from source
```

Changes follow [`CLAUDE.md`](CLAUDE.md): requirements first, traceable code and tests, word limits.

## License

MIT, see [LICENSE](LICENSE).
