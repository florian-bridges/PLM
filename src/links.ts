// TE-02, TE-03, TE-06, CL-03
import { copyFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Document, parseDocument } from 'yaml';
import { entry, linksOf, named, newId, Refused, selection, subtree, UsageError, writeYaml, type Link, type Named, type Repo } from './repo.ts';
import type { Finding } from './validate.ts';
import { currentVersions, git, versionAt } from './version.ts';

export interface LinkState { source: string; title: string; link: Link; targetTitle: string; state: 'current' | 'suspect' | 'unconfirmed' }

const tryGit = (repo: Repo, args: string[]) => { try { return git(repo.root, args); } catch { return ''; } };

// TE-03.1
const strip = (repo: Repo, hash?: string) => {
  const text = hash && tryGit(repo, ['cat-file', '-p', hash]);
  if (!text) return undefined;
  const doc = parseDocument(text);
  for (const f of repo.settings.informative ?? ['rationale']) doc.delete(f);
  return doc.toString();
};

// TE-03.1, CL-05.3
export function linkStates(repo: Repo, versions: Map<string, string>): LinkState[] {
  const stateOf = (link: Link): LinkState['state'] => {
    if (!link.version) return 'unconfirmed';
    if (link.version === versions.get(link.target)) return 'current';
    const confirmed = repo.entries.get(link.target)?.item.data.type === 'requirement' && strip(repo, link.version);
    return !!confirmed && confirmed === strip(repo, versions.get(link.target)) ? 'current' : 'suspect';
  };
  return [...repo.entries.values()].flatMap((source) => linksOf(source).map((link) => ({
    source: source.id, title: named(repo, source.id).title, link, targetTitle: named(repo, link.target).title, state: stateOf(link),
  })));
}

// TE-03.1
export const fromRun = (repo: Repo, state: LinkState) => repo.entries.get(state.source)?.item.data.type === 'test-run';

// TE-02.1, TE-02.2
export function confirmation(repo: Repo, target: string, version: string | undefined): Omit<Link, 'type' | 'target'> {
  const by = tryGit(repo, ['config', 'user.name']);
  if (!by) throw new Refused('Set git user.name before confirming');
  const hash = tryGit(repo, ['rev-parse', '--verify', '-q', '--short', 'HEAD']);
  const exact = hash && versionAt(repo.root, 'HEAD', target) === version;
  return { title: String(entry(repo, target).item.data.title), version, by, on: new Date().toISOString().slice(0, 10), ...(exact && { commit: hash }) };
}

// TE-02.1, CL-01.2
export function confirm(repo: Repo, versions: Map<string, string>, findings: Finding[], source: string, target?: string): Link[] {
  const sourceEntry = entry(repo, source);
  // TE-02.2
  if (sourceEntry.item.data.type === 'test-run') throw new Refused('Test run links are confirmed when recording');
  const links = linksOf(sourceEntry).filter((link) => !target || link.target === target);
  for (const link of links) {
    const targetFile = repo.entries.get(link.target)?.item.path;
    const broken = findings.some((finding) => finding.severity === 'error' && finding.file === targetFile);
    if (broken || !versions.has(link.target)) throw new Refused(`${link.target} fails validation; fix it before confirming`);
    sourceEntry.meta.doc.setIn(['confirmed', link.target], confirmation(repo, link.target, versions.get(link.target)));
  }
  if (links.length) writeYaml(repo.root, sourceEntry.meta);
  return links;
}

// CL-01.1
export function addLink(repo: Repo, source: string, type: string, target: string): void {
  const { item } = entry(repo, source);
  if (item.doc.hasIn(['links'])) item.doc.addIn(['links'], { type, target });
  else item.doc.setIn(['links'], [{ type, target }]);
  writeYaml(repo.root, item);
}

