# Concept: one product definition across disciplines

Status: draft for discussion, 2026-11-11. Not yet requirements; nothing here is implemented.

## 1. Idea

A product repository holds every development artifact of every discipline in one tree, changed through the Git workflow. Three rules carry it:

1. **The folder tree is the breakdown by design responsibility.** Discipline is an item's owner and type, never a branch of the tree. A unit's mechanical, electrical and software parts nest inside the unit.
2. **An item sits in one place; every other relation is a link.**
3. **Disciplines meet at ports and connections.** A *port* is one side of an interface and belongs to the unit that has it. A *connection* joins ports and belongs to the lowest assembly containing all of them. A connection links to its ports, so a port change turns the connection suspect until its owner confirms it.

Rule 3 covers electrical, mechanical and software interfaces alike. Mounting a unit in a structure is a mechanical connection, so no separate installation tree is needed.

## 2. User stories

By role, as asked:

**Systems engineer**
- S1. Split the product into subsystems regardless of discipline and assign each an owner.
- S2. Define the connections between subsystems and see ports nobody has connected.
- S3. See, before a change is merged, which connections and requirements it touches, and who owns them.
- S4. Allocate requirements to subsystems and to connections.

**Avionics engineer**
- A1. Own a unit as one item holding its board, housing and firmware with their native design files.
- A2. Declare the unit's ports (bus, power, mounting) without waiting for the other side.
- A3. Be told when a connection to one of the unit's ports no longer matches what was agreed.
- A4. Keep a cable or harness as a part that realises a connection.

**Structures engineer**
- T1. Own structural assemblies and parts with CAD, drawings and analyses as artifacts.
- T2. Declare the mounting provisions a structure offers as ports.
- T3. Publish mass and loads as parameters others cite instead of copying.
- T4. Be told when a mounted unit changes its mounting port.

Generalised for `scenarios.md`, these collapse into one change and one addition. S1, S4, A1, T1 and T3 are already US-1, US-2, US-8 and US-11; S3, A3 and T4 are US-10 once connections exist.

> **US-2 — Design engineer** *(changed)*
> Breaks the product into nested subsystems, attaches design artifacts to an item, links each design to the requirements it satisfies, **and declares the ports through which the item meets others**.
>
> **US-12 — Integrator** *(new)*
> Joins the ports of an assembly's items into connections, finds ports left open, and confirms a connection again when one of its ports changes.

## 3. Architecture

The four components stay: core, traceability engine, CLI, extension. `port` and `connection` become **built-in item types** with home folders `ports` and `connections` and a built-in `connects` link from connection to port. They reuse loading, versions, confirmation, suspects, impact, search and ownership unchanged.

**A project defines its own types in YAML.** One file `types/<type>.yaml` holds everything about a type: the built-in type it is based on, its template and its fields. It replaces today's `schemas/<type>.schema.json` and `templates/<type>.yaml`, so a project's setup is YAML throughout. A new bus is a new type based on `port`; the tool names no bus or joint. The same file serves any other project type, such as an analysis or a hazard.

A port type may be *directed*: its ports are a `sender` or a `receiver`, and a connection of them needs exactly one sender. A one-way bus is directed; a network bus or a bolted joint is not. A connection has no kind of its own: it is of the type of its ports, which must all be the same.

**Every port and every connection is a folder** with an `item.yaml`, never a single file, so files can be attached to any of them without changing its shape.

| # | Addition | Component | Why it is needed |
|---|---|---|---|
| 1 | **Type definitions** `types/<type>.yaml` with `base`, `template`, `fields`, `required`, replacing the JSON schema and template files | core (CO-02.1), CLI (CL-02.1) | One place and one format per type; lets a project add port types. |
| 2 | **Types `port` and `connection`**, link `connects`, `directed` port types | core (CO-01.1, CO-02.5, CO-02.6) | A2, T2, S2: `plm new port` works in any repository. |
| 3 | **Interface report** `plm report connections`, per item subtree: open ports; a connection whose ports differ in type; fewer than two ports; a directed connection without exactly one sender. Exit 1 on any. | engine (next to TE-06), CLI (CL-01.1) | S2, A3. Kept out of `validate` and `report coverage` so each audience sees only its own findings. |
| 4 | **Incoming links in views**: a port shows its connections | CLI `show`, extension VS-04 | A3, T4. The engine already returns incoming link states (`src/links.ts:38`), so likely display only. |

`validate` gains only what makes the files well-formed: a type file that is invalid or names an unknown base, and a port of a directed type without a role.

**Two audiences, two sets of checks.** The person who keeps the definition *consistent* — requirements linked, approved and covered by test cases — uses `validate`, `suspects` and `report coverage` as today and never sees an electrical finding. The engineer who designs the interfaces uses `report connections`. Neither report contains the other's findings, and a CI gate chooses which of them block a merge. Whether a design is *right* (levels, timing, loads, fit) stays that engineer's judgement, recorded by confirming the link or in a review (US-9).

Deliberately not added:

- **No signal, pin or message model.** Detail below the port is fields of its type or attached files.
- **No discipline field, no second tree, no installation link.** Owner, type and connections cover them.
- **No change-request feature and no reviewer routing.** Branch, `plm impact`, review and merge already are the workflow; section 5 shows it.
- **No project-defined link types here.** Issue #20 stays separate. A cable `implements` its connection, which only widens that link's allowed target.

