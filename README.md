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

Not yet implemented: `plm retire`, search, VS Code extension, static site and CI.

## Open topics

* **Build records.** Software items record the source commit, CI build and `sha256` of their binary as plain attributes; validation should check the hash against the binary.
* **Requirement parameters.** Values live in requirement text; machine-readable values with units would need a schema extension and checks against design data.

## Getting started

Requires Node.js 22.18 or later and Git.

```sh
npm install
npm run build
npm link
npm test
```

Without `npm link`, run the CLI from source with `node src/cli.ts`.

## Tutorial: a quadcopter

This tutorial builds a small quadcopter: aircraft requirements, systems with their own requirements, parts, a CAD model and flight controller firmware. It then traces, changes and verifies them. Run all commands in one shell session: `plm new` prints each new ID, kept in shell variables. The firmware binary needs Git LFS (`brew install git-lfs`, then `git lfs install`).

### 1. Create the repository

```sh
mkdir multicopter && cd multicopter
plm init
git lfs track "*.bin"
```

`plm init` creates a Git repository and a `plm.yaml` with an ID prefix per item type.

### 2. The aircraft and its requirements

Items are folders named `<ID>-<title>`. `plm new` creates an item inside the item folder you are in, or at the top of the repository, and prints its ID. Requirements go into the item's `requirements/` folder, one file each. The title names the requirement; values belong in its text:

```sh
AC=$(plm new assembly "Quadcopter")
cd $AC-quadcopter
R_MTOM=$(plm new requirement "Maximum takeoff mass")
R_END=$(plm new requirement "Hover endurance")
R_WIND=$(plm new requirement "Position hold in wind")
echo "text: The quadcopter shall have a maximum takeoff mass of 2.5 kg." >> requirements/$R_MTOM-*.yaml
echo "text: The quadcopter shall hover for at least 25 min at maximum takeoff mass." >> requirements/$R_END-*.yaml
echo "text: The quadcopter shall hold its position within 1 m in wind of up to 10 m/s." >> requirements/$R_WIND-*.yaml
```

### 3. Systems, their requirements and parts

Systems are assemblies nested in the aircraft folder; the nesting is the product structure. Each system gets its own requirements and parts. Any file in an item folder is an artifact of that item, such as the frame's CAD model:

```sh
AF=$(plm new assembly "Airframe")
PWR=$(plm new assembly "Power")
FC=$(plm new assembly "Flight control")
cd $AF-airframe
R_AFM=$(plm new requirement "Airframe mass")
echo "text: The airframe shall have a mass of at most 600 g." >> requirements/$R_AFM-*.yaml
FRM=$(plm new part "Frame")
echo "solid frame" > $FRM-frame/frame.step
cd ../$PWR-power
R_BAT=$(plm new requirement "Battery energy")
echo "text: The battery pack shall store at least 165 Wh." >> requirements/$R_BAT-*.yaml
BAT=$(plm new part "Battery pack")
cd ../$FC-flight-control
R_FC=$(plm new requirement "Position hold control")
echo "text: The flight control system shall hold the position within 1 m in wind of up to 10 m/s." >> requirements/$R_FC-*.yaml
```

### 4. Firmware with its build record

Firmware is developed in its own repository, whose CI builds the flashable image. The product repository holds that image as an artifact of a software item, stored in Git LFS, with a build record pinning source commit, CI build and checksum. So test evidence covers exactly the bytes that are flashed. `software` is not a built-in type: a repository adds types with an ID prefix in `plm.yaml` and a schema in `schemas/`:

```sh
cd ../..
printf '  software: SW-\n' >> plm.yaml
mkdir schemas
cat > schemas/software.schema.json <<'EOF'
{ "properties": { "source": { "type": "string" }, "source_commit": { "type": "string" },
  "build": { "type": "string" }, "sha256": { "type": "string" } } }
EOF
cd $AC-quadcopter/$FC-flight-control
SW=$(plm new software "Firmware")
head -c 1048576 /dev/urandom > $SW-firmware/firmware.bin
cat >> $SW-firmware/item.yaml <<EOF
source: https://github.com/you/fc-firmware
source_commit: "3f9c2e1"
build: https://github.com/you/fc-firmware/actions/runs/1
sha256: $(shasum -a 256 $SW-firmware/firmware.bin | cut -d' ' -f1)
EOF
cd ../..
```

The repository now looks like this:

```
multicopter/
  plm.yaml                   settings: ID prefixes
  schemas/                   repository item types
  meta/<ID>.yaml             status and links of each item
  ASM-…-quadcopter/
    item.yaml
    requirements/            aircraft requirements
    ASM-…-airframe/
      requirements/
      PRT-…-frame/           item.yaml, frame.step
    ASM-…-power/
      requirements/
      PRT-…-battery-pack/
    ASM-…-flight-control/
      requirements/
      SW-…-firmware/         item.yaml, firmware.bin
```

