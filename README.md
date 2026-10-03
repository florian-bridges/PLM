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
npm run build && npm link   # or run from source: node src/cli.ts
npm test
```

A product repository is a Git repository with a `plm.yaml` defining ID prefixes:

```yaml
prefixes:
  requirement: REQ-
  part: PRT-
```

Each item lives in `items/<ID>/item.yaml` with its artifacts beside it; its status and links are in `meta/<ID>.yaml`.

```sh
plm new requirement --title "Wing shall carry 3g"   # prints e.g. REQ-N3KJWJ
plm new part --title "Main spar"                    # prints e.g. PRT-DYB7WG
plm link PRT-DYB7WG satisfies REQ-N3KJWJ            # add an unconfirmed link
plm confirm PRT-DYB7WG                              # record the target's current version
git add -A && git commit -m "Spar satisfies load requirement"

# after editing the requirement:
plm suspects --diff     # suspect links and what changed since confirmation
plm validate            # schema, IDs, link targets and types, cycles
plm show PRT-DYB7WG     # item, version and links with their state
```

Use `-C <dir>` to work on another repository and `--format json` for machine-readable output. Exit codes: 0 success, 1 findings, 2 usage error, 3 internal error.
