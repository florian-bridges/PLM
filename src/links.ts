import { copyFileSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Document, parseDocument } from 'yaml';
import { childrenOf, entry, git, isRequirementFile, linksOf, list, named, newId, Refused, subtree, targetId, tryGit, typeOf, UsageError, walk, writeYaml, type Entry, type Link, type Named, type Repo } from './repo.ts';
import { allowedLinks, allows, disallowed } from './schemas.ts';
import type { Finding } from './validate.ts';
import { currentVersions, versionAt } from './version.ts';

export interface LinkState { source: string; title: string; link: Link; targetTitle: string; state: 'current' | 'suspect' | 'unconfirmed' }

// TE-03.1
const strip = (repo: Repo, text: string) => {
  const doc = parseDocument(text);
  for (const f of repo.settings.informative ?? ['rationale', 'links']) doc.delete(f);
  return doc.toString();
};

// TE-03.1, TE-03.2
const commitAndPaths = (repo: Repo, link: Link) => {
  const commit = (link.commit && tryGit(repo.root, ['rev-parse', '--verify', '-q', `${link.commit}^{commit}`]) && link.commit)
    || [...tryGit(repo.root, ['log', '--format=%H', `--find-object=${link.version}`]).split('\n'), ...tryGit(repo.root, ['rev-list', 'HEAD']).split('\n')].filter(Boolean)
      .find((c) => versionAt(repo.root, c, link.target) === link.version);
  return [commit, subtree(repo, targetId(link.target)).map((id) => entry(repo, id).path)] as const;
};

// TE-03.1, CL-05.3
export function linkStates(repo: Repo, versions: Map<string, string>, only?: string) {
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
  return [...repo.entries.values()].flatMap((source) => linksOf(source).filter((link) => !only || source.id === only || link.target === only).map((link) => ({
    source: source.id, title: named(repo, source.id).title, link, targetTitle: named(repo, targetId(link.target)).title, state: stateOf(link),
  })));
}

// TE-03.1
export const fromRun = (repo: Repo, state: LinkState) => typeOf(repo, repo.entries.get(state.source)?.item.data.type) === 'test-run'; // CO-02.8

// TE-02.1–TE-02.2
function confirmation(repo: Repo, target: string, version: string | undefined, reason?: string) {
  const by = tryGit(repo.root, ['config', 'user.name']);
  if (!by) throw new Refused('Set git user.name');
  const hash = tryGit(repo.root, ['rev-parse', '--verify', '-q', '--short', 'HEAD']),
    exact = hash && versionAt(repo.root, 'HEAD', target) === version;
  return { title: named(repo, targetId(target)).title, version, by, on: new Date().toISOString().slice(0, 10), ...(exact && { commit: hash }), ...(reason && { reason }) };
}

// TE-02.1, CL-01.2
export function confirm(repo: Repo, versions: Map<string, string>, findings: Finding[], source: string, target?: string, reason?: string) {
  const sourceEntry = entry(repo, source), links = linksOf(sourceEntry).filter((link) => !target || link.target === target),
    isRun = typeOf(repo, sourceEntry.item.data.type) === 'test-run'; // CO-02.8
  // TE-02.2
  if (isRun && (!reason || links.some((link) => link.type !== 'tests'))) throw new Refused('Only a run\'s tests link, with --reason');
  for (const link of links) {
    const targetFile = repo.entries.get(targetId(link.target))?.item.path,
      broken = findings.some((finding) => finding.severity === 'error' && finding.file === targetFile);
    if (broken || !versions.has(link.target)) throw new Refused(`${link.target} fails validation`);
    sourceEntry.meta.doc.setIn(['confirmed', link.target], confirmation(repo, link.target, versions.get(link.target), reason));
  }
  if (links.length) writeYaml(repo.root, sourceEntry.meta);
  return links;
}

