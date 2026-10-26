# Concept: parameters

Decision input for the owner, not a requirement. Deleted when decided: accepted parts become requirements in `documents/`, the rest is dropped. Kept outside `documents/` because that folder has 34 of 5000 words free.

## Need

A value computed in one item is copied as a number into requirements, other analyses, scripts and reports. Nothing detects a stale copy; suspects are per item or file, not per value; TBD and provisional are prose.

## Data model

* A **parameter** is a named value with a unit and a state `tbd`, `provisional` or `final`. A `tbd` parameter has no value.
* One item owns it. Its parameters live in one file in its folder, `parameters.yaml` (name configurable in `plm.yaml`), usually written by the item's `run` script:

  ```yaml
  v_cruise: {value: 9.68, unit: m/s, state: final}
  thrust_cruise: {unit: N, state: tbd}
  ```

* `plm` reads the file as the item's list field `parameters`, each entry with its `name`, so all list-field features apply.
* A reference is `<ID>:<name>`, e.g. `ANA-QF8HRH:v_cruise`.

## What `plm` does

1. **Link to a parameter.** `plm link <source> derives-from ANA-QF8HRH:v_cruise`. The link's version is the hash of that entry (value, unit, state), so it turns suspect only when that parameter changes. `confirm`, `--remove`, `suspects`, diff and "Review link" work as for any link.
2. **Validate.** An unknown parameter is an error (`unknown-target`). A warning `tbd-source` when an item links to a `tbd` parameter while its own text or parameters state a number: the rule "a value that depends on a TBD stays TBD" becomes checked.
3. **List, with existing commands** (CO-03.3, exit 1 when non-empty, usable as a gate):
   * `plm report entries parameters state:tbd` lists TBD parameters;
   * `plm report entries links target:ANA-QF8HRH:v_cruise` lists the dependents of one parameter.
4. **Scripts** read `parameters.yaml` of the owning item instead of a copy; `plm show <ID>` already shows the field.
5. **Optional: stated-value check.** A number in a text field followed by its reference, `9.68 m/s [ANA-QF8HRH:v_cruise]`, is an error (`stale-value`) when it differs from the source. Catches copies in text without a link; costs a syntax and a parser.

## Examples from autonomous-fixed-wing

* **Cruise speed.** `ANA-QF8HRH` Baseline sizing computes 9.68 m/s; it is copied into 11 files, among them `REQ-TTS380` Evasion minimum airspeed, `ANA-RYG1MB` Power and latency budgets and the simulation's `generate_mission.py`. With parameters: the sizing script writes `v_cruise`; `REQ-TTS380` and `ANA-RYG1MB` link `derives-from ANA-QF8HRH:v_cruise`; `generate_mission.py` reads the file. A new cruise speed suspects exactly these links and nothing that depends on another output of the sizing.
* **TBD value.** `REQ-BC4KQY` Thrust at cruise speed reads "at least TBD N" and derives from the whole of `ANA-QF8HRH`. With parameters: `ANA-QF8HRH:thrust_cruise` has state `tbd`; `report entries parameters state:tbd` lists it, the links report names `REQ-BC4KQY` as its dependent, and a dependent stating a number would warn.
* **Allocations.** `ANA-Z3D0S9` Mass budget writes six files `out/<subsystem>.txt` so that `REQ-VPAR6Y` Airframe mass and five siblings can link per file. With parameters: one file with six entries, `derives-from ANA-Z3D0S9:m_airframe`. `baseline_sizing.py` reads the mass budget's parameters instead of re-implementing its margins, removing the 2.577 vs 2.578 kg drift.

## What it replaces

* File-target links `<ID>/<path>` (CL-01.1, TE-01.1): `<ID>:<name>` covers their use; a file target remains only if the owner wants both (question 2).
* Backlog entry "A TBD value and what derives from it cannot be listed": solved by state `tbd`, the two reports and `tbd-source`.
* The rejected "No way to mark a value as provisional": state `provisional`, listed with `state:provisional`.
* Projects' hand searches for copies, one output file per value, and `TBD` greps.

## Budget estimate

`src/`+`test/` is at 4100/4100, `documents/` at 4966/5000, `extension/` at 1635/1700.

| Part | src+test | documents | extension |
|---|---|---|---|
| Read `parameters.yaml` as a list field | +25 | +20 | 0 |
| `<ID>:<name>` target, entry version (replacing `<ID>/<path>`) | +10 | +5 | +5 |
| `tbd-source` warning | +30 | +20 | 0 |
| Tests | +80 | | |
| **Core total** | **~+145** | **~+45** | **~+5** |
| Optional stated-value check | +90 | +30 | 0 |

The reports are free (CO-03.3). The core needs about 145 words in `src/`+`test/` and 45 in `documents/` that no current deletion I can see frees.

## Owner decisions

* **Accept the concept**, and fund it: raise the `src/`+`test/` limit by about 150 and `documents/` by about 50, or name a feature to remove of that size?
* **Replace file-target links** by parameter links (one mechanism), or keep both?
* **Stated-value check** (`stale-value`, +120 words): include it, or rely on per-parameter suspects and scripts reading the file?
* **`tbd-source` warning**: include it, or leave the TBD rule to reviews with the two reports?
