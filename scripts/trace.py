#!/usr/bin/env python3
"""Check the requirement traces, or show where given IDs are defined, implemented and tested.

  trace.py            check; exit 1 on an error
  trace.py CO-03 ...  for each ID (or prefix): its definition, code and test lines

Errors: an ID defined twice, a requirement whose parent is missing (XX-nn.m without XX-nn,
a component requirement without an existing CR and US, a CR without an existing US), and a
code or test reference to an undefined ID. Warnings: low-level requirements that no code
or no test names.
"""

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = {"scenarios": "US", "requirements": "CR", "components": "XX-nn", "low-level-requirements": "XX-nn.m"}
CODE = ["src", "extension/src"]
TESTS = ["test", "extension/test"]
ID = r"(?:US|CR|CO|TE|CL|VS)-\d+(?:\.\d+)?"
RANGE = re.compile(rf"({ID})\s*[–-]\s*({ID})")
DEF = re.compile(rf"^\*\*({ID})\b")


def ids_in(text, known=()):
    """IDs in text, with ranges such as CR-01–CR-03 expanded to the known IDs between (gaps are removed IDs)."""
    found = set(re.findall(ID, text))
    for a, b in RANGE.findall(text):
        head, _, n = a.rpartition(".") if "." in a else a.rpartition("-")
        if b.startswith(head):
            sep = "." if "." in a else "-"
            width = len(n)
            for i in range(int(n) + 1, int(b[len(head) + 1:])):
                if f"{head}{sep}{i:0{width}d}" in known:
                    found.add(f"{head}{sep}{i:0{width}d}")
    return found


def files(dirs):
    out = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard", "--", *dirs],
                         cwd=ROOT, check=True, capture_output=True, text=True).stdout
    return [p for p in out.split() if p.endswith(".ts") and (ROOT / p).is_file()]


def refs(dirs, pattern, known):
    """{ID: [file:line, ...]} for IDs on lines matching pattern."""
    found = {}
    for path in files(dirs):
        for n, line in enumerate((ROOT / path).read_text().splitlines(), 1):
            m = re.search(pattern, line)
            if m:
                for i in ids_in(m.group(0), known):
                    found.setdefault(i, []).append(f"{path}:{n}")
    return found


def definitions():
    """{ID: (file:line, paragraph text)} and duplicate errors."""
    defs, errors = {}, []
    for doc in DOCS:
        path = f"documents/{doc}.md"
        lines = (ROOT / path).read_text().splitlines()
        for n, line in enumerate(lines, 1):
            m = DEF.match(line)
            if m:
                if m.group(1) in defs:
                    errors.append(f"{path}:{n}: {m.group(1)} defined twice")
                end = next((k for k in range(n, len(lines)) if not lines[k].strip()), len(lines))
                defs[m.group(1)] = (f"{path}:{n}", " ".join(lines[n - 1:end]))
    return defs, errors


def check(defs, errors, code, tests):
    for i, (where, line) in defs.items():
        cited = ids_in(DEF.sub("", line), defs)
        if i.startswith("CR"):
            need = [("US", "scenario")]
        elif i.startswith("US"):
            need = []
        elif "." in i:
            if i.rsplit(".", 1)[0] not in defs:
                errors.append(f"{where}: {i} refines missing {i.rsplit('.', 1)[0]}")
            need = []
        else:
            need = [("CR", "tool requirement"), ("US", "scenario")]
        for prefix, what in need:
            if not any(c.startswith(prefix) and c in defs for c in cited):
                errors.append(f"{where}: {i} cites no existing {what}")
    for kind, found in (("code", code), ("test", tests)):
        for i, places in found.items():
            if i not in defs:
                errors.append(f"{places[0]}: {kind} names undefined {i}")
    low = [i for i in defs if "." in i]
    warnings = [f"not in code: {' '.join(i for i in low if i not in code)}",
                f"not in tests: {' '.join(i for i in low if i not in tests)}"]
    return errors, [w for w in warnings if not w.endswith(": ")]


def main():
    defs, errors = definitions()
    code = refs(CODE, rf"//.*{ID}.*", defs)
    tests = refs(TESTS, rf"test\(['\"`].*", defs)
    if len(sys.argv) > 1:
        for q in sys.argv[1:]:
            for i in sorted(i for i in defs if i == q or i.startswith(q + ".")):
                print(f"{defs[i][0]}: {defs[i][1][:160]}")
                print(f"  code: {' '.join(code.get(i, [])) or '-'}")
                print(f"  tests: {' '.join(tests.get(i, [])) or '-'}")
        return
    errors, warnings = check(defs, errors, code, tests)
    for line in errors + [f"warning: {w}" for w in warnings]:
        print(line)
    print(f"trace: {len(defs)} requirements, {len(errors)} errors")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
