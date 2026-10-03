// TE-01: item versions from Git object hashes.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { parse } from 'yaml';
import { list, nameMatches, usesOf, type Repo } from './repo.ts';

export function git(root: string, args: string[], env: Record<string, string> = {}): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 1 << 28 }).trim();
}

// TE-01.1: a requirement's version is its blob hash; an item's is the SHA-256 of
// its folder's tree hash followed by the versions of the items it uses.
export function computeVersions(ids: Iterable<string>, hashes: Map<string, string>, pathOf: (id: string) => string | undefined, uses: (id: string) => string[]) {
  const versions = new Map<string, string>();
  const visit = (id: string, chain: string[]): string | undefined => {
    const path = pathOf(id);
    const hash = path && hashes.get(path);
    if (!hash || versions.has(id)) return versions.get(id) ?? hash;
    if (chain.includes(id)) throw new Error(`Cycle in uses: ${[...chain, id].join(' → ')}`);
    const used = () => uses(id).map((u) => visit(u, [...chain, id])).filter(Boolean);
    versions.set(id, path.endsWith('.yaml') ? hash : createHash('sha256').update([hash, ...used()].join('\n')).digest('hex'));
    return versions.get(id);
  };
  for (const id of ids) visit(id, []);
  return versions;
}

// Hash of every tree and blob below a tree-ish, by path.
function objectHashes(root: string, tree: string): Map<string, string> {
  const rows = git(root, ['ls-tree', '-r', '-t', '-z', tree]).split('\0').filter(Boolean);
  return new Map(rows.map((row) => {
    const [info, path] = row.split('\t');
    return [path, info.split(' ')[2]];
  }));
}

// TE-01.2: stage the working tree into a temporary index, so LFS filters apply.
export function currentVersions(repo: Repo): Map<string, string> {
  const tops = [...repo.entries.values()].map((e) => e.path).filter((path) => !path.includes('/'));
  if (!tops.length) return new Map();
  const dir = mkdtempSync(join(tmpdir(), 'plm-'));
  try {
    const env = { GIT_INDEX_FILE: join(dir, 'index') };
    git(repo.root, ['add', '-A', '--', ...tops], env);
    const hashes = objectHashes(repo.root, git(repo.root, ['write-tree'], env));
    return computeVersions(repo.entries.keys(), hashes, (id) => repo.entries.get(id)?.path, (id) => usesOf(repo.entries.get(id)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// An item's version as of a commit (used by TE-03.2).
export function versionAt(root: string, commit: string, id: string): string | undefined {
  const hashes = objectHashes(root, commit);
  const pathOf = (id: string) => [...hashes.keys()].find((p) => nameMatches(basename(p), id)
    && (hashes.has(`${p}/item.yaml`) || (p.endsWith('.yaml') && basename(dirname(p)) === 'requirements')));
  const uses = (id: string) => list<string>(parse(git(root, ['show', `${commit}:${pathOf(id)}/item.yaml`]))?.uses);
  return computeVersions([id], hashes, pathOf, uses).get(id);
}
