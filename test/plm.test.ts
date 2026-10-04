import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, expect, test } from 'vitest';
import { addLink, changeSince, confirm, linkStates, recordRun } from '../src/links.ts';
import { linksOf, loadRepo, Refused } from '../src/repo.ts';
import { search } from '../src/search.ts';
import { validate } from '../src/validate.ts';
import { currentVersions, git, versionAt } from '../src/version.ts';

const base = mkdtempSync(join(tmpdir(), 'plm-test-'));
afterAll(() => rmSync(base, { recursive: true, force: true }));
const write = (root: string, files: Record<string, string>) => {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
};
const commit = (root: string) => {
  git(root, ['add', '-A']);
  git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'change']);
};
// Wing A with nested spar P satisfying the wing's requirement R; the wing uses bolt L.
const fixture = () => {
  const root = mkdtempSync(join(base, 'repo-'));
  write(root, {
    'plm.yaml': 'prefixes:\n  part: PRT-\n  test-run: RUN-\n',
    'wing/item.yaml': 'id: A\ntype: assembly\ntitle: Wing\nuses: [L]\n',
    'wing/spar/item.yaml': 'id: P\ntype: part\ntitle: Spar\nlinks:\n  - type: satisfies\n    target: R\n',
    'wing/requirements/load.yaml': 'id: R\ntype: requirement\ntitle: Load\ntext: Carry 3g.\n',
    'bolt/item.yaml': 'id: L\ntype: part\ntitle: Bolt\n',
    'meta/P.yaml': '# reviewed by stress\nstatus: draft\n',
  });
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'Tess']);
  commit(root);
  return root;
};
const plm = (root: string, ...args: string[]) => spawnSync(process.execPath, ['src/cli.ts', '-C', root, ...args], { encoding: 'utf8' });
const json = (root: string, ...args: string[]) => JSON.parse(plm(root, '--format', 'json', ...args).stdout).data;

test('TE-01.1: nested and used item changes propagate to ancestors only', () => {
  const root = fixture();
  const before = currentVersions(loadRepo(root));
  write(root, { 'wing/spar/item.yaml': 'id: P\ntype: part\ntitle: Main spar\n' });
  const after = currentVersions(loadRepo(root));
  expect(after.get('P')).not.toBe(before.get('P'));
  expect(after.get('A')).not.toBe(before.get('A'));
  expect(after.get('R')).toBe(before.get('R'));
  write(root, { 'bolt/item.yaml': 'id: L\ntype: part\ntitle: Hi-Lok\n' });
  expect(currentVersions(loadRepo(root)).get('A')).not.toBe(after.get('A'));
});

test('TE-01.2: uncommitted and committed states yield identical versions', () => {
  const root = fixture();
  write(root, { 'wing/spar/drawing.txt': 'rev 2' });
  const working = currentVersions(loadRepo(root));
  commit(root);
  expect(versionAt(root, 'HEAD', 'A')).toBe(working.get('A'));
});

test('CO-01.2, CO-02.1, CO-02.2, CO-02.4–CO-02.7: findings with codes and positions', () => {
  const root = fixture();
  write(root, {
    'wing/spar/item.yaml': 'id: P\ntype: part\ntitle: Spar\ncolour: red\nuses: [A]\nlinks:\n  - type: verifies\n    target: R\n',
    'copy/item.yaml': 'id: L\ntype: part\ntitle: Bolt\n',
    'bolt/item.yaml': 'id: L\ntype: part\ntitle: Bolt\nexternal_ids: { reqif: B1 }\n',
    'wing/requirements/structure/stringer.yaml': 'id: Q\ntype: part\ntitle: Stringer\n',
  });
  const findings = validate(loadRepo(root));
  expect(findings.map((f) => f.code).sort()).toEqual(['cycle', 'id-clash', 'link-type', 'misplaced', 'schema', 'schema', 'stale-name']);
  expect(findings.find((f) => f.code === 'stale-name')).toMatchObject({ file: 'copy/item.yaml', severity: 'warning' });
  expect(findings.findLast((f) => f.code === 'schema')).toMatchObject({ file: 'wing/spar/item.yaml', line: 4, col: 9 });
});

