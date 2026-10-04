// TE-02, TE-03, TE-06, CL-03
import { copyFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Document } from 'yaml';
import { entry, homeFolders, linksOf, named, newId, Refused, selection, subtree, writeYaml, type Entry, type Link, type Named, type Repo } from './repo.ts';
import type { Finding } from './validate.ts';
import { currentVersions, git, versionAt } from './version.ts';

export interface LinkState { source: string; title: string; link: Link; targetTitle: string; state: 'current' | 'suspect' | 'unconfirmed' }

// TE-03.1, CL-05.3
export function linkStates(repo: Repo, versions: Map<string, string>): LinkState[] {
  const stateOf = (link: Link): LinkState['state'] => {
    if (!link.version) return 'unconfirmed';
    return link.version === versions.get(link.target) ? 'current' : 'suspect';
  };
  return [...repo.entries.values()].flatMap((source) => linksOf(source).map((link) => ({
    source: source.id, title: named(repo, source.id).title, link, targetTitle: named(repo, link.target).title, state: stateOf(link),
  })));
}

// TE-03.1
export const fromRun = (repo: Repo, state: LinkState) => repo.entries.get(state.source)?.item.data.type === 'test-run';

const tryGit = (repo: Repo, args: string[]) => { try { return git(repo.root, args); } catch { return ''; } };

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

// CL-01.1, VS-01.4: a new, unconfirmed link.
export function addLink(repo: Repo, source: string, type: string, target: string): void {
  const { item } = entry(repo, source);
  if (item.doc.hasIn(['links'])) item.doc.addIn(['links'], { type, target });
  else item.doc.setIn(['links'], [{ type, target }]);
  writeYaml(repo.root, item);
}

// CL-03.1, CL-03.2
export function recordRun(repo: Repo, testCase: string, sut: string, result: string, logs: string[]): string {
  const current = currentVersions(repo);
  const links = [{ type: 'executes', target: testCase }, { type: 'tests', target: sut }];
  const confirmed = Object.fromEntries(links.map(({ target }) => [target, confirmation(repo, target, versionAt(repo.root, 'HEAD', target))]));
  // CL-03.3
  const changed = links.find(({ target }) => confirmed[target].version !== current.get(target));
  if (changed) throw new Refused(`${changed.target} differs from HEAD; commit it first`);

  const id = newId(repo, 'test-run');
  const folder = `${homeFolders['test-run']}/${id}`;
  const item = { id, type: 'test-run', title: `${testCase} on ${sut}`, date: new Date().toISOString(), result, links };
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

export interface Coverage { requirement: string; title: string; state: 'verified' | 'pending' | 'unverified'; run?: Named; outdated?: Named[] }

// TE-06.1, TE-06.2, CL-05.3
export function coverage(repo: Repo, states: LinkState[], root?: string): Coverage[] {
  const linksOfType = (type: string) => states.filter((state) => state.link.type === type);
  const isCurrent = (state: LinkState) => state.state === 'current';

  // Each test case's latest run, overall and among runs with current links.
  const outdatedRuns = new Set(states.filter((state) => fromRun(repo, state) && !isCurrent(state)).map((state) => state.source));
  const runsOfCurrentSut = new Set(linksOfType('tests').filter(isCurrent).map((state) => state.source));
  const latestRun = new Map<string, Entry>();
  const latestCurrentRun = new Map<string, Entry>();
  const keepLatest = (latest: Map<string, Entry>, testCase: string, run: Entry) => {
    const previous = latest.get(testCase);
    if (!previous || String(run.item.data.date) > String(previous.item.data.date)) latest.set(testCase, run);
  };
  for (const executes of linksOfType('executes')) {
    const run = entry(repo, executes.source);
    keepLatest(latestRun, executes.link.target, run);
    if (!outdatedRuns.has(run.id) && runsOfCurrentSut.has(run.id)) keepLatest(latestCurrentRun, executes.link.target, run);
  }

  const selected = root ? new Set(selection(repo, root)) : undefined;
  const inScope = (requirement: Entry) => !selected || selected.has(requirement.id);
  const requirements = [...repo.entries.values()].filter((candidate) => candidate.item.data.type === 'requirement' && inScope(candidate));

  return requirements.map((requirement) => {
    const verifies = linksOfType('verifies').filter((state) => state.link.target === requirement.id);
    const passingRun = verifies.filter(isCurrent)
      .map((state) => latestCurrentRun.get(state.source))
      .find((run) => run?.item.data.result === 'pass');
    const row = { requirement: requirement.id, title: named(repo, requirement.id).title };
    if (passingRun) return { ...row, state: 'verified', run: named(repo, passingRun.id) };
    if (!verifies.length) return { ...row, state: 'unverified' };
    const outdated = verifies.map((state) => latestRun.get(state.source)?.id).filter((id) => id && outdatedRuns.has(id)) as string[];
    return { ...row, state: 'pending', ...(outdated.length && { outdated: outdated.map((id) => named(repo, id)) }) };
  });
}
