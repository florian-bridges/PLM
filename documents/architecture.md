# Architecture and Toolchain

## Principles

* **Git is the engine.** The product definition is a Git repository of plain-text files; Git provides versioning, history and configuration management (CR-12, CR-15).
* **Local and remote.** Engineers work locally with VS Code and a CLI; a Git host provides overview, reviews and change requests.
* **Host-agnostic**, so programs can self-host for export control.
* **Integrate, don't replace.** CAD, analysis and test tools stay; their outputs become artifacts. Text-based tools (KiCad, WireViz) are preferred because Git can diff them.

## Product repository

```
plm.yaml                repository settings
items/<ID>/item.yaml    item content: attributes, children
items/<ID>/...          the item's artifacts
meta/<ID>.yaml          owner, status, revision, links
configurations/*.yaml   product variants
```

* **Items** (CR-01) have a stable ID and a type with its own schema: requirement, specification, part, assembly, COTS part, harness, interface, software, test case, test run. Directories are flat, so items can be reused in several assemblies. Retired items are kept (CR-04).
* **Composition** (CR-02): `item.yaml` lists child IDs.
* **Artifacts** (CR-03) are files in the item directory; binaries use Git LFS with locking. CAD is stored natively plus a STEP export; CI derives lightweight glTF for viewing.
* **Relationships** (CR-06, CR-08) are typed links in `meta/<ID>.yaml` (`satisfies`, `verifies`, `implements`, …). Links may target other repositories at a pinned commit, e.g. software.
* **Interfaces** are items linked to both sides (e.g. avionics and structure), so a change on either side raises suspect links.
* **Requirements** are items, so one link and suspect mechanism covers all disciplines; VS Code shows them as a document. ReqIF import and export connect DOORS and Polarion (CR-16). Certification basis paragraphs are requirement items, enabling compliance tracing.

## Traceability engine

* An item's **version** is a hash of its directory's **Git tree hash** and its children's versions. Changes propagate to all ancestors.
* Confirming a link stores the target's version with the link (CR-07). Links, owner and status live in `meta/`, outside item directories, so confirming, releasing or reassigning changes no version.
* A link is **suspect** when the target's version has changed; `git diff` shows what changed. Any change, even a typo fix, raises suspects; re-confirmation is part of review (CR-09).
* Protected branches forbid history rewriting, so stored hashes stay resolvable.
* Item history is the Git log of its directory and meta file.
* Released revisions (A, B, …) and baselines are annotated Git tags (CR-12).

## Configurations, change and verification

* **Baselines** are Git tags (CR-11).
* **Variants** are configuration files selecting items.
* **Change requests** use the host's issues and merge requests; the host provides permissions and approvals (CR-13, CR-14, CR-17).
* **Test runs** record SUT version, result and logs. Tests execute externally (CI, HIL rigs) and report via the CLI; manual results are entered in VS Code.

## Components

Core library, traceability engine, CLI, VS Code extension, CI integration and static site; see [components.md](components.md).

## Toolchain

| Area | Choice |
|---|---|
| Language | TypeScript (Node.js 22) |
| Versioning | Git, Git LFS |
| Data | YAML, JSON Schema (Ajv) |
| CLI | Commander |
| 3D | three.js, occt-import-js |
| Static site | Astro |
| Tooling | npm, ESLint, Prettier, Vitest |
| CI | GitHub Actions, GitLab CI |

VS Code extensions require TypeScript; one codebase then serves CLI, extension and site.