test('TE-02.1, TE-02.2, TE-03.1, TE-03.2: confirm, then a target change makes the link suspect', () => {
  const root = fixture();
  let repo = loadRepo(root);
  expect(linkStates(repo, currentVersions(repo))[0].state).toBe('unconfirmed');
  confirm(repo, currentVersions(repo), [], 'P');
  expect(readFileSync(join(root, 'meta/P.yaml'), 'utf8')).toContain('# reviewed by stress'); // CO-01.1
  const link = () => linkStates(loadRepo(root), new Map())[0].link;
  expect(git(root, ['hash-object', 'wing/requirements/load.yaml'])).toBe(link().version);
  const head = git(root, ['rev-parse', '--short', 'HEAD']);
  expect(link()).toMatchObject({ title: 'Load', by: 'Tess', on: new Date().toISOString().slice(0, 10), commit: head });
  commit(root);

  write(root, { 'wing/requirements/load.yaml': 'id: R\ntype: requirement\ntitle: Load\ntext: Carry 4g.\n' });
  repo = loadRepo(root);
  const [state] = linkStates(repo, currentVersions(repo));
  expect(state.state).toBe('suspect');
  expect(changeSince(repo, state.link)).toMatchObject({ commit: head, diff: expect.stringContaining('+text: Carry 4g.') });
  confirm(repo, currentVersions(repo), [], 'P');
  expect(link()).not.toHaveProperty('commit');
  git(root, ['config', '--unset', 'user.name']);
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };
  expect(spawnSync(process.execPath, ['src/cli.ts', '-C', root, 'confirm', 'P'], { env }).status).toBe(1);

  write(root, { 'wing/requirements/load.yaml': 'id: R\ntype: requirement\n' });
  repo = loadRepo(root);
  expect(() => confirm(repo, currentVersions(repo), validate(repo), 'P')).toThrow(Refused);
});

test('CL-02.1, CL-02.2, CL-02.4, CL-02.5: init, new items nest in the working folder, rename', () => {
  const root = join(base, 'new');
  expect(plm(root, 'init').status).toBe(0);
  expect(plm(root, 'init').status).toBe(2);
  plm(root, 'new', 'assembly', 'My aircraft');
  const dir = join(root, 'my-aircraft');
  const part = plm(dir, 'new', 'part', 'Main spar').stdout.trim();
  expect(part).toMatch(/^PRT-[0-9A-HJKMNP-TV-Z]{6}$/);
  expect(existsSync(join(dir, 'main-spar/item.yaml'))).toBe(true);
  expect(plm(dir, 'new', 'part', 'Main spar').status).toBe(2);
  const req = plm(dir, 'new', 'requirement', 'Carry 3g').stdout.trim();
  mkdirSync(join(dir, 'requirements/loads'));
  plm(join(dir, 'requirements/loads'), 'new', 'requirement', 'Gust');
  expect(existsSync(join(dir, 'requirements/carry-3g.yaml')) && existsSync(join(dir, 'requirements/loads/gust.yaml'))).toBe(true);
  plm(dir, 'new', 'test-case', 'Load');
  expect(existsSync(join(dir, 'tests/load/item.yaml'))).toBe(true);
  expect(plm(root, 'new', 'test-case', 'Load').status).toBe(2);
  plm(root, 'rename', part, 'Rear spar');
  plm(root, 'rename', req, 'Carry 4g');
  expect(existsSync(join(dir, 'rear-spar/item.yaml')) && existsSync(join(dir, 'requirements/carry-4g.yaml'))).toBe(true);
  expect(validate(loadRepo(root))).toEqual([]);
});

test('CL-05.1–CL-05.3: JSON output, exit codes and titles next to IDs', () => {
  const root = fixture();
  expect(plm(root, 'validate').status).toBe(0);
  const suspects = plm(root, '--format', 'json', 'suspects');
  expect(suspects.status).toBe(1);
  expect(JSON.parse(suspects.stdout)).toMatchObject({ schema: 2, data: [{ state: 'unconfirmed', source: 'P', title: 'Spar', targetTitle: 'Load' }] });
  expect(plm(root, 'suspects').stdout).toBe('unconfirmed P (Spar) satisfies R (Load)\n');
  expect(plm(root, 'report', 'coverage').stdout).toBe('unverified R (Load)\n');
  write(root, { 'wing/requirements/load.yaml': 'id: R\ntype: requirement\ntitle: Load\ntext: Carry 4g.\n' });
  expect(plm(root, 'impact', 'HEAD').stdout).toBe('changed R (Load)\npropagated A (Wing)\n');
});

