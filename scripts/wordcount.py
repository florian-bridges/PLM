#!/usr/bin/env python3
"""Count words in git-tracked files of the documents, source, test and extension directories.

Test words count toward the source limit; the extension has its own limit.

In documents, words are whitespace-separated tokens containing a letter or
digit. In code (source, test and extension), words are identifiers, keywords
and numbers, so `a.b(c, d)` is four words however it is spaced and squashing
code saves nothing (owner, #121). Punctuation and line breaks cost nothing.
Binary files are skipped.
Exits with status 1 if a given word limit is exceeded.
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
WORD = re.compile(r"\w")
CODE_WORD = re.compile(r"[A-Za-z_$][\w$]*|\d+")


def tracked_files(directories, include_untracked):
    cmd = ["git", "ls-files", "-z"]
    if include_untracked:
        cmd += ["--cached", "--others", "--exclude-standard"]
    cmd += ["--", *directories]
    out = subprocess.run(cmd, cwd=REPO_ROOT, check=True, capture_output=True).stdout
    return sorted(p for p in out.decode().split("\0") if p)


def count_words(path, code):
    data = (REPO_ROOT / path).read_bytes()
    if b"\0" in data:
        return None  # binary
    text = data.decode("utf-8", errors="replace")
    if code:
        return len(CODE_WORD.findall(text))
    return sum(1 for token in text.split() if WORD.search(token))


def summarize(directories, limit, include_untracked, verbose, code=False):
    counts = {}
    skipped = 0
    for path in tracked_files(directories, include_untracked):
        if not (REPO_ROOT / path).is_file():
            continue  # deleted in working tree
        words = count_words(path, code)
        if words is None:
            skipped += 1
        else:
            counts[path] = words

    total = sum(counts.values())
    limit_str = f" / {limit}" if limit is not None else ""
    print(f"{' + '.join(d + '/' for d in directories)}: {total}{limit_str} words in {len(counts)} files"
          + (f" ({skipped} binary skipped)" if skipped else ""))
    if verbose:
        for path, words in sorted(counts.items(), key=lambda kv: -kv[1]):
            print(f"  {words:>8}  {path}")

    if limit is not None and total > limit:
        print(f"  LIMIT EXCEEDED by {total - limit} words")
        return False
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--docs-dir", default="documents")
    parser.add_argument("--src-dir", default="src")
    parser.add_argument("--test-dir", default="test")
    parser.add_argument("--ext-dir", default="extension")
    # The limits are kept by the chief engineer (owner, #71); 0.4 raise: feature review #71.
    # 0.5 raise (#58), measured after cuts: feature review #78.
    # 0.6 raise: US-2, CR-10, TE-06 for ports and connections, meeting #85.
    # #63 (show walk), measured after review cuts: feature review #78.
    # #63 narrow fix (walk scope), reviewer-directed: measured after cuts.
    # #57 (apply), measured after review cuts (-10 src).
    # #57 narrow fix (apply rollback in finally), reviewer-directed: measured after cuts.
    # #29 (ports, connections, type-file files), meeting #85 estimate +90/+110: measured after review cuts (-11 src, -2 docs).
    # #31 (report connections, role), meeting #85 estimate +80/+130: +73/+114 measured after review cuts (-5 docs, -62 src).
    # #113 (Mermaid graph, CL-01.10, quote escaping): +73 src measured after review cuts (-10 src, -9 docs).
    # #113 after merging #111: +17 docs, the part of its +39 that #111 left no spare for, measured after review cuts (-11 docs).
    # #112 (CL-01.9 counts) after #111, #113: +31 docs (its measured net, the spare it used now taken by #113), +39 src after review cuts (-5 docs, -8 src).
    # Code counted as identifiers, keywords and numbers (owner, #121): src+test 6911 -> 12401 and extension
    # 1542 -> 2499, re-baselined by measurement with the same margins (src+test 0, extension 9 -> 15); no raise.
    parser.add_argument("--max-docs", type=int, default=5878, help="word limit for the documents directory")
    parser.add_argument("--max-src", type=int, default=12401, help="word limit for the source and test directories")
    parser.add_argument("--max-ext", type=int, default=2499, help="word limit for the extension directory")
    parser.add_argument("-u", "--include-untracked", action="store_true",
                        help="also count untracked files that are not git-ignored")
    parser.add_argument("-v", "--verbose", action="store_true", help="list per-file counts")
    args = parser.parse_args()

    ok = summarize([args.docs_dir], args.max_docs, args.include_untracked, args.verbose)
    ok &= summarize([args.src_dir, args.test_dir], args.max_src, args.include_untracked, args.verbose, code=True)
    ok &= summarize([args.ext_dir], args.max_ext, args.include_untracked, args.verbose, code=True)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
