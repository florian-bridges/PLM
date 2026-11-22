# Setting up a PLM project

Starting a product repository means three decisions: how to lay out items, whether to extend a built-in type or add a new one, and whether to declare variants. `plm --help` and `plm help <topic>` give exact syntax; this page gives the trade-offs.

## Product layout

A repository holds `plm.yaml` at its root and one or more top-level items, each a folder with an `item.yaml`; items nest below their parent to mirror the product's subsystems, each holding its own `requirements/` and `tests/`.

* **One top-level item**, e.g. `widget/item.yaml` nesting `widget/control/` and `widget/housing/`: one tree shows the whole product, and `plm report parts`/`coverage` with no argument total it.
* **Several top-level items**, e.g. `control/item.yaml` and `housing/item.yaml` with no common parent: subsystems own disjoint folders, but nothing above them ties totals or requirements together.

**Recommendation:** nest subsystems under one top-level item; reach for several top-level items only when a subsystem is released and reused on its own, pulled in elsewhere by `uses`.

## Project types vs. extending built-ins

Beyond the built-in types (`requirement`, `test-case`, `test-run`, `assembly`, `part`, `port`, `connection`), a `types/<type>.yaml` file broadens them three ways:

1. **Extend a built-in by name**, e.g. `types/requirement.yaml` adding a field: every item of that type gets it.
2. **A new type with `base: <built-in>`**, e.g. `types/inspection.yaml` with `base: test-case`: keeps the base's folder, confirmation and suspect-link behaviour, but its own ID prefix and fields, so it is told apart in searches and reports.
3. **A freestanding new type**, e.g. `types/photo.yaml` with its own `prefix` and `folder`: a kind with no built-in behaviour to reuse.

**Recommendation:** extend a built-in (1) for an extra attribute on an existing kind; use `base` (2) when the new kind must be distinguished from the built-in it behaves like; define a freestanding type (3) only when no built-in's folder or behaviour fits.

## Variants

`plm.yaml`'s `config` declares parameters that a `uses` entry's `when` selects for, e.g. a part sold in two finishes and tracked by serial number:

```yaml
config: {finish: [matte, gloss], serial: ordered}
```

A listed parameter (`finish`) keeps `plm validate`'s check of every combination small and fits a fixed set of variants; an `ordered` parameter with `from`/`to` ranges (`serial`) fits a value that changes over production, but each additional range multiplies the combinations validated.

**Recommendation:** model fixed variants as listed parameters; reserve `ordered` parameters for values that track change over time, such as serial numbers, and keep the parameter count small.
