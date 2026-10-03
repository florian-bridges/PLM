// TE-02, TE-03, TE-06: link confirmation, suspect links and verification coverage.
import { dirname } from 'node:path';
import { entry, linksOf, Refused, subtree, writeYaml, type Entry, type Link, type Repo } from './repo.ts';
import type { Finding } from './validate.ts';
import { git, versionAt } from './version.ts';

export interface LinkState { source: string; link: Link; state: 'current' | 'suspect' | 'unconfirmed' }

// TE-03.1
export function linkStates(repo: Repo, versions: Map<string, string>): LinkState[] {
  return [...repo.entries.values()].flatMap((e) => linksOf(e).map((link): LinkState => ({
    source: e.id,
    link,
    state: !link.version ? 'unconfirmed' : link.version === versions.get(link.target) ? 'current' : 'suspect',
  })));
}

// TE-02.1: store each target's current version with the link.
export function confirm(repo: Repo, versions: Map<string, string>, findings: Finding[], source: string, type?: string, target?: string): Link[] {
  const e = entry(repo, source);
  const selected = linksOf(e).map((link, index) => ({ link, index }))
    .filter(({ link }) => (!type || link.type === type) && (!target || link.target === target));
  for (const { link } of selected) {
    // TE-02.2
    const broken = findings.some((f) => f.severity === 'error' && f.file === repo.entries.get(link.target)?.item.path);
    if (broken || !versions.has(link.target)) throw new Refused(`${link.target} fails validation; fix it before confirming`);
  }
  for (const { link, index } of selected) e.meta.doc.setIn(['links', index, 'version'], versions.get(link.target));
  if (selected.length) writeYaml(repo.root, e.meta);
  return selected.map(({ link }) => link);
}

// TE-03.2
export function changeSince(repo: Repo, link: Link): { commit?: string; diff: string } {
  const commits = git(repo.root, ['rev-list', 'HEAD']).split('\n').filter(Boolean);
  const commit = commits.find((c) => versionAt(repo.root, c, link.target) === link.version);
  if (!commit) return { diff: '' };
  return { commit, diff: git(repo.root, ['diff', commit, '--', ...subtree(repo, link.target).map((id) => repo.entries.get(id)!.path)]) };
}

export interface Coverage { requirement: string; state: 'verified' | 'pending' | 'unverified'; run?: string }

// TE-06.1, TE-06.2
export function coverage(repo: Repo, states: LinkState[], root?: string): Coverage[] {
  const of = (type: string) => states.filter((s) => s.link.type === type);
  const tested = new Set(of('tests').filter((s) => s.state === 'current').map((s) => s.source));
  // Each test case's latest run with current links.
  const latest = new Map<string, Entry>();
  for (const s of of('executes').filter((s) => s.state === 'current' && tested.has(s.source))) {
    const run = entry(repo, s.source);
    if (String(run.item.data.date) > String(latest.get(s.link.target)?.item.data.date ?? '')) latest.set(s.link.target, run);
  }
  const scope = root && new Set(subtree(repo, root).map((id) => entry(repo, id).path));
  return [...repo.entries.values()].filter((e) => e.item.data.type === 'requirement' && (!scope || scope.has(dirname(dirname(e.path))))).map((e) => {
    const verifying = of('verifies').filter((s) => s.link.target === e.id);
    const run = verifying.filter((s) => s.state === 'current').map((s) => latest.get(s.source)).find((r) => r?.item.data.result === 'pass');
    return { requirement: e.id, state: run ? 'verified' : verifying.length ? 'pending' : 'unverified', run: run?.id };
  });
}
