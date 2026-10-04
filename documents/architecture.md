# Architecture and Toolchain

## Principles

* **Git is the engine.** The product definition is a Git repository of plain-text files; Git provides versioning, history and configuration management (CR-12, CR-15).
* **Local and remote.** Engineers work locally with VS Code and a CLI; a Git host provides overview, reviews and change requests.
* **Host-agnostic**, so programs can self-host for export control.
* **Integrate, don't replace.** CAD, analysis and test tools stay; their outputs become artifacts. Text-based tools (KiCad, WireViz) are preferred because Git can diff them.

## Product repository

```
plm.yaml                      repository settings
<ID>-<title>/item.yaml        top-level item: attributes, used items
<ID>-<title>/requirements/    the item's requirements, one file each
<ID>-<title>/tests/           the item's test cases
<ID>-<title>/<ID>-<title>/    nested items
<ID>-<title>/...              the item's artifacts
runs/<ID>-<title>/            test runs with their logs
meta/<ID>.yaml                owner, status, links
```

* **Items** (CR-01) have a stable ID and a type with its own schema (CO-02.5).
* **Composition** (CR-02): folders nest; `uses` lists items reused from elsewhere, e.g. standard parts.
* **Artifacts** (CR-03) are files in the item directory; binaries use Git LFS with locking. CAD is stored natively plus a STEP export.
* **Relationships** (CR-06) are typed links in `meta/<ID>.yaml` (`satisfies`, `verifies`, `implements`, …).
* **Requirements** are items, stored in the `requirements/` folder of the item they specify, so one link and suspect mechanism covers all disciplines. Certification basis paragraphs are requirement items, enabling compliance tracing.

## Releases

* Protected branches forbid history rewriting, so stored hashes stay resolvable.
* A **release** is a reviewed merge into the protected branch (CR-12, CR-14). An item's released versions are its versions on that branch; earlier ones are retrieved by commit. Nothing is frozen: items evolve independently.

## Change and verification

* **Change requests** use the host's issues and merge requests; the host provides permissions and approvals (CR-13, CR-14, CR-17).
* **Tests** execute externally (CI, HIL rigs) and report via the CLI; manual results are entered in VS Code.

## Components

See [components.md](components.md).

## Toolchain

| Area | Choice |
|---|---|
| Language | TypeScript (Node.js 22) |
| Versioning | Git, Git LFS |
| Tooling | npm, Vitest |
