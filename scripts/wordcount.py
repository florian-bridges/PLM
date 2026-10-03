#!/usr/bin/env python3
"""Count words in git-tracked files of the documents, source, test and extension directories.

Test words count toward the source limit; the extension has its own limit.

Words are whitespace-separated tokens containing a letter or digit, so
punctuation-only tokens such as `{`, `});` or `|` do not count and line
breaks cost nothing. Binary files are skipped.
Exits with status 1 if a given word limit is exceeded.
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
WORD = re.compile(r"\w")


def tracked_files(directories, include_untracked):
    cmd = ["git", "ls-files", "-z"]
    if include_untracked:
        cmd += ["--cached", "--others", "--exclude-standard"]
    cmd += ["--", *directories]
    out = subprocess.run(cmd, cwd=REPO_ROOT, check=True, capture_output=True).stdout
    return sorted(p for p in out.decode().split("\0") if p)


def count_words(path):
    data = (REPO_ROOT / path).read_bytes()
    if b"\0" in data:
        return None  # binary
    tokens = data.decode("utf-8", errors="replace").split()
    return sum(1 for token in tokens if WORD.search(token))


def summarize(directories, limit, include_untracked, verbose):
    counts = {}
    skipped = 0
    for path in tracked_files(directories, include_untracked):
        if not (REPO_ROOT / path).is_file():
            continue  # deleted in working tree
        words = count_words(path)
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
    parser.add_argument("--max-docs", type=int, help="word limit for the documents directory")
    parser.add_argument("--max-src", type=int, help="word limit for the source and test directories")
    parser.add_argument("--max-ext", type=int, help="word limit for the extension directory")
    parser.add_argument("-u", "--include-untracked", action="store_true",
                        help="also count untracked files that are not git-ignored")
    parser.add_argument("-v", "--verbose", action="store_true", help="list per-file counts")
    args = parser.parse_args()

    ok = summarize([args.docs_dir], args.max_docs, args.include_untracked, args.verbose)
    ok &= summarize([args.src_dir, args.test_dir], args.max_src, args.include_untracked, args.verbose)
    ok &= summarize([args.ext_dir], args.max_ext, args.include_untracked, args.verbose)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
