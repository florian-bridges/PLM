# Concept: parameters

Decision input for the owner, not a requirement. Deleted when decided: accepted parts become requirements in `documents/`, the rest is dropped. Kept outside `documents/` because that folder has 34 of 5000 words free.

## Need

A value computed in one item is copied as a number into requirements, other analyses, scripts and reports. Nothing detects a stale copy; suspects are per item or file, not per value; TBD and provisional are prose.

## Data model

* A **parameter** is a named value with a unit and an optional state. States are configured in `plm.yaml` (`parameter_states`, default `[provisional, final]`).
* A parameter without a value (key missing or `null`; `0` is a value) is **TBD**. TBD is not a state.
* Parameters live in one place: the list field `parameters` in the owning item's `item.yaml`, any item type (a requirement for an owner-set threshold, an analysis for a computed value):

  ```yaml
  parameters:
    - {name: v_cruise, value: 9.68, unit: m/s, state: final}
    - {name: thrust_cruise, unit: N}
  ```

* A reference is `<ID>:<name>`, e.g. `ANA-QF8HRH:v_cruise`.

## What `plm` does

1. **Link to a parameter.** `plm link <source> derives-from ANA-QF8HRH:v_cruise`. The link's version is the hash of that entry, so it turns suspect only when that parameter changes. `confirm`, `--remove`, `suspects`, diff and "Review link" work as for any link.
2. **Set a parameter.** `plm set ANA-QF8HRH:v_cruise value 9.71`, `plm set ANA-QF8HRH:v_cruise state final`; `plm set ANA-QF8HRH:v_cruise value ""` removes the value (TBD). Creates the entry if missing, writes `value` as a number, refuses a non-number value or a state not in `parameter_states`, keeps the rest of `item.yaml` (CL-01.3). Run scripts use it to write their outputs.
3. **Validate.** An unknown parameter reference is an error (`unknown-target`); a non-number value or unknown state is an error.
4. **List, with the existing `report entries`** (CO-03.3, exit 1 when non-empty, usable as a gate):
   * `plm report entries parameters value:` lists TBD parameters;
   * `plm report entries parameters state:provisional` lists provisional ones;
   * `plm report entries links target:ANA-QF8HRH:v_cruise` lists the dependents of one parameter.

   Today CO-03.3 lists only objects that name an item ID and compares `String(value)`, so a missing key matches only the accidental `value:undefined`. Needed: list objects without an ID under their own item, and let an empty filter value `<key>:` match a missing, `null` or empty key.
5. **Scripts** read the owning item's parameters (`plm --format json show <ID>` or the YAML) instead of a copy.

## Examples from autonomous-fixed-wing

* **Cruise speed.** `ANA-QF8HRH` Baseline sizing computes 9.68 m/s; it is copied into 11 files, among them `REQ-TTS380` Evasion minimum airspeed, `ANA-RYG1MB` Power and latency budgets and the simulation's `generate_mission.py`. With parameters: the sizing script runs `plm set ANA-QF8HRH:v_cruise value …`; `REQ-TTS380` and `ANA-RYG1MB` link `derives-from ANA-QF8HRH:v_cruise`; `generate_mission.py` reads it. A new cruise speed suspects exactly these links.
* **TBD value.** `REQ-BC4KQY` Thrust at cruise speed reads "at least TBD N" and derives from the whole of `ANA-QF8HRH`. With parameters: `ANA-QF8HRH:thrust_cruise` has no value; `report entries parameters value:` lists it and the links report names `REQ-BC4KQY` as its dependent.
* **Allocations.** `ANA-Z3D0S9` Mass budget writes six files `out/<subsystem>.txt` so that `REQ-VPAR6Y` Airframe mass and five siblings can link per file. With parameters: six entries, `derives-from ANA-Z3D0S9:m_airframe`. `baseline_sizing.py` reads them instead of re-implementing the margins, removing the 2.577 vs 2.578 kg drift.

## What it replaces

* File-target links `<ID>/<path>` (CL-01.1, TE-01.1), if the owner chooses (question 2).
* Backlog entry "A TBD value and what derives from it cannot be listed": the two reports.
* The rejected "No way to mark a value as provisional": a configured state.
* Projects' hand edits of output files, hand searches for copies and `TBD` greps.

## Budget estimate

`src/`+`test/` is at 4100/4100, `documents/` at 4966/5000, `extension/` at 1635/1700.

| Part | src+test | documents | extension |
|---|---|---|---|
| `parameters` field: value number, state from `plm.yaml` | +20 | +20 | 0 |
| `<ID>:<name>` target, entry version (replacing `<ID>/<path>`) | +10 | +5 | +5 |
| `report entries`: objects without ID, empty filter | +15 | +10 | 0 |
| `plm set` on `<ID>:<name>` | +30 | +15 | 0 |
| Tests | +90 | | |
| **Core total** | **~+165** | **~+50** | **~+5** |
| Optional `tbd-source` warning | +45 | +20 | 0 |
| Optional stated-value check | +120 | +30 | 0 |

The core needs about 165 words in `src/`+`test/` and 50 in `documents/` that no current deletion I can see frees.

## Owner decisions

* **Fund it:** raise the `src/`+`test/` limit by about 170 and `documents/` by about 50, or name a feature to remove of that size?
* **Replace file-target links** by parameter links (one mechanism), or keep both?
* **Stated-value check** (`stale-value`, +150 words): a number followed by its reference in a text field, `9.68 m/s [ANA-QF8HRH:v_cruise]`, is an error when it differs from the parameter. Include it, or rely on per-parameter suspects and scripts reading the item?
* **`tbd-source` warning** (+65 words): warn when an item links to a parameter without value while its own text or parameters state a number. Include it, or leave the rule to reviews with the TBD report?
