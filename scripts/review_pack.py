#!/usr/bin/env python3
"""SRR review pack generator.

Regenerate (from the repository root):
    python3 aircraft-system/srr-review-pack/review_pack.py

Writes, next to this script:
    srr-review-pack.md   the review pack: an index that links to the items;
                         only requirement text is copied
    coverage.txt         full output of `plm report coverage`

Inputs: the product repository through the `plm` CLI (JSON output), the
`requirements/` folder structure (themes) and status.md ("Open owner
decisions"). Requires plm on PATH and Python 3.9+; no other packages.
Options: --repo <dir> (default: the git repository holding this script),
         --out <dir> (default: this script's folder).
"""
import argparse
import concurrent.futures as cf
import datetime
import json
import os
import re
import subprocess
from collections import Counter, defaultdict

# Configuration --------------------------------------------------------------
GATE = "SRR"
GATE_REVIEWS = ["REV-JKB3PH", "REV-JXAEZY", "REV-D1X3EA"]  # independent gate reviews
ASSEMBLIES = ["aircraft-system", "verification-environment"]
STATUS_SECTION = "## Open owner decisions"
OPTIONS_PAPER_TITLE = re.compile(r"evasion option", re.I)  # finds the options paper DEC
OPTIONS_PAPER_BRANCH = "wp/evasion-options-paper"
ID_RE = re.compile(r"\b(?:REQ|ANA|DEC|ICD|REV|ASM|PRT|SW|TC)-[0-9A-Z]{6}\b")


def plm(repo, *args, json_out=True):
    cmd = ["plm", "-C", repo] + (["--format", "json"] if json_out else []) + list(args)
    p = subprocess.run(cmd, capture_output=True, text=True)
    if json_out:
        return json.loads(p.stdout)["data"] if p.stdout.strip() else None
    return p.returncode, p.stdout + p.stderr


def git(repo, *args):
    return subprocess.run(["git", "-C", repo] + list(args), capture_output=True, text=True).stdout.strip()


def item_paths(repo):
    """Map item ID -> file of the item (item.yaml or single-file requirement)."""
    paths = {}
    for root, dirs, files in os.walk(repo):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "meta")]
        for f in files:
            if f.endswith(".yaml"):
                p = os.path.join(root, f)
                with open(p, encoding="utf-8") as fh:
                    m = re.match(r"id:\s*(\S+)", fh.readline())
                if m:
                    paths[m.group(1)] = os.path.relpath(p, repo)
    return paths


def cell(s):
    return " ".join(str(s).split()).replace("|", "\\|")