// CL-01.1
export function link(repo: Repo, source: string, type: string, target: string, remove?: boolean) {
  const { item, meta } = entry(repo, source), links = list<Link>(item.data.links),
    at = links.findIndex((l) => l.type === type && l.target === target), found = repo.entries.get(targetId(target)),
    bad = !remove && found && disallowed(repo, String(item.data.type), type, String(found.item.data.type)); // CO-02.9
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
    folder = `${repo.types['test-run'].folder}/${id}`,
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

// TE-03.1, TE-06.2
const within = (repo: Repo, root?: string, type?: string) => {
  const items = root && new Set(walk(repo, root, true, Infinity, false).map((w) => w.id));
  return [...repo.entries.values()].filter((e) => (!items || items.has(e.id)) && (!type || typeOf(repo, e.item.data.type) === type));
};

export const suspects = (repo: Repo, states: LinkState[], root?: string) => {
  const ids = within(repo, root).map((e) => e.id);
  return states.filter((state) => state.state !== 'current' && !fromRun(repo, state) && ids.includes(state.source));
};

export interface Coverage {
  requirement: string; title: string; state: 'verified' | 'pending' | 'unverified' | 'allocated' | 'retained' | 'unallocated';
  tests: { testCase: Named; run?: Named; result?: string; outdated?: boolean }[];
}

// TE-06.1, TE-06.2, CL-05.3, CO-02.8
export function coverage(repo: Repo, states: LinkState[], root?: string): Coverage[] {
  const linksOfType = (type: string) => states.filter((state) => state.link.type === type),
    isCurrent = (state: LinkState) => state.state === 'current',
    outdatedRuns = new Set(states.filter((state) => fromRun(repo, state) && !isCurrent(state)).map((state) => state.source)),
    date = (executes: LinkState) => String(entry(repo, executes.source).item.data.date),
    runs = linksOfType('executes').sort((a, b) => date(a) < date(b) ? -1 : +(date(a) > date(b))),
    // later runs override earlier ones
    latest = (executed: LinkState[]) => new Map<string, LinkState>(executed.map((executes) => [executes.link.target, executes])),
    latestRun = latest(runs),
    latestCurrentRun = latest(runs.filter((executes) => !outdatedRuns.has(executes.source)));

  return within(repo, root, 'requirement').map((requirement) => {
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
  const satisfiesLinks = states.filter((s) => s.link.type === 'satisfies');
  return within(repo, root).flatMap((i) => {
    const items = subtree(repo, i.id).slice(1),
      below = new Set([...items, ...items.flatMap((id) => entry(repo, id).requirements)]);
    return !below.size ? [] : i.requirements.map((id) => {
      const allocated = satisfiesLinks.some((s) => s.link.target === id && below.has(s.source)),
        retained = entry(repo, id).item.data.retained;
      return { requirement: id, title: named(repo, id).title, tests: [], state: allocated ? 'allocated' : retained ? 'retained' : 'unallocated' } as Coverage;
    });
  });
}

// TE-06.5
export function unreached(repo: Repo, states: LinkState[], type: string, root?: string): Named[] {
  const to = allowedLinks(repo)[type]?.[1];
  if (!to) throw new UsageError(type);
  const reached = new Set(states.filter((s) => s.link.type === type).map((s) => targetId(s.link.target)));
  return within(repo, root).filter((e) => !reached.has(e.id) && allows(repo, to, String(e.item.data.type)))
    .map((e) => named(repo, e.id));
}

// CL-01.8, VS-03.5
export function requirementsMarkdown(repo: Repo, id: string, link: (found: Entry) => string, states: LinkState[], rows: Coverage[], suspects: LinkState[]): string {
  const ref = (id: string) => { const found = repo.entries.get(id); return found ? `[${id}](${link(found)}) ${found.item.data.title}` : id; };
  const status = (found: Entry) => (found.meta.data.status ? ` *${found.meta.data.status}*` : '');
  const linkLine = (state: LinkState) => `- ${state.state} ${ref(state.source)} ${state.link.type} ${ref(state.link.target)}\n`;
  const summary = rows.map((row) => `- ${row.state} ${ref(row.requirement)}\n`).join('') + suspects.map(linkLine).join('');
  const seen = new Set<string>();
  const section = (itemId: string, number: string): string => {
    seen.add(itemId);
    const found = entry(repo, itemId);
    let n = 0;
    return `\n${'#'.repeat(Math.min(number.split('.').length + 1, 6))} ${number} ${ref(itemId)}${status(found)}\n\n` + rows.filter((row) => found.requirements.includes(row.requirement)).map((row) => {
      const child = row.requirement, requirement = entry(repo, child);
      return `**${requirement.item.data.title}** [${child}](${link(requirement)})${status(requirement)} ${row.state}\n\n${requirement.item.data.text ?? ''}\n\n`
        + states.filter((state) => state.source === child || state.link.target === child).map(linkLine).join('')
        + row.tests.map((test) => `- ${ref(test.testCase.id)}: ${test.run ? `${ref(test.run.id)} ${test.result}${test.outdated ? ' outdated' : ''}` : 'no run'}\n`).join('') + '\n';
    }).join('') + childrenOf(found).map((child) => seen.has(child) || !repo.entries.has(child) ? '' : section(child, `${number}.${++n}`)).join('');
  };
  return summary + section(id, '1');
}

// TE-06.6
export function connections(repo: Repo, states: LinkState[], root?: string) {
  return [...unreached(repo, states, 'connects', root).map((item) => ({ code: 'open', item, detail: '' })),
    ...within(repo, root, 'connection').flatMap((c) => {
      const roles = linksOf(c).filter((l) => l.type === 'connects').map((l) => entry(repo, targetId(l.target)).item.data.role),
        senders = roles.filter((r) => r === 'sender').length,
        [code, n] = roles.length < 2 ? ['few', roles.length] : roles.some(Boolean) && senders !== 1 ? ['senders', senders] : [];
      return code ? [{ code, item: named(repo, c.id), detail: String(n) }] : [];
    })];
}
