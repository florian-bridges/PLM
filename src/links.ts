import { copyFileSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Document, parseDocument } from 'yaml';
import { entry, git, isRequirementFile, linksOf, list, named, newId, Refused, selection, subtree, targetId, tryGit, UsageError, writeYaml, type Link, type Named, type Repo } from './repo.ts';
import { disallowed } from './schemas.ts';
import type { Finding } from './validate.ts';
import { currentVersions, versionAt } from './version.ts';

export interface LinkState { source: string; title: string; link: Link; targetTitle: string; state: 'current' | 'suspect' | 'unconfirmed' }

// TE-03.1
const strip = (repo: Repo, text: string) => {
  const doc = parseDocument(text);
  for (const f of repo.settings.informative ?? ['rationale']) doc.delete(f);
  return doc.toString();
};

// TE-03.1, TE-03.2
const commitAndPaths = (repo: Repo, link: Link): [string | undefined, string[]] => {
  const commit = (link.commit && tryGit(repo.root, ['rev-parse', '--verify', '-q', `${link.commit}^{commit}`]) && link.commit)
    || [...tryGit(repo.root, ['log', '--format=%H', `--find-object=${link.version}`]).split('\n'), ...tryGit(repo.root, ['rev-list', 'HEAD']).split('\n')].filter(Boolean)
      .find((c) => versionAt(repo.root, c, link.target) === link.version);
  return [commit, subtree(repo, targetId(link.target)).map((id) => entry(repo, id).path)];
};

// TE-03.1, CL-05.3
export function linkStates(repo: Repo, versions: Map<string, string>) {
  const stateOf = (link: Link): LinkState['state'] => {
    if (!link.version) return 'unconfirmed';
    if (link.version === versions.get(link.target)) return 'current';
    const [commit, paths] = commitAndPaths(repo, link),
      own = paths.map((p) => isRequirementFile(p) ? p : `${p}/item.yaml`),
      changed = commit ? tryGit(repo.root, ['diff', '--name-only', commit, '--', ...paths]).split('\n').filter(Boolean) : [],
      // absent at the commit: changed
      equal = (f: string) => { try { return strip(repo, git(repo.root, ['show', `${commit}:${f}`])) === strip(repo, readFileSync(join(repo.root, f), 'utf8')); } catch { return false; } };
    return changed.length && changed.every((f) => own.includes(f) && equal(f)) ? 'current' : 'suspect';
  };
  return [...repo.entries.values()].flatMap((source) => linksOf(source).map((link) => ({
    source: source.id, title: named(repo, source.id).title, link, targetTitle: named(repo, targetId(link.target)).title, state: stateOf(link),
  })));
}

// TE-03.1
export const fromRun = (repo: Repo, state: LinkState) => repo.entries.get(state.source)?.item.data.type === 'test-run';

// TE-02.1–TE-02.2
function confirmation(repo: Repo, target: string, version: string | undefined) {
  const by = tryGit(repo.root, ['config', 'user.name']);
  if (!by) throw new Refused('Set git user.name');
  const hash = tryGit(repo.root, ['rev-parse', '--verify', '-q', '--short', 'HEAD']),
    exact = hash && versionAt(repo.root, 'HEAD', target) === version;
  return { title: named(repo, targetId(target)).title, version, by, on: new Date().toISOString().slice(0, 10), ...(exact && { commit: hash }) };
}

// TE-02.1, CL-01.2
export function confirm(repo: Repo, versions: Map<string, string>, findings: Finding[], source: string, target?: string) {
  const sourceEntry = entry(repo, source), links = linksOf(sourceEntry).filter((link) => !target || link.target === target);
  // TE-02.2
  if (sourceEntry.item.data.type === 'test-run') throw new Refused('Test runs confirm at recording');
  for (const link of links) {
    const targetFile = repo.entries.get(targetId(link.target))?.item.path,
      broken = findings.some((finding) => finding.severity === 'error' && finding.file === targetFile);
    if (broken || !versions.has(link.target)) throw new Refused(`${link.target} fails validation`);
    sourceEntry.meta.doc.setIn(['confirmed', link.target], confirmation(repo, link.target, versions.get(link.target)));
  }
  if (links.length) writeYaml(repo.root, sourceEntry.meta);
  return links;
}