### 5. Trace, confirm and commit

System requirements satisfy the aircraft requirements they derive from; parts and firmware satisfy or implement system requirements. New links are unconfirmed:

```sh
plm link $R_AFM satisfies $R_MTOM
plm link $R_BAT satisfies $R_END
plm link $R_FC satisfies $R_WIND
plm link $FRM satisfies $R_AFM
plm link $BAT satisfies $R_BAT
plm link $SW implements $R_FC
plm suspects
```

Confirming a link states that its source satisfies the target as it is now, and records in `meta/<ID>.yaml` the target's version and title, who confirmed it and when, and the commit if the target is committed. Afterwards no link is open, the repository validates, and `plm show` prints an item with its version and links:

```sh
for id in $R_AFM $R_BAT $R_FC $FRM $BAT $SW; do plm confirm $id; done
plm suspects
plm validate
plm show $FRM
git add -A && git commit -m "Quadcopter definition"
```

In a team, each change goes through a merge request into the protected `main` branch; that merge is the release.

### 6. Change a requirement

The customer wants a heavier camera, so the maximum takeoff mass rises to 2.8 kg. The airframe requirement was confirmed against 2.5 kg, so its link becomes suspect, shown with the change since confirmation. `plm impact` lists what the change affects: the changed requirement, the aircraft containing it and the suspect link:

```sh
perl -pi -e 's/2.5 kg/2.8 kg/' $AC-quadcopter/requirements/$R_MTOM-*.yaml
plm suspects --diff
plm impact HEAD
```

The airframe may now weigh 650 g. Updating its requirement and confirming it against the new takeoff mass moves the suspect one level down, to the frame. The frame meets the looser limit, so it is confirmed too. The diff of the frame's links shows what was reviewed, not only a new version hash:

```sh
perl -pi -e 's/600 g/650 g/' $AC-quadcopter/$AF-airframe/requirements/$R_AFM-*.yaml
plm confirm $R_AFM
plm suspects
plm confirm $FRM
git diff meta/$FRM.yaml
plm suspects
git add -A && git commit -m "Raise maximum takeoff mass to 2.8 kg"
```

The battery energy also depends on the takeoff mass but was not flagged: it is linked only to the endurance requirement. `plm` checks exactly the dependencies recorded as links.

### 7. Verify by flight test

Test cases live in the `tests/` folder of the item they test, so the item's version covers its requirements and test cases: adding or changing a test case outdates the runs against the item. Runs live in the top-level `runs/` folder, so recording one changes no version. Before a test case exists, the endurance requirement is unverified; with one, it is pending:

```sh
TC=$(plm -C $AC-quadcopter new test-case "Hover endurance flight")
plm link $TC verifies $R_END
plm confirm $TC
plm report coverage $AC
git add -A && git commit -m "Hover endurance test"
```

Recording a run confirms its links to the test case and the tested aircraft at the committed versions; it is refused while either has uncommitted changes. The run copies the flight log, and the requirement becomes verified:

```sh
echo "Hover 26 min 10 s, landed with 21 % capacity" > ../hover.log
plm test record $TC --sut $AC --result pass --log ../hover.log
plm report coverage $AC
git add -A && git commit -m "Hover endurance flight passed"
```

### 8. Update the firmware

A new firmware build replaces the binary and its build record. The firmware's version changes, and with it those of Flight control and the aircraft. The flight was flown with the old firmware, so `plm impact` reports the run as outdated, and the endurance requirement falls back to pending, naming the outdated run, until the flight is repeated with the new build. `plm suspects` lists nothing: a run's links are evidence of what was tested, not links to review:

```sh
cd $AC-quadcopter/$FC-flight-control/$SW-firmware
head -c 1048576 /dev/urandom > firmware.bin
perl -pi -e "s/3f9c2e1/a1b2c3d/; s/^sha256: .*/sha256: $(shasum -a 256 firmware.bin | cut -d' ' -f1)/" item.yaml
cd ../../..
plm impact HEAD
plm suspects
plm report coverage $AC
```

## Reference

* `plm` works from any folder inside the repository; `-C <dir>` runs it as if in another folder.
* `plm rename <ID> <title>` changes an item's title and renames its folder or file; `plm validate` warns about names that no longer match their title.
* To reuse an item, such as a standard part, list its ID under `uses:` in the `item.yaml` of the assembly using it.
* `plm impact <base>[..<head>]` compares a commit with another commit or, by default, the working tree, e.g. `plm impact main..my-branch` before merging.
* `plm report coverage [item]` reports the requirements of the repository or of an item's subtree as verified, pending or unverified.
* `--format json` gives machine-readable output. Exit codes: 0 success, 1 findings, 2 usage error, 3 internal error.