// CL-03.1, CL-03.2
export function recordRun(repo: Repo, testCases: string[], sut: string, results: string[], logs: string[]): string {
  if (results.length !== testCases.length) throw new UsageError('Give one result per test case');
  const current = currentVersions(repo);
  const links: Link[] = [{ type: 'tests', target: sut }, ...testCases.map((target, i) => ({ type: 'executes', target, result: results[i] }))];
  const confirmed = Object.fromEntries(links.map(({ target }) => [target, confirmation(repo, target, versionAt(repo.root, 'HEAD', target))]));
  // CL-03.3
  const changed = links.find(({ target }) => confirmed[target].version !== current.get(target));
  if (changed) throw new Refused(`${changed.target} differs from HEAD; commit it first`);

  const id = newId(repo, 'test-run');
  const folder = `${repo.settings.folders!['test-run']}/${id}`;
  const item = { id, type: 'test-run', title: `${testCases.join(', ')} on ${sut}`, date: new Date().toISOString(), links };
  writeYaml(repo.root, { path: `${folder}/item.yaml`, doc: new Document(item) });
  writeYaml(repo.root, { path: `meta/${id}.yaml`, doc: new Document({ status: 'draft', confirmed }) });
  for (const log of logs) copyFileSync(log, join(repo.root, folder, basename(log)));
  return id;
}

// TE-03.2
export function changeSince(repo: Repo, link: Link): { commit?: string; diff: string } {
  const known = link.commit && tryGit(repo, ['rev-parse', '--verify', '-q', `${link.commit}^{commit}`]);
  const commit = known ? link.commit : git(repo.root, ['rev-list', 'HEAD']).split('\n').filter(Boolean)
    .find((candidate) => versionAt(repo.root, candidate, link.target) === link.version);
  if (!commit) return { diff: '' };
  const paths = subtree(repo, link.target).map((id) => entry(repo, id).path);
  return { commit, diff: git(repo.root, ['diff', commit, '--', ...paths]) };
}

// TE-03.1
const within = (repo: Repo, root?: string) => {
  const selected = root && new Set(selection(repo, root));
  return (id: string) => !selected || selected.has(id);
};

export const suspects = (repo: Repo, states: LinkState[], root?: string) => {
  const inScope = within(repo, root);
  return states.filter((state) => state.state !== 'current' && !fromRun(repo, state) && inScope(state.source));
};

export interface Coverage {
  requirement: string; title: string; state: 'verified' | 'pending' | 'unverified';
  tests: { testCase: Named; run?: Named; result?: string; outdated?: boolean }[];
}

// TE-06.1, TE-06.2, CL-05.3
export function coverage(repo: Repo, states: LinkState[], root?: string): Coverage[] {
  const linksOfType = (type: string) => states.filter((state) => state.link.type === type);
  const isCurrent = (state: LinkState) => state.state === 'current';

  const outdatedRuns = new Set(states.filter((state) => fromRun(repo, state) && !isCurrent(state)).map((state) => state.source));
  const runsOfCurrentSut = new Set(linksOfType('tests').filter(isCurrent).map((state) => state.source));
  const latestRun = new Map<string, LinkState>();
  const latestCurrentRun = new Map<string, LinkState>();
  const date = (executes: LinkState) => String(entry(repo, executes.source).item.data.date);
  const keepLatest = (latest: Map<string, LinkState>, executes: LinkState) => {
    const previous = latest.get(executes.link.target);
    if (!previous || date(executes) > date(previous)) latest.set(executes.link.target, executes);
  };
  for (const executes of linksOfType('executes')) {
    keepLatest(latestRun, executes);
    if (!outdatedRuns.has(executes.source) && runsOfCurrentSut.has(executes.source)) keepLatest(latestCurrentRun, executes);
  }

  const inScope = within(repo, root);
  const requirements = [...repo.entries.values()].filter((candidate) => candidate.item.data.type === 'requirement' && inScope(candidate.id));

  return requirements.map((requirement) => {
    const verifies = linksOfType('verifies').filter((state) => state.link.target === requirement.id);
    const passingRun = verifies.filter(isCurrent)
      .map((state) => latestCurrentRun.get(state.source))
      .find((executes) => executes?.link.result === 'pass');
    const tests = verifies.map(({ source }) => {
      const latest = latestRun.get(source);
      return { testCase: named(repo, source), ...(latest && { run: named(repo, latest.source), result: latest.link.result, outdated: outdatedRuns.has(latest.source) }) };
    });
    const row = { requirement: requirement.id, title: named(repo, requirement.id).title, tests };
    if (passingRun) return { ...row, state: 'verified' };
    return { ...row, state: verifies.length ? 'pending' : 'unverified' };
  });
}