test('CO-01.1, CL-03.1–CL-03.3, TE-03.1, TE-06.1, TE-06.2: recorded runs verify requirements until the SUT changes', () => {
  const root = fixture();
  const coverage = () => json(root, 'report', 'coverage', 'A')[0].state;
  const record = (result: string) => plm(root, 'test', 'record', 'T', '--sut', 'A', '--result', result, '--log', join(root, 'rig.log'));
  expect(coverage()).toBe('unverified');
  const wing = currentVersions(loadRepo(root)).get('A');
  expect(json(root, 'report', 'coverage', 'P')).toEqual([]);
  write(root, {
    'wing/tests/load-test/item.yaml': 'id: T\ntype: test-case\ntitle: Load test\nlinks:\n  - type: verifies\n    target: R\n',
    'rig.log': 'ok',
  });
  expect(currentVersions(loadRepo(root)).get('A')).not.toBe(wing);
  expect(plm(root, 'confirm', 'T').status).toBe(0);
  expect(coverage()).toBe('pending');
  expect(() => recordRun(loadRepo(root), 'T', 'A', 'pass', [])).toThrow(Refused);
  commit(root);
  expect(record('maybe').status).toBe(2);
  const run = record('pass').stdout.trim();
  expect(existsSync(join(root, `runs/${run}/rig.log`))).toBe(true);
  expect(loadRepo(root).entries.get(run)?.meta.data.confirmed?.T.commit).toBe(git(root, ['rev-parse', '--short', 'HEAD']));
  expect(plm(root, 'confirm', run).status).toBe(1);
  expect(validate(loadRepo(root))).toEqual([]);
  expect(coverage()).toBe('verified');
  write(root, { 'wing/spar/item.yaml': 'id: P\ntype: part\ntitle: Main spar\n' });
  expect(json(root, 'report', 'coverage', 'A')[0]).toEqual({ requirement: 'R', title: 'Load', state: 'pending', outdated: [{ id: run, title: 'T on A' }] });
  expect(plm(root, 'confirm', 'P').status).toBe(0);
  expect(plm(root, 'suspects').status).toBe(0);
});

test('TE-05.1, TE-05.2: impact of a change on items, links and test runs', () => {
  const root = fixture();
  write(root, {
    'runs/X/item.yaml': 'id: X\ntype: test-run\ntitle: Run\nlinks:\n  - type: tests\n    target: A\n',
    'meta/P.yaml': 'confirmed:\n  R:\n    version: outdated\n',
  });
  write(root, { 'meta/X.yaml': `confirmed:\n  A:\n    version: ${currentVersions(loadRepo(root)).get('A')}\n` });
  commit(root);
  write(root, { 'wing/requirements/load.yaml': 'id: R\ntype: requirement\ntitle: Load\ntext: Carry 4g.\n' });
  const impact = (range: string) => json(root, 'impact', range);
  const expected = { changed: [{ id: 'R', title: 'Load' }], propagated: [{ id: 'A', title: 'Wing' }], suspects: [], runs: [{ id: 'X', title: 'Run' }] };
  expect(impact('HEAD')).toMatchObject(expected);
  commit(root);
  expect(impact('HEAD~1..HEAD')).toMatchObject(expected);
  expect(plm(root, 'impact', 'nonsense').status).toBe(2);
});

test('TE-01.1, TE-01.2: a nested repository counts by its commit, without warnings', () => {
  const root = fixture();
  const firmware = join(root, 'wing/spar/src');
  write(root, { 'wing/spar/src/main.c': 'int main() {}\n' });
  git(firmware, ['init', '-q']);
  commit(firmware);
  const before = currentVersions(loadRepo(root)).get('P');
  expect(plm(root, 'show', 'P').stderr).toBe('');
  write(root, { 'wing/spar/src/main.c': 'int main() { return 0; }\n' });
  commit(firmware);
  expect(currentVersions(loadRepo(root)).get('P')).not.toBe(before);
  commit(root);
  expect(json(root, 'impact', 'HEAD')).toMatchObject({ changed: [], propagated: [] });
});

test('CO-03.1, CO-03.2, CL-01.1: search all words by prefix with filters, then link to a result', () => {
  const root = fixture();
  write(root, { 'meta/A.yaml': 'owner: ana\nstatus: draft\n' });
  const repo = loadRepo(root);
  expect(search(repo, 'spa')).toEqual([{ id: 'P', title: 'Spar' }]);
  expect(search(repo, 'carry 3')).toEqual([{ id: 'R', title: 'Load' }]);
  expect(search(repo, 'carry spar')).toEqual([]);
  expect(search(repo, 'owner:ana status:draft')).toEqual([{ id: 'A', title: 'Wing' }]);
  expect(plm(root, 'search', 'bo').stdout).toBe('L (Bolt)\n');
  addLink(repo, 'L', 'satisfies', 'R');
  expect(linksOf(loadRepo(root).entries.get('L')!)).toEqual([{ type: 'satisfies', target: 'R' }]);
});
