# Walkthrough: ports and connections

Companion to [multi-discipline.md](multi-discipline.md). One worked example: a flight computer that talks to a servo over ARINC 429, sits on a CAN bus, and is bolted into the fuselage.

Everything marked **new** is proposed and not implemented; the rest works today. Command output is illustrative: its exact wording is not designed yet.

## 1. Project setup

The project describes each of its port types in one YAML file under `types/` (**new**). This replaces the JSON schema and the template file a project type needs today.

```
plm.yaml                  repository-wide settings only
types/
├─ arinc429.yaml
├─ can.yaml
└─ mechanical.yaml
```

`types/arinc429.yaml`:

```yaml
base: port                # the tool treats items of this type as ports;
                          # prefix PORT- and folder ports/ come from the base
directed: true            # one sender, any number of receivers
template:                 # what `plm new arinc429 "<title>"` writes
  role: sender
  speed: high
fields:                   # JSON Schema properties, written in YAML
  speed: {enum: [low, high]}
  labels: {type: array, items: {type: string}}
required: [speed]
```

`types/can.yaml`:

```yaml
base: port                # not directed: every port takes part alike
template: {bitrate: 500000}
fields:
  bitrate: {type: integer}
  termination: {type: boolean}
required: [bitrate]
```

`types/mechanical.yaml`:

```yaml
base: port
fields:
  max_mass_kg: {type: number}
```

The tool knows `port` and "directed or not". The names `arinc429` and `can` and their fields belong to the project; a new bus is one more file.

## 2. A unit owner declares ports

The avionics engineer owns the flight computer:

```sh
cd aircraft/flight-control/flight-computer
plm new arinc429 "Servo command out"     # creates ports/servo-command-out/item.yaml, prints PORT-7K2M4Q
```

The file starts from the type's template:

```yaml
id: PORT-7K2M4Q
type: arinc429
title: Servo command out
role: sender
speed: high
```

A port is always a folder, so files are attached by putting them next to `item.yaml`:

```
flight-computer/ports/servo-command-out/
├─ item.yaml
└─ labels.csv        signal detail: versioned, not interpreted by PLM
```

The structures engineer does the same on their side, for a port type with no role:

```sh
cd aircraft/fuselage
plm new mechanical "Avionics bay tray"   # ports/avionics-bay-tray/item.yaml
```

```yaml
id: PORT-M3D8RA
type: mechanical
title: Avionics bay tray
max_mass_kg: 2.5
text: Four M5 inserts, pattern in `tray.step`.
```

Neither owner needs the other side to exist yet. `plm new port "<title>"` also works, for a port without project fields.

## 3. The integrator joins ports

`connection` and the `connects` link are **new** and built in. A connection lives in the assembly that contains both sides, and is always a folder too:

```sh
cd aircraft/flight-control
C1=$(plm new connection "FC to servo command")   # connections/fc-to-servo-command/item.yaml
plm link $C1 connects PORT-7K2M4Q                # flight computer, sender
plm link $C1 connects PORT-B81N0C                # servo, receiver
plm confirm $C1
```

```yaml
id: CON-3F9XTB
type: connection
title: FC to servo command
links:
  - {type: connects, target: PORT-7K2M4Q}
  - {type: connects, target: PORT-B81N0C}
  - {type: satisfies, target: REQ-5T0WJA}
```

A connection states no bus of its own: it is ARINC 429 because its ports are.

The mounting is the same thing with other ports. It lives one level up, because the fuselage and flight control only meet at aircraft level:

```yaml
# aircraft/connections/fc-mounting/item.yaml
id: CON-9QW2LE
type: connection
title: Flight computer mounting
links:
  - {type: connects, target: PORT-H5T1VN}    # flight computer: mounting feet
  - {type: connects, target: PORT-M3D8RA}    # fuselage: avionics bay tray
```

A cable is an ordinary part that points at the connection it realises:

```yaml
# aircraft/flight-control/servo-cable/item.yaml
id: PRT-K0X4ZD
type: part
title: Servo cable
links:
  - {type: implements, target: CON-3F9XTB}
```

The resulting tree:

```
plm.yaml
types/                               arinc429.yaml, can.yaml, mechanical.yaml
aircraft/
├─ fuselage/                         owner: structures
│  └─ ports/avionics-bay-tray/       item.yaml, tray.step
├─ flight-control/                   owner: systems
│  ├─ flight-computer/               owner: avionics
│  │  ├─ housing/  board/  firmware/
│  │  └─ ports/
│  │     ├─ servo-command-out/       item.yaml, labels.csv
│  │     ├─ can-bus/                 item.yaml
│  │     └─ mounting-feet/           item.yaml
│  ├─ servo/
│  │  └─ ports/command-in/           item.yaml
│  ├─ servo-cable/                   item.yaml
│  └─ connections/
│     └─ fc-to-servo-command/        item.yaml
└─ connections/
   └─ fc-mounting/                   item.yaml
```

## 4. The interface report

**New** command, for the engineer who cares about interfaces:

```sh
$ plm report connections aircraft/flight-control
open ports
  PORT-D2N6FH (CAN bus)                 flight-computer
mixed port types
  CON-A7P3MS (FC to GPS)                PORT-R4C8YT is can, PORT-X1J9KB is arinc429
senders
  CON-3F9XTB (FC to servo command)      2 senders, expected 1
$ echo $?
1
```

It also reports a connection with fewer than two ports.

The person checking traceability runs what exists today and sees none of the above:

```sh
plm validate && plm suspects && plm report coverage
```

`validate` checks ports against the fields of their type, as it does for every item, and gains two rules: a type file that is invalid or names an unknown base, and a port of a directed type without a role.

## 5. Looking from the port

**New** display, so a port owner sees who depends on them:

```sh
$ plm show PORT-7K2M4Q
PORT-7K2M4Q (Servo command out)   arinc429   owner: avionics   status: released
role: sender   speed: high
artifacts: labels.csv
linked from
  CON-3F9XTB (FC to servo command)   connects   current
```

## 6. A change through Git

Nothing here is new; it is the existing mechanism applied to ports.

```sh
git switch -c change-servo-labels
# avionics engineer edits ports/servo-command-out/labels.csv

$ plm impact main
changed    PORT-7K2M4Q (Servo command out)
suspect    CON-3F9XTB (FC to servo command) connects PORT-7K2M4Q
```

CI on the merge request runs `plm suspects`, which exits 1, so the merge is blocked. The integrator reads the diff, has the servo side adapted on the same branch if needed, then:

```sh
plm confirm CON-3F9XTB
git commit -am "Servo labels: add trim command" && git push
```

CI passes, and the merge into the protected branch is the release.

## 7. What is added

| Added | Kind of change |
|---|---|
| `types/<type>.yaml` with `base`, `template`, `fields`, `required`; optional `prefix` and `folder`; replaces `schemas/*.schema.json`, `templates/*.yaml` and `prefixes`/`folders` in `plm.yaml` | project setup |
| One shape per type: a requirement is a single file, every other item a folder | loading rule |
| `port` type, home folder `ports/`, always a folder | built-in type |
| `directed` port types with `role` | built-in rule |
| `connection` type, home folder `connections/`, always a folder | built-in type |
| `connects` link (connection → port); `implements` may also target a connection | link rules |
| `plm report connections [<item>]` | command |
| "linked from" in `plm show` and in the extension | display |
| Two `validate` rules: invalid type file, directed port without role | validation |

Versions, confirmation, suspects, impact, search, owners and status apply to ports and connections with no change.
