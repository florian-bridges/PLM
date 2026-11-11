// TE-01
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { parse } from 'yaml';
import { git, isRequirementFile, linksOf, list, loadRepo, targetId, tracked, tryGit, UsageError, type Parameter, type Repo } from './repo.ts';

// TE-01.1
const sha = (text: string) => createHash('sha256').update(text).digest('hex');

// TE-01.1, CO-02.7
function computeVersions(ids: Iterable<string>, hashes: Map<string, string>, pathOf: (id: string) => string | undefined, dataOf: (id: string, path: string) => any) {
  const versions = new Map<string, string>(),
    visit = (id: string, usedBy: string[]) => {
      const base = targetId(id), path = pathOf(base), isParam = id !== base,
        parameter = path && isParam ? list<Parameter>(dataOf(base, path)?.parameters).find((p) => p.name === id.slice(base.length + 1)) : undefined,
        hash = isParam ? parameter && sha(JSON.stringify(parameter)) : path && hashes.get(path);
      if (!path || !hash || versions.has(id)) return versions.get(id) ?? hash;
      if (usedBy.includes(id)) return undefined;
      if (isRequirementFile(path) || isParam) versions.set(id, hash);
      else versions.set(id, sha([hash, ...list<string>(dataOf(id, path)?.uses).map((used) => visit(used, [...usedBy, id])).filter(Boolean)].join('\n')));
      return versions.get(id);
    };
  for (const id of ids) visit(id, []);
  return versions;
}

// TE-01.1
function objectHashes(root: string, tree: string): Map<string, string> {
  return new Map([...git(root, ['ls-tree', '-r', '-t', '-z', tree]).matchAll(/ (\w+)\t([^\0]+)/g)].map((row) => [row[2], row[1]]));
}

// TE-01.1
function versionsFromHashes(repo: Repo, hashes: Map<string, string>) {
  const targets = [...repo.entries.values()].flatMap((e) => linksOf(e).map((l) => l.target));
  return computeVersions([...repo.entries.keys(), ...targets], hashes, (id) => repo.entries.get(id)?.path, (id) => repo.entries.get(id)?.item.data);
}

// TE-01.2
export function currentVersions(repo: Repo) {
  const tempFolder = mkdtempSync(join(tmpdir(), 'plm-'));
  try {
    const env = { GIT_INDEX_FILE: join(tempFolder, 'index') };
    // exit 1: paths skipped
    try { git(repo.root, ['add', '--ignore-errors', '--', ...tracked(repo)], env); } catch (error) { if ((error as { status?: number }).status !== 1) throw error; }
    return versionsFromHashes(repo, objectHashes(repo.root, git(repo.root, ['write-tree'], env)));
  } finally {
    rmSync(tempFolder, { recursive: true, force: true });
  }
}

// TE-03.2
export function versionAt(root: string, commit: string, target: string) {
  const hashes = objectHashes(root, commit),
    pathOf = (wanted: string) => {
      const path = tryGit(root, ['grep', '-l', `^id: ${wanted}$`, commit, '--', '*.yaml']).split('\n')[0].slice(commit.length + 1);
      return basename(path) === 'item.yaml' ? dirname(path) : path || undefined;
    },
    dataOf = (_: string, path: string) => parse(git(root, ['show', `${commit}:${isRequirementFile(path) ? path : `${path}/item.yaml`}`]));
  return computeVersions([target], hashes, pathOf, dataOf).get(target);
}

export interface Snapshot { repo: Repo; versions: Map<string, string> }

// TE-05.1
export function snapshotAt(root: string, commit: string) {
  if (!tryGit(root, ['rev-parse', '--verify', '-q', `${commit}^{commit}`])) throw new UsageError(`Unknown commit ${commit}`);
  const prefix = git(root, ['rev-parse', '--show-prefix']), worktree = mkdtempSync(join(tmpdir(), 'plm-'));
  try {
    git(root, ['worktree', 'add', '--detach', '-q', worktree, commit], { GIT_LFS_SKIP_SMUDGE: '1' });
    const repo = loadRepo(join(worktree, prefix));
    return { repo, versions: versionsFromHashes(repo, objectHashes(root, commit)) };
  } finally {
    rmSync(worktree, { recursive: true, force: true });
    git(root, ['worktree', 'prune']);
  }
}