## 4. File structure

```
plm.yaml                         repository settings
types/                           the project's types, one YAML file each
├─ serial.yaml                   base: port, directed
├─ network.yaml                  base: port
├─ mechanical.yaml               base: port
└─ software.yaml                 a plain project type
product/                         assembly    owner: systems
├─ item.yaml
├─ requirements/
├─ frame/                        assembly    owner: structures
│  ├─ item.yaml                  parameters: mass
│  ├─ frame.step                 artifact (Git LFS)
│  ├─ analyses/load-case-1/      analysis with script and report
│  └─ ports/
│     └─ bay-mounting/item.yaml  type: mechanical
├─ control/                      assembly    owner: systems
│  ├─ requirements/
│  ├─ control-unit/              assembly    owner: electronics
│  │  ├─ housing/                part        housing.step
│  │  ├─ board/                  part        board.kicad_sch, board.kicad_pcb
│  │  ├─ firmware/               software    Git submodule or sources
│  │  └─ ports/
│  │     ├─ mounting/item.yaml   type: mechanical
│  │     └─ actuator-bus/        type: serial
│  │        ├─ item.yaml
│  │        └─ pinout.csv
│  ├─ actuator/
│  │  └─ ports/actuator-bus/item.yaml
│  ├─ cable/                     part, implements the bus connection
│  └─ connections/
│     └─ unit-actuator-bus/item.yaml      inside `control`
├─ connections/
│  └─ unit-mounting/item.yaml             across `frame` and `control`
meta/<ID>.yaml                   owner, status, confirmations
```

`plm.yaml` keeps repository-wide settings only, for example:

```yaml
informative: [rationale, links]
```

`types/software.yaml`, a type with no base:

```yaml
prefix: SW-
fields:
  language: {type: string}
```

`types/serial.yaml`:

```yaml
base: port                # the tool treats items of this type as ports;
                          # prefix PORT- and folder ports/ come from the base
directed: true            # one sender, any number of receivers
template:                 # what `plm new serial "<title>"` writes
  role: sender
  baud: 115200
fields:                   # JSON Schema properties, written in YAML
  baud: {type: integer}
  levels: {enum: [rs232, rs422, ttl]}
required: [baud]
```

`control/control-unit/ports/actuator-bus/item.yaml`:

```yaml
id: PORT-7K2M4Q
type: serial
title: Actuator bus
role: sender
baud: 115200
levels: rs422
text: Pin assignment in `pinout.csv`.
```

`control/connections/unit-actuator-bus/item.yaml`:

```yaml
id: CON-3F9XTB
type: connection
title: Control unit to actuator
links:
  - {type: connects, target: PORT-7K2M4Q}
  - {type: connects, target: PORT-B81N0C}
  - {type: satisfies, target: REQ-5T0WJA}
```

The cable's `item.yaml` holds `{type: implements, target: CON-3F9XTB}`.

## 5. A change through the Git workflow

1. The electronics engineer branches and changes `pinout.csv` of the actuator bus port.
2. `plm impact main` lists `PORT-7K2M4Q` as changed and the link from `CON-3F9XTB` as suspect, with its owner.
3. The merge request runs `plm validate` and `plm suspects` in CI; the suspect blocks the merge.
4. The integrator reviews the diff, has the cable and the actuator side adapted on the same branch if needed, and runs `plm confirm CON-3F9XTB`.
5. The merge into the protected branch is the release.

## 6. Decisions

1. **Depth: port level** (2026-11-11). A port is the smallest unit the tool versions and flags; signals are not items.
2. **Role: by port type** (2026-11-12). Direction depends on the bus, so a port type is declared directed or not and only ports of a directed type carry a role. The role is on the port, not on the link.
3. **Built in** (2026-11-12). `port` and `connection` ship with the tool.
4. **Interface checks are a report of their own** (2026-11-12). Consistency means traceability: requirements linked, approved and tested. Its owner is not interested in electrical properties, so interface findings never appear in `validate` or `report coverage`. Placement of a connection in the tree is not checked.
5. **No reviewer routing** (2026-11-12).
6. **Project types in YAML** (2026-11-12). `types/<type>.yaml` holds base, template and fields; no JSON in a project's setup. A new bus is a new port type.
7. **One shape per type** (2026-11-12). A requirement is always a single `<name>.yaml`; an item of any other type, ports and connections included, is always a folder `<name>/item.yaml`, so a port can own its interface drawing. The other shape is no longer read and `validate` reports it.
8. **Prefix and folder in the type file** (2026-11-12). A type is defined in one place; `plm.yaml` keeps repository-wide settings only. Built-in types have a default prefix and folder; a type inherits those of its base unless its file sets them.
9. **Manual migration** (2026-11-12). `schemas/*.schema.json`, `templates/*.yaml` and `prefixes`/`folders` in `plm.yaml` are no longer read; existing repositories are converted by hand.

## 7. Development

See [multi-discipline-plan.md](multi-discipline-plan.md). Reading the code showed that two points need no work: the loader already reads one shape per type (decision 7), and `plm show` already lists the links to an item (addition 4).
