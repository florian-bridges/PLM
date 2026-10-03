# Aerospace Engineering PLM

An open-source PLM tool for managing the engineering definition of aerospace products.

## Purpose

Collect and connect the artifacts created during aircraft development:

* Requirements
* Structure
* CAD
* Electrical & EWIS
* Software
* Avionics
* Analysis
* Tests
* Documentation

The product is represented as a hierarchical engineering structure with traceability between its items and artifacts.

## Core principles

* Engineering-first
* Artifact-centric
* Hierarchical product definition
* Versioned traceability
* Reproducible configurations
* Explicit change history
* Open source

## Scope

The project covers **engineering development and configuration management**.

Manufacturing and service management are out of scope.

## Documentation

* [Requirements](documents/requirements.md) and [user scenarios](documents/scenarios.md)
* [Architecture](documents/architecture.md)
* [Component](documents/components.md) and [low-level requirements](documents/low-level-requirements.md)

## Status

Proof of concept: a `plm` CLI with the core library and traceability engine. Item versions are derived from Git, links record the version they were confirmed against, and changed targets make links suspect.

A release is a reviewed merge into the protected `main` branch; there are no revisions or baselines, and an item's earlier released versions are its states at earlier commits of `main`.

Not yet implemented: search, VS Code extension, static site and CI.

## Getting started

Requires Node.js 22.18 or later and Git.

```sh
npm install
npm run build
npm link
npm test
```

Without `npm link`, run the CLI from source with `node src/cli.ts`.

A product repository is a Git repository with a `plm.yaml` defining ID prefixes. Create one in an empty folder:

```sh
mkdir my-product && cd my-product
plm init
```

Items are folders named `<ID>-<title>`, nested to form the product structure. Each holds its `item.yaml`, its artifacts and a `requirements/` folder with one file per requirement. Status and links are kept in `meta/<ID>.yaml`. `plm new` creates an item inside the item folder you are in, or at the top of the repository, and prints its ID:

```sh
AC=$(plm new assembly "My aircraft")
cd $AC-my-aircraft
REQ=$(plm new requirement "Carry 3g")
PRT=$(plm new part "Main spar")
```

```
my-product/
  plm.yaml
  meta/
  ASM-J8G0S2-my-aircraft/
    item.yaml
    requirements/REQ-A6SVG9-carry-3g.yaml
    PRT-975P5Y-main-spar/item.yaml
```

Link the part to the requirement and confirm the link, which records the requirement's current version and title, who confirmed it and when, and the commit if the requirement is committed:

```sh
plm link $PRT satisfies $REQ
plm confirm $PRT
git add -A && git commit -m "Spar satisfies load requirement"
```

After editing the requirement file, list suspect links with what changed since confirmation, validate the repository, and show the part with its version and links:

```sh
plm suspects --diff
plm validate
plm show $PRT
```

Before merging, list what a change affects compared with `main`: items whose own files changed, items changed through them, links that became suspect and test runs no longer current. Without `..<head>` the working tree is compared:

```sh
plm impact main
plm impact main..my-branch
```

Test cases live in the `tests/` folder of the item they test, so adding or changing one changes the item's version and outdates its runs. Test runs live in the top-level `runs/` folder, so recording one changes no version. Create a test case in the aircraft folder, link it to the requirement, commit, then record a run against the tested item. Recording confirms the run's links against the committed versions, refuses uncommitted changes and copies the logs:

```sh
TC=$(plm new test-case "Static load")
plm link $TC verifies $REQ
plm confirm $TC
git add -A && git commit -m "Static load test"
plm test record $TC --sut $AC --result pass --log rig.log
plm report coverage $AC
```

`plm report coverage` lists each requirement as verified, pending (a test case exists but has no current passing run) or unverified. A change to the tested item makes its runs outdated, and its requirements fall back to pending, naming the outdated runs. `plm suspects` does not list run links: they are evidence of what was tested, not links to review.

To reuse an item elsewhere, such as a standard part, list its ID under `uses:` in the `item.yaml` of the assembly using it.

`plm` works from any folder inside the repository. Use `-C <dir>` to run it as if in another folder and `--format json` for machine-readable output. Exit codes: 0 success, 1 findings, 2 usage error, 3 internal error.