def first_sentence(s, n=110):
    parts, s = re.split(r"(?<=[.;])\s", " ".join(s.split())), ""
    while parts and len(s) < 40:  # skip stubs such as "Round 2."
        s = (s + " " + parts.pop(0)).strip()
    return cell(s if len(s) <= n else s[: n - 1] + "…")


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=git(here, "rev-parse", "--show-toplevel"))
    ap.add_argument("--out", default=here)
    a = ap.parse_args()
    repo, out = os.path.abspath(a.repo), os.path.abspath(a.out)
    paths = item_paths(repo)

    def rel(p):
        return os.path.relpath(os.path.join(repo, p), out)

    def link(i):
        return f"[{i}]({rel(paths[i])})" if i in paths else i

    ids = {t: [x["id"] for x in plm(repo, "search", f"type:{t}") or []]
           for t in ("requirement", "analysis", "decision", "review")}
    every = sum(ids.values(), [])
    with cf.ThreadPoolExecutor(8) as ex:
        items = dict(zip(every, ex.map(lambda i: plm(repo, "show", i), every)))

    def meta(i, k):
        return (items[i].get("meta") or {}).get(k, "—")

    def out_links(i):
        return [l for l in items[i].get("links", []) if l["source"] == i]

    # Changes outside the pack's own folder mean the pack does not match the commit.
    dirty = git(repo, "status", "--porcelain", "--", ".", f":(exclude){os.path.relpath(out, repo)}")
    L = [f"# {GATE} review pack", "",
         f"Generated {datetime.date.today()} from commit `{git(repo, 'rev-parse', '--short', 'HEAD')}`"
         f"{' (uncommitted changes present)' if dirty else ''}. "
         "Regenerate: `python3 aircraft-system/srr-review-pack/review_pack.py`. "
         "This pack indexes the items; their content is in the linked files.", ""]

    # Repository state --------------------------------------------------------
    rc, vout = plm(repo, "validate", json_out=False)
    sus = plm(repo, "suspects") or []
    L += ["## Repository state", "",
          "* `plm validate`: " + ("clean" if rc == 0 and not vout.strip() else f"exit {rc}: {cell(vout)[:300]}"),
          f"* `plm suspects`: {len(sus)} link(s)" + (":" if sus else "")]
    L += [f"  * {link(s['source'])} {cell(s['title'])} → {link(s['link']['target'])} "
          f"{cell(s['targetTitle'])}: {s['state']}" for s in sus]
    L.append("")

    # Owner decisions ---------------------------------------------------------
    paper = [i for i in ids["decision"] if OPTIONS_PAPER_TITLE.search(items[i]["title"])]
    paper_ref = (", ".join(f"{link(i)} {cell(items[i]['title'])}" for i in paper)
                 or f"pending, `{OPTIONS_PAPER_BRANCH}`")
    st = open(os.path.join(repo, "status.md"), encoding="utf-8").read()
    sec = st.split(STATUS_SECTION, 1)[1].split("\n## ", 1)[0] if STATUS_SECTION in st else ""
    L += ["## Open owner decisions", "",
          f"Full text: `status.md`, section \"Open owner decisions\". Evasion options paper: {paper_ref}.", ""]
    for m in re.finditer(r"^\*\*Owner [^(]*\((`?DEC-\w+`? §\d+)\):\s*(.*?)(?:[;.]\s|\*\*)", sec, re.M):
        L.append(f"* Context {m.group(1)}: {cell(m.group(2))}")
    L.append("")
    L += [f"{m.group(1)}. {cell(m.group(2))}" for m in re.finditer(r"^(\d+)\.\s+\*\*(.+?)\*\*", sec, re.M)]
    L.append("")

    # Reviews -----------------------------------------------------------------
    L += [f"## {GATE} independent review verdicts", ""]
    minors = []
    for r in GATE_REVIEWS:
        d = items.get(r)
        if not d:
            L.append(f"* {r}: not found")
            continue
        fs = d.get("findings") or []
        c = Counter((f["severity"], f["state"] == "open") for f in fs)
        note = (" (no open major; verdict field not yet updated by the reviewer)"
                if d.get("verdict") == "fail" and not c[("major", True)] else "")
        L.append(f"* {link(r)} {cell(d['title'])} ({d.get('reviewer')}, at `{d.get('commit')}`): "
                 f"**{d.get('verdict')}**{note}. Open: majors {c[('major', True)]}/"
                 f"{c[('major', True)] + c[('major', False)]}, minors {c[('minor', True)]}/"
                 f"{c[('minor', True)] + c[('minor', False)]}, remarks {c[('remark', True)]}.")
        minors += [(r, n, f) for n, f in enumerate(fs, 1) if f["state"] == "open" and f["severity"] == "minor"]
    L += ["", "Open minor findings (routing to owners: `status.md`, \"Minors still not routed\"):", "",
          "| Review #finding | Item | Owner | Finding, first sentence |", "|---|---|---|---|"]
    L += [f"| {r} #{n} | {link(f['item'])} | {f.get('owner', '—')} | {first_sentence(f['text'])} |"
          for r, n, f in minors]
    L.append("")

    # TBDs --------------------------------------------------------------------
    tbd = sorted((i for i in ids["requirement"] if re.search(r"\bTBD\b", items[i].get("text", ""))),
                 key=lambda i: paths.get(i, ""))
    L += ["## Open TBDs", "", f"{len(tbd)} requirements with `TBD` in `text`; the reason is in each rationale.", "",
          "| Requirement | Owner | Status |", "|---|---|---|"]
    L += [f"| {link(i)} {cell(items[i]['title'])} | {meta(i, 'owner')} | {meta(i, 'status')} |" for i in tbd]
    L.append("")

    # Decisions and analyses --------------------------------------------------
    for t, title in (("decision", "Decisions"), ("analysis", "Analyses")):
        L += [f"## {title}", "", "| Item | Owner | Status | Document | Non-current outgoing links |",
              "|---|---|---|---|---|"]
        for i in sorted(ids[t], key=lambda i: paths.get(i, "")):
            docs = ", ".join(f"[{os.path.basename(x['path'])}]({rel(x['path'])})"
                             for x in items[i].get("artifacts", []) if x["path"].endswith(".md")) or "—"
            bad = ", ".join(f"{l['link']['target']} {l['state']}" for l in out_links(i) if l["state"] != "current")
            L.append(f"| {link(i)} {cell(items[i]['title'])} | {meta(i, 'owner')} | {meta(i, 'status')} | "
                     f"{docs} | {bad or '—'} |")
        L.append("")

    # Coverage ----------------------------------------------------------------
    _, cov = plm(repo, "report", "coverage", json_out=False)
    with open(os.path.join(out, "coverage.txt"), "w", encoding="utf-8") as fh:
        fh.write(cov)
    per = defaultdict(Counter)
    for c in plm(repo, "report", "coverage") or []:
        per[items.get(c["requirement"], {}).get("verification", "(none)")][c["state"]] += 1
    states = sorted({s for c in per.values() for s in c})
    L += ["## Verification coverage", "",
          "`plm report coverage`, full output in [coverage.txt](coverage.txt). Requirements per planned method:", "",
          "| Method | " + " | ".join(states) + " | Total |", "|---" * (len(states) + 2) + "|"]
    L += [f"| {m} | " + " | ".join(str(per[m][s]) for s in states) + f" | {sum(per[m].values())} |"
          for m in sorted(per)]
    L.append("")

    # Requirements by theme ---------------------------------------------------
    L += ["## Requirements by theme", "",
          "Theme: folder under `requirements/`. Parent: `satisfies` target. Rationale cites: IDs named in the "
          "rationale (the rationale itself is in the item).", ""]
    groups = defaultdict(list)
    for i in ids["requirement"]:
        asm, _, rest = paths.get(i, "unfiled/requirements/x").partition("/requirements/")
        groups[(asm, os.path.dirname(rest) or "(top level)")].append(i)
    for asm in ASSEMBLIES + sorted({g[0] for g in groups} - set(ASSEMBLIES)):
        themes = sorted(k for k in groups if k[0] == asm)
        if themes:
            L += [f"### {asm}", ""]
        for k in themes:
            L += [f"#### {k[1]} ({len(groups[k])})", "",
                  "| Requirement | Text | Verification | Status | Parent | Rationale cites |",
                  "|---|---|---|---|---|---|"]
            for i in sorted(groups[k], key=lambda i: items[i]["title"]):
                d = items[i]
                par = [l["link"]["target"] for l in out_links(i) if l["link"]["type"] == "satisfies"]
                cites = sorted(set(ID_RE.findall(d.get("rationale", ""))) - {i} - set(par))
                L.append(f"| {link(i)} {cell(d['title'])} | {cell(d.get('text', ''))} | "
                         f"{d.get('verification', '—')} | {meta(i, 'status')} | {' '.join(par) or '—'} | "
                         f"{' '.join(cites) or '—'} |")
            L.append("")

    with open(os.path.join(out, "srr-review-pack.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))
    print(f"wrote {os.path.join(out, 'srr-review-pack.md')}: {len(ids['requirement'])} requirements, "
          f"{len(tbd)} with TBD, {len(sus)} suspect links")


if __name__ == "__main__":
    main()
