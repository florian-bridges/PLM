// TE-01: item versions from Git tree hashes.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { childrenOf, list, type Repo } from './repo.ts';

export function git(root: string, args: string[], env: Record<string, string> = {}): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 1 << 28 }).trim();
}

// TE-01.1: SHA-256 of the tree hash followed by the children's versions in listed order.
export function computeVersions(trees: Map<string, string>, childrenOf: (id: string) => string[], ids = [...trees.keys()]) {
  const versions = new Map<string, string>();
  const visit = (id: string, path: string[]): string => {
    if (versions.has(id)) return versions.get(id)!;
    if (path.includes(id)) throw new Error(`Composition cycle: ${[...path, id].join(' → ')}`);
    const children = childrenOf(id).filter((child) => trees.has(child)).map((child) => visit(child, [...path, id]));
    const version = createHash('sha256').update([trees.get(id), ...children].join('\n')).digest('hex');
    versions.set(id, version);
    return version;
  };
  ids.filter((id) => trees.has(id)).forEach((id) => visit(id, []));
  return versions;
}

// Tree hash of each item directory below a tree.
function itemTrees(root: string, tree: string): Map<string, string> {
  const rows = git(root, ['ls-tree', tree]).split('\n').filter((row) => row.includes(' tree '));
  return new Map(rows.map((row) => [row.split('\t')[1], row.split(' ')[2]]));
}

// TE-01.2: stage the working tree into a temporary index, so LFS filters apply.
export function currentVersions(repo: Repo): Map<string, string> {
  const dir = mkdtempSync(join(tmpdir(), 'plm-'));
  try {
    const env = { GIT_INDEX_FILE: join(dir, 'index') };
    git(repo.root, ['add', '-A', '--', 'items'], env);
    const trees = itemTrees(repo.root, git(repo.root, ['write-tree', '--prefix=items/'], env));
    return computeVersions(trees, (id) => childrenOf(repo.entries.get(id)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// An item's version as of a commit (used by TE-03.2).
export function versionAt(root: string, commit: string, id: string): string | undefined {
  const children = (child: string) => list<string>(parse(git(root, ['show', `${commit}:items/${child}/item.yaml`]))?.children);
  return computeVersions(itemTrees(root, `${commit}:items`), children, [id]).get(id);
}
