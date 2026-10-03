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

Not yet implemented: releases, test runs, configurations, impact analysis, search, ReqIF, VS Code extension, static site and CI.

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
mkdir wing && cd wing
plm init
```

Each item lives in `items/<ID>/item.yaml` with its artifacts beside it; its status and links are in `meta/<ID>.yaml`.

Create a requirement and a part, link them, and confirm the link, which records the requirement's current version. `plm new` prints the new ID:

```sh
REQ=$(plm new requirement --title "Wing shall carry 3g")
PRT=$(plm new part --title "Main spar")
plm link $PRT satisfies $REQ
plm confirm $PRT
git add -A && git commit -m "Spar satisfies load requirement"
```

After editing the requirement's `item.yaml`, list suspect links with what changed since confirmation, validate the repository, and show the part with its version and links:

```sh
plm suspects --diff
plm validate
plm show $PRT
```

Use `-C <dir>` to work on another repository and `--format json` for machine-readable output. Exit codes: 0 success, 1 findings, 2 usage error, 3 internal error.
