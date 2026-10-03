// TE-01
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { parse } from 'yaml';
import { homeFolders, isRequirementFile, list, loadRepo, nameMatches, usesOf, UsageError, type Repo } from './repo.ts';

export function git(root: string, args: string[], env: Record<string, string> = {}): string {
  const options = { cwd: root, encoding: 'utf8' as const, env: { ...process.env, ...env }, maxBuffer: 1 << 28 };
  return execFileSync('git', args, options).trim();
}

// TE-01.1
export function computeVersions(
  ids: Iterable<string>,
  hashes: Map<string, string>,
  pathOf: (id: string) => string | undefined,
  usesOfId: (id: string) => string[],
): Map<string, string> {
  const versions = new Map<string, string>();
  const visit = (id: string, usedBy: string[]): string | undefined => {
    const path = pathOf(id);
    const hash = path && hashes.get(path);
    if (!hash || versions.has(id)) return versions.get(id) ?? hash;
    if (usedBy.includes(id)) return undefined;
    if (isRequirementFile(path)) versions.set(id, hash);
    else {
      const usedVersions = usesOfId(id).map((used) => visit(used, [...usedBy, id])).filter(Boolean);
      versions.set(id, createHash('sha256').update([hash, ...usedVersions].join('\n')).digest('hex'));
    }
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
    const [, , hash] = info.split(' ');
    return [path, hash];
  }));
}

// TE-01.1
function versionsFromHashes(repo: Repo, hashes: Map<string, string>): Map<string, string> {
  const pathOf = (id: string) => repo.entries.get(id)?.path;
  const usesOfId = (id: string) => usesOf(repo.entries.get(id));
  return computeVersions(repo.entries.keys(), hashes, pathOf, usesOfId);
}

// TE-01.2
export function currentVersions(repo: Repo): Map<string, string> {
  const topFolders = [...new Set([...repo.entries.values()].map((entry) => entry.path.split('/')[0]))];
  if (!topFolders.length) return new Map();
  const tempFolder = mkdtempSync(join(tmpdir(), 'plm-'));
  try {
    const env = { GIT_INDEX_FILE: join(tempFolder, 'index') };
    git(repo.root, ['add', '-A', '--no-warn-embedded-repo', '--', ...topFolders], env);
    return versionsFromHashes(repo, objectHashes(repo.root, git(repo.root, ['write-tree'], env)));
  } finally {
    rmSync(tempFolder, { recursive: true, force: true });
  }
}

// TE-03.2
export function versionAt(root: string, commit: string, id: string): string | undefined {
  const hashes = objectHashes(root, commit);
  const isItemFolder = (path: string) => hashes.has(`${path}/item.yaml`);
  const isRequirement = (path: string) => isRequirementFile(path) && basename(dirname(path)) === homeFolders.requirement;
  const pathOf = (wanted: string) => [...hashes.keys()].find((path) => nameMatches(basename(path), wanted) && (isItemFolder(path) || isRequirement(path)));
  const usesOfId = (wanted: string) => list<string>(parse(git(root, ['show', `${commit}:${pathOf(wanted)}/item.yaml`]))?.uses);
  return computeVersions([id], hashes, pathOf, usesOfId).get(id);
}

export interface Snapshot { repo: Repo; versions: Map<string, string> }

// TE-05.1: versions come from the commit, since worktrees lack submodules and LFS content.
export function snapshotAt(root: string, commit: string): Snapshot {
  try {
    git(root, ['rev-parse', '--verify', '--quiet', `${commit}^{commit}`]);
  } catch {
    throw new UsageError(`Unknown commit ${commit}`);
  }
  const prefix = git(root, ['rev-parse', '--show-prefix']);
  const worktree = mkdtempSync(join(tmpdir(), 'plm-'));
  try {
    git(root, ['worktree', 'add', '--detach', '-q', worktree, commit], { GIT_LFS_SKIP_SMUDGE: '1' });
    const repo = loadRepo(join(worktree, prefix));
    return { repo, versions: versionsFromHashes(repo, objectHashes(root, commit)) };
  } finally {
    rmSync(worktree, { recursive: true, force: true });
    git(root, ['worktree', 'prune']);
  }
}
