#!/usr/bin/env bash
# Recreate the multicopter sandbox (default: sandbox/multicopter) with suspect and unconfirmed links,
# verified, pending and unverified requirements, and passing, failing and outdated test runs.
set -euo pipefail
PLM_ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR=${1:-$PLM_ROOT/sandbox/multicopter}
plm() { node "$PLM_ROOT/src/cli.ts" "$@"; }
slug() { echo "$1" | tr A-Z a-z | sed 's/[^a-z0-9]\+/-/g; s/^-//; s/-$//'; }
# plm new, then the text, which has no CLI command; requirements go into the requirements/ subfolder we are in.
req() { plm new requirement "$1"; local dir=requirements; [[ $PWD == */requirements/* ]] && dir=.; echo "text: $2" >> "$dir/$(slug "$1").yaml"; }
tc() { local id; id=$(plm -C "$1" new test-case "$2"); echo "text: $3" >> "$1/tests/$(slug "$2")/item.yaml"
  plm link "$id" verifies "$4"; plm confirm "$id" >/dev/null; echo "$id"; }
commit() { git add -A && git commit -qm "$1"; }
LOGS=$(mktemp -d); trap 'rm -rf "$LOGS"' EXIT

rm -rf "$DIR"
plm -C "$DIR" init
cd "$DIR"
git config user.name >/dev/null || git config user.name Sandbox   # plm confirm needs a name
git config user.email >/dev/null || git config user.email sandbox@example.com

# Product structure: aircraft > systems > equipment, each with requirements; requirement subfolders.
SCREW=$(plm new part "M3 screw")
AC=$(plm new assembly "Quadcopter")
cd quadcopter
mkdir -p requirements/performance requirements/environment
cd requirements/performance
R_MTOM=$(req "Maximum takeoff mass" "The quadcopter shall have a maximum takeoff mass of 2.5 kg.")
R_END=$(req "Hover endurance" "The quadcopter shall hover for at least 25 min at maximum takeoff mass.")
cd ../environment
R_WIND=$(req "Position hold in wind" "The quadcopter shall hold its position within 1 m in wind of up to 10 m/s.")
cd ../..
plm new assembly "Airframe" >/dev/null
PWR=$(plm new assembly "Power")
plm new assembly "Flight control" >/dev/null
cd airframe
R_AFM=$(req "Airframe mass" "The airframe shall have a mass of at most 600 g.")
FRM=$(plm new part "Frame")
echo "solid frame" > frame/frame.step
printf 'uses:\n  - %s\n' "$SCREW" >> item.yaml   # no CLI command for uses
cd ../power
R_BAT=$(req "Battery energy" "The battery pack shall store at least 165 Wh.")
BAT=$(plm new part "Battery pack")
ESC=$(plm new part "ESC")
cd esc
R_ESC=$(req "Operating voltage" "The ESC shall operate at up to 13 V.")
cd ../../flight-control
R_FC=$(req "Position hold control" "The flight control system shall hold the position within 1 m in wind of up to 10 m/s.")
cd ../..

plm link "$R_AFM" satisfies "$R_MTOM"
plm link "$R_BAT" satisfies "$R_END"
plm link "$R_FC" satisfies "$R_WIND"
plm link "$FRM" satisfies "$R_AFM"
plm link "$BAT" satisfies "$R_BAT"
plm link "$ESC" satisfies "$R_ESC"   # left unconfirmed
for id in "$R_AFM" "$R_BAT" "$R_FC" "$FRM" "$BAT"; do plm confirm "$id"; done
commit "Quadcopter definition"

# Suspect: the takeoff mass changes after the airframe mass was confirmed against it.
perl -pi -e 's/2.5 kg/2.8 kg/' quadcopter/requirements/performance/maximum-takeoff-mass.yaml
commit "Raise maximum takeoff mass to 2.8 kg"

# Test cases; airframe mass, ESC voltage and position hold control stay unverified.
TC_HOVER=$(tc quadcopter "Hover endurance flight" "Hover at maximum takeoff mass until the battery is empty." "$R_END")
TC_MASS=$(tc quadcopter "Takeoff weighing" "Weigh the ready-to-fly quadcopter." "$R_MTOM")
TC_WIND=$(tc quadcopter "Wind hold flight" "Hold position in 10 m/s wind and log the drift." "$R_WIND")
TC_CAP=$(tc quadcopter/power "Battery discharge" "Discharge the full battery pack and integrate the energy." "$R_BAT")
TC_CYCLE=$(tc quadcopter/power "Battery charge cycle" "Charge and discharge the pack ten times." "$R_BAT")
commit "Add test cases"

# Outdated run: the battery discharge test case changes after the run on Power.
echo "Discharge at 10 A: 16.9 Wh per cycle" > "$LOGS/bench.log"
plm test record "$TC_CAP" "$TC_CYCLE" --sut "$PWR" --result pass pass --log "$LOGS/bench.log"
commit "Battery bench run"
perl -pi -e 's/pack and/pack at 10 A and/' quadcopter/power/tests/battery-discharge/item.yaml
commit "Specify battery discharge current"

# A passing run, then a run with one failing test case.
echo "Hover 26 min 10 s; takeoff mass 2.76 kg" > "$LOGS/flight1.log"
plm test record "$TC_HOVER" "$TC_MASS" --sut "$AC" --result pass pass --log "$LOGS/flight1.log"
commit "Flight test 1"
echo "Hover 25 min 40 s; drift 1.6 m at 9 m/s wind" > "$LOGS/flight2.log"
plm test record "$TC_HOVER" "$TC_WIND" --sut "$AC" --result pass fail --log "$LOGS/flight2.log"
commit "Flight test 2"

plm suspects || true
plm report coverage || true
