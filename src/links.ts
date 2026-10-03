// TE-02, TE-03, TE-06: link confirmation, suspect links and verification coverage.
import { entry, linksOf, Refused, selection, subtree, writeYaml, type Entry, type Link, type Repo } from './repo.ts';
import type { Finding } from './validate.ts';
import { git, versionAt } from './version.ts';

export interface LinkState { source: string; link: Link; state: 'current' | 'suspect' | 'unconfirmed' }

// TE-03.1
export function linkStates(repo: Repo, versions: Map<string, string>): LinkState[] {
  const stateOf = (link: Link): LinkState['state'] => {
    if (!link.version) return 'unconfirmed';
    return link.version === versions.get(link.target) ? 'current' : 'suspect';
  };
  return [...repo.entries.values()].flatMap((source) => linksOf(source).map((link) => ({ source: source.id, link, state: stateOf(link) })));
}

// TE-03.1: links from test runs are evidence, not links to review.
export const fromRun = (repo: Repo, state: LinkState) => repo.entries.get(state.source)?.item.data.type === 'test-run';

// TE-02.1, TE-02.2: the fields a confirmation records.
export function confirmation(repo: Repo, target: string, version: string | undefined, commit = 'HEAD'): Omit<Link, 'type' | 'target'> {
  const tryGit = (args: string[]) => { try { return git(repo.root, args); } catch { return ''; } };
  const by = tryGit(['config', 'user.name']);
  if (!by) throw new Refused('Set git user.name before confirming');
  const hash = tryGit(['rev-parse', '--verify', '-q', '--short', commit]);
  const exact = hash && versionAt(repo.root, commit, target) === version;
  return { title: String(entry(repo, target).item.data.title), version, by, on: new Date().toISOString().slice(0, 10), ...(exact && { commit: hash }) };
}

// TE-02.1
export function confirm(repo: Repo, versions: Map<string, string>, findings: Finding[], source: string, type?: string, target?: string): Link[] {
  const sourceEntry = entry(repo, source);
  const matches = (link: Link) => (!type || link.type === type) && (!target || link.target === target);
  const selected = linksOf(sourceEntry).map((link, index) => ({ link, index })).filter(({ link }) => matches(link));
  for (const { link } of selected) {
    // TE-02.2
    const targetFile = repo.entries.get(link.target)?.item.path;
    const broken = findings.some((finding) => finding.severity === 'error' && finding.file === targetFile);
    if (broken || !versions.has(link.target)) throw new Refused(`${link.target} fails validation; fix it before confirming`);
  }
  const confirmations = selected.map(({ link, index }) => [index, confirmation(repo, link.target, versions.get(link.target))] as const);
  for (const [index, fields] of confirmations) {
    sourceEntry.meta.doc.deleteIn(['links', index, 'commit']);
    for (const [key, value] of Object.entries(fields)) sourceEntry.meta.doc.setIn(['links', index, key], value);
  }
  if (selected.length) writeYaml(repo.root, sourceEntry.meta);
  return selected.map(({ link }) => link);
}

// TE-03.2
export function changeSince(repo: Repo, link: Link): { commit?: string; diff: string } {
  const commits = git(repo.root, ['rev-list', 'HEAD']).split('\n').filter(Boolean);
  const commit = commits.find((candidate) => versionAt(repo.root, candidate, link.target) === link.version);
  if (!commit) return { diff: '' };
  const paths = subtree(repo, link.target).map((id) => entry(repo, id).path);
  return { commit, diff: git(repo.root, ['diff', commit, '--', ...paths]) };
}

export interface Coverage { requirement: string; state: 'verified' | 'pending' | 'unverified'; run?: string; outdated?: string[] }

// TE-06.1, TE-06.2
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
    if (passingRun) return { requirement: requirement.id, state: 'verified', run: passingRun.id };
    if (!verifies.length) return { requirement: requirement.id, state: 'unverified' };
    const outdated = verifies.map((state) => latestRun.get(state.source)?.id).filter((id) => id && outdatedRuns.has(id)) as string[];
    return { requirement: requirement.id, state: 'pending', ...(outdated.length && { outdated }) };
  });
}