// CL-01.1
export function link(repo: Repo, source: string, type: string, target: string, remove?: boolean) {
  const { item, meta } = entry(repo, source), links = list<Link>(item.data.links),
    at = links.findIndex((l) => l.type === type && l.target === target), found = repo.entries.get(targetId(target)),
    bad = !remove && found && disallowed(item.data.type, type, found.item.data.type);
  if (bad) throw new UsageError(bad);
  if (!remove) item.doc.setIn(['links', links.length], { type, target });
  else if (at < 0) throw new UsageError(target);
  else item.doc.deleteIn(['links', at]), meta.doc.has('confirmed')&&meta.doc.deleteIn(['confirmed', target]), writeYaml(repo.root, meta);
  writeYaml(repo.root, item);
}

// CL-03.1–CL-03.2
export function recordRun(repo: Repo, testCases: string[], suts: string[], results: string[], logs: string[]) {
  if (results.length !== testCases.length) throw new UsageError('One result per test');
  const current = currentVersions(repo),
    links: Link[] = [...suts.map((target) => ({ type: 'tests', target })), ...testCases.map((target, i) => ({ type: 'executes', target, result: results[i] }))],
    confirmed = Object.fromEntries(links.map(({ target }) => [target, confirmation(repo, target, versionAt(repo.root, 'HEAD', target))]));
  // CL-03.3
  const changed = links.find(({ target }) => confirmed[target].version !== current.get(target));
  if (changed) throw new Refused(`${changed.target} differs from HEAD`);

  const id = newId(repo, 'test-run'),
    folder = `${repo.settings.folders!['test-run']}/${id}`,
    item = { id, type: 'test-run', title: `${testCases.join(', ')} on ${suts.join(', ')}`, date: new Date().toISOString(), links };
  writeYaml(repo.root, { path: `${folder}/item.yaml`, doc: new Document(item) });
  writeYaml(repo.root, { path: `meta/${id}.yaml`, doc: new Document({ status: 'draft', confirmed }) });
  for (const log of logs) copyFileSync(log, join(repo.root, folder, basename(log)));
  return id;
}

// TE-03.2
export function changeSince(repo: Repo, link: Link) {
  const [commit, paths] = commitAndPaths(repo, link);
  return commit ? { commit, diff: git(repo.root, ['diff', commit, '--', ...paths]) } : { diff: '' };
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
  requirement: string; title: string; state: 'verified' | 'pending' | 'unverified' | 'allocated' | 'unallocated';
  tests: { testCase: Named; run?: Named; result?: string; outdated?: boolean }[];
}

// TE-06.1, TE-06.2, CL-05.3
export function coverage(repo: Repo, states: LinkState[], root?: string): Coverage[] {
  const linksOfType = (type: string) => states.filter((state) => state.link.type === type),
    isCurrent = (state: LinkState) => state.state === 'current',
    outdatedRuns = new Set(states.filter((state) => fromRun(repo, state) && !isCurrent(state)).map((state) => state.source)),
    date = (executes: LinkState) => String(entry(repo, executes.source).item.data.date),
    runs = linksOfType('executes').sort((a, b) => date(a).localeCompare(date(b))),
    // later runs override earlier ones
    latest = (executed: LinkState[]) => new Map<string, LinkState>(executed.map((executes) => [executes.link.target, executes])),
    latestRun = latest(runs),
    latestCurrentRun = latest(runs.filter((executes) => !outdatedRuns.has(executes.source)));

  const inScope = within(repo, root),
    requirements = [...repo.entries.values()].filter((candidate) => candidate.item.data.type === 'requirement' && inScope(candidate.id));

  return requirements.map((requirement) => {
    const verifies = linksOfType('verifies').filter((state) => state.link.target === requirement.id),
      passingRun = verifies.filter(isCurrent).map((state) => latestCurrentRun.get(state.source)).find((executes) => executes?.link.result === 'pass'),
      tests = verifies.map(({ source }) => {
        const latest = latestRun.get(source);
        return { testCase: named(repo, source), ...(latest && { run: named(repo, latest.source), result: latest.link.result, outdated: outdatedRuns.has(latest.source) }) };
      });
    return { requirement: requirement.id, title: named(repo, requirement.id).title, tests, state: passingRun ? 'verified' : verifies.length ? 'pending' : 'unverified' };
  });
}

// TE-06.4
export function allocation(repo: Repo, states: LinkState[], root?: string): Coverage[] {
  const inScope = within(repo, root), satisfied = new Set(states.filter((s) => s.link.type === 'satisfies').map((s) => s.link.target));
  return [...repo.entries.values()].filter((i) => inScope(i.id) && subtree(repo, i.id).slice(1).some((c) => entry(repo, c).requirements.length))
    .flatMap((i) => i.requirements.map((id) => ({ requirement: id, title: named(repo, id).title, tests: [], state: satisfied.has(id) ? 'allocated' : 'unallocated' })));
}
