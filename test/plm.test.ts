import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, expect, test } from 'vitest';
import { addLink, changeSince, confirm, linkStates, recordRun } from '../src/links.ts';
import { linksOf, loadRepo, Refused } from '../src/repo.ts';
import { search } from '../src/search.ts';
import { validate } from '../src/validate.ts';
import { currentVersions, git, versionAt } from '../src/version.ts';

const base = mkdtempSync(join(tmpdir(), 'plm-test-')),
  write = (root: string, files: Record<string, string>) => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  },
  commit = (root: string) => {
    git(root, ['add', '-A']);
    git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'change']);
  },
  bolt = 'id: L\ntype: part\ntitle: Bolt\n',
  fixture = () => {
    const root = mkdtempSync(join(base, 'repo-'));
    write(root, {
      'plm.yaml': 'prefixes:\n  part: PRT-\n  test-run: RUN-\n',
      'wing/item.yaml': 'id: A\ntype: assembly\ntitle: Wing\nuses: [L]\n',
      'wing/spar/item.yaml': 'id: P\ntype: part\ntitle: Spar\nlinks:\n  - type: satisfies\n    target: R\n',
      'wing/requirements/load.yaml': 'id: R\ntype: requirement\ntitle: Load\ntext: Carry 3g.\n',
      'bolt/item.yaml': bolt,
      'meta/P.yaml': '# reviewed\nstatus: draft\n',
    });
    git(root, ['init', '-q']);
    git(root, ['config', 'user.name', 'Tess']);
    commit(root);
    return root;
  },
  plm = (root: string, ...args: string[]) => spawnSync(process.execPath, ['src/cli.ts', '-C', root, ...args], { encoding: 'utf8' }),
  bump = (root: string, extra = '') => write(root, { 'wing/requirements/load.yaml': `id: R\ntype: requirement\ntitle: Load\ntext: Carry 4g.\n${extra}` }),
  json = (root: string, ...args: string[]) => JSON.parse(plm(root, '--format', 'json', ...args).stdout).data;
afterAll(() => rmSync(base, { recursive: true, force: true }));

test('TE-01.1: mv', () => {
  const root = fixture();
  const before = currentVersions(loadRepo(root));
  write(root, { 'wing/spar/item.yaml': 'id: P\ntype: part\ntitle: Spar\nlinks: [{type: satisfies, target: R}]\n' });
  const after = currentVersions(loadRepo(root));
  expect(after.get('P')).not.toBe(before.get('P'));
  expect(after.get('A')).not.toBe(before.get('A'));
  expect(after.get('R')).toBe(before.get('R'));
  write(root, { 'bolt/item.yaml': 'id: L\ntype: part\ntitle: Hi-Lok\n' });
  expect(currentVersions(loadRepo(root)).get('A')).not.toBe(after.get('A'));

  confirm(loadRepo(root), currentVersions(loadRepo(root)), [], 'P');
  commit(root);
  const moved = currentVersions(loadRepo(root));
  git(root, ['mv', 'wing/spar', 'bolt/spar']);
  const repo = loadRepo(root);
  expect(repo.entries.get('P')?.path).toBe('bolt/spar');
  const now = currentVersions(repo);
  expect(now.get('P')).toBe(moved.get('P'));
  expect(now.get('A')).not.toBe(moved.get('A'));
  expect(now.get('L')).not.toBe(moved.get('L'));
  expect(linkStates(repo, now)[0].state).toBe('current');
});

test('TE-01.2, CO-01.3: artifacts', () => {
  const root = fixture();
  write(root, { 'wing/spar/drawing.txt': 'rev 2', 'wing/spar/cad/model.step': 'version https://git-lfs.github.com/spec/v1\noid sha256:0\nsize 9\n' });
  expect(json(root, 'show', 'P')).toMatchObject({ path: 'wing/spar', artifacts: [{ path: 'wing/spar/cad/model.step', lfs: 'missing' }, { path: 'wing/spar/drawing.txt' }] });
  expect(json(root, 'show', 'A').artifacts).toEqual([]);
  const working = currentVersions(loadRepo(root));
  commit(root);
  expect(versionAt(root, 'HEAD', 'A')).toBe(working.get('A'));
});

test('CO-01.1–CO-01.2, CO-02.1–CO-02.2, CO-02.4, CO-02.6: findings', () => {
  const root = fixture();
  write(root, {
    'wing/spar/item.yaml': 'id: P\ntype: part\ncolour: red\nuses: [A]\nlinks:\n  - type: verifies\n    target: R\n    result: pass\n',
    'copy/item.yaml': bolt,
    'bolt/item.yaml': bolt + 'external_ids: { reqif: B1 }\n',
    'wing/requirements/structure/stringer.yaml': 'id: Q\ntype: part\ntitle: Stringer\n',
    'wing/misc/panel/item.yaml': 'id: Z\ntype: part\ntitle: Panel\n',
    'wing/.attic/item.yaml': 'id: H\ntype: part\ntitle: Hidden\n',
    'meta/M.yaml': 'status: draft\n',
  });
  const repo = loadRepo(root);
  expect(repo.entries.get('Z')?.path).toBe('wing/misc/panel');
  expect(repo.entries.has('H')).toBe(false);
  const findings = validate(repo);
  expect(findings.map((f) => f.code).sort()).toEqual(['cycle', 'id-clash', 'link-type', 'misplaced', 'orphan', 'schema', 'schema', 'schema', 'schema', 'schema']);
  expect(findings.findLast((f) => f.code === 'schema')).toMatchObject({ file: 'wing/spar/item.yaml', line: 3, col: 9 });
  expect(findings.filter((f) => f.severity === 'warning')).toHaveLength(1);
});

test('CL-01.1, CL-01.3, CO-02.1: set', () => {
  const root = fixture();
  write(root, { 'bolt/item.yaml': bolt + 'mass_kg: 1\n', 'schemas/meta.schema.json': '{"required":["owner"]}' });
  expect(validate(loadRepo(root)).some((f) => f.file === 'meta/P.yaml' && f.code === 'schema')).toBe(true);
  plm(root, 'set', 'P', 'owner', 'ana');
  expect(readFileSync(join(root, 'meta/P.yaml'), 'utf8')).toBe('# reviewed\nstatus: draft\nowner: ana\n');
  expect(plm(root, 'set', 'L', 'material', 'Al').status).toBe(0);
  expect(plm(root, 'set', 'P', 'links', 'x').status).toBe(2);
  expect(plm(root, 'set', 'A', 'uses', 'x').status).toBe(2);
  expect(plm(root, 'set', 'L', 'mass_kg', '2').status).toBe(2);
});

test('TE-02.1–TE-02.2, TE-03.1–TE-03.2: suspects', () => {
  const root = fixture();
  let repo = loadRepo(root);
  expect(linkStates(repo, currentVersions(repo))[0].state).toBe('unconfirmed');
  confirm(repo, currentVersions(repo), [], 'P');
  expect(readFileSync(join(root, 'meta/P.yaml'), 'utf8')).toContain('# reviewed');
  const link = () => linkStates(loadRepo(root), new Map())[0].link;
  expect(git(root, ['hash-object', 'wing/requirements/load.yaml'])).toBe(link().version);
  const head = git(root, ['rev-parse', '--short', 'HEAD']);
  expect(link()).toMatchObject({ title: 'Load', by: 'Tess', on: new Date().toISOString().slice(0, 10), commit: head });
  commit(root);

  bump(root);
  repo = loadRepo(root);
  const [state] = linkStates(repo, currentVersions(repo));
  expect(state.state).toBe('suspect');
  expect(changeSince(repo, state.link)).toMatchObject({ commit: head, diff: expect.stringContaining('+text: Carry 4g.') });
  confirm(repo, currentVersions(repo), [], 'P');
  expect(link()).not.toHaveProperty('commit');
  bump(root, 'rationale: why.\n');
  expect(linkStates(loadRepo(root), currentVersions(repo))[0].state).toBe('current');
  write(root, { 'meta/P.yaml': 'confirmed:\n  R:\n    version: bad\n' });
  expect(linkStates(loadRepo(root), currentVersions(repo))[0].state).toBe('suspect');
  git(root, ['config', 'user.name', '']);
  expect(plm(root, 'confirm', 'P').status).toBe(1);

  write(root, { 'wing/requirements/load.yaml': 'id: R\ntype: requirement\n' });
  repo = loadRepo(root);
  expect(() => confirm(repo, currentVersions(repo), validate(repo), 'P')).toThrow(Refused);
});

test('CO-02.6: derives-from', () => {
  const root = fixture();
  write(root, { 'wing/spar/item.yaml': 'id: P\ntype: part\ntitle: Spar\nlinks:\n  - type: derives-from\n    target: R\n' });
  confirm(loadRepo(root), currentVersions(loadRepo(root)), [], 'P');
  bump(root);
  expect(linkStates(loadRepo(root), currentVersions(loadRepo(root)))[0].state).toBe('suspect');
});

test('CL-02.1–CL-02.2, CO-01.1, CO-02.2: nest', () => {
  const root = join(base, 'new');
  write(root, { 'plm.yaml': 'prefixes: {assembly: ASM-, part: PRT-, requirement: REQ-, test-case: TC-}\n' });
  plm(root, 'new', 'assembly', 'Aircraft');
  const dir = join(root, 'aircraft');
  const part = plm(dir, 'new', 'part', 'Spar').stdout.trim();
  expect(part).toMatch(/^PRT-[0-9A-HJKMNP-TV-Z]{6}$/);
  expect(existsSync(join(dir, 'spar/item.yaml'))).toBe(true);
  expect(plm(dir, 'new', 'part', 'Spar').status).toBe(2);
  mkdirSync(join(dir, 'parts'));
  plm(join(dir, 'parts'), 'new', 'part', 'Rib');
  expect(existsSync(join(dir, 'parts/rib/item.yaml'))).toBe(true);
  plm(dir, 'new', 'requirement', 'Climb');
  mkdirSync(join(dir, 'requirements/loads'));
  plm(join(dir, 'requirements/loads'), 'new', 'requirement', 'Gust');
  expect(existsSync(join(dir, 'requirements/climb.yaml')) && existsSync(join(dir, 'requirements/loads/gust.yaml'))).toBe(true);
  plm(dir, 'new', 'test-case', 'Load');
  expect(existsSync(join(dir, 'tests/load/item.yaml'))).toBe(true);
  expect(plm(root, 'new', 'test-case', 'Load').status).toBe(2);
  expect(validate(loadRepo(root))).toEqual([]);

  writeFileSync(join(root, 'plm.yaml'), 'folders:\n  part: parts\n');
  expect(validate(loadRepo(root)).some((f) => f.code === 'misplaced')).toBe(true);
});

test('CL-01.1, CL-05.1–CL-05.3, TE-03.1, TE-06.4: exit', () => {
  const root = fixture();
  expect(plm(root, 'validate').status).toBe(0);
  const suspects = plm(root, '--format', 'json', 'suspects');
  expect(suspects.status).toBe(1);
  expect(JSON.parse(suspects.stdout)).toMatchObject({ schema: 4, data: [{ state: 'unconfirmed', source: 'P', title: 'Spar', targetTitle: 'Load' }] });
  expect(plm(root, 'suspects', 'A').stdout).toBe('unconfirmed P (Spar) satisfies R (Load)\n');
  expect(plm(root, 'suspects', 'L').status).toBe(0);
  expect(plm(root, 'report', 'coverage').stdout).toBe('unverified R (Load)\n');
  bump(root);
  expect(plm(root, 'impact', 'HEAD').stdout).toBe('changed R (Load)\npropagated A (Wing)\n');

  write(root, { 'wing/requirements/gust.yaml': 'id: G\ntype: requirement\ntitle: Gust\n', 'wing/spar/requirements/low.yaml': 'id: Z\ntype: requirement\n' });
  const alloc = plm(root, 'report', 'coverage', '--allocation');
  expect(alloc.stdout).toContain('allocated R (Load)');
  expect(alloc.stdout).toContain('unallocated G (Gust)');
  expect(alloc.stdout).not.toContain('Z');
  expect(alloc.status).toBe(1);
  expect(plm(root, 'report', 'coverage', '--allocation', '--by', 'x').status).toBe(2);
});

test('CO-01.1–CO-01.2, CO-02.2, CO-02.5, CL-03.1–CL-03.3, TE-03.1, TE-06.1–TE-06.3: SUT', () => {
  const root = fixture();
  const coverage = () => json(root, 'report', 'coverage', 'A')[0].state;
  const record = (...results: string[]) => plm(root, 'test', 'record', 'T', 'U', '--sut', 'A', '--result', ...results, '--log', join(root, 'rig.log'));
  expect(coverage()).toBe('unverified');
  const wing = currentVersions(loadRepo(root)).get('A');
  expect(json(root, 'report', 'coverage', 'P')).toEqual([]);
  write(root, {
    'wing/tests/suite/load-test/item.yaml': 'id: T\ntype: test-case\ntitle: LoadT\nlinks:\n  - type: verifies\n    target: R\n',
    'wing/tests/drop-test/item.yaml': 'id: U\ntype: test-case\ntitle: DropT\nlinks:\n  - type: verifies\n    target: R\n',
    'rig.log': 'ok',
  });
  expect(currentVersions(loadRepo(root)).get('A')).not.toBe(wing);
  expect(plm(root, 'confirm', 'T').status + plm(root, 'confirm', 'U').status).toBe(0);
  expect(coverage()).toBe('pending');
  expect(() => recordRun(loadRepo(root), ['T'], 'A', ['pass'], [])).toThrow(Refused);
  commit(root);
  expect(record('pass', 'maybe').status + record('pass').status).toBe(4);
  const run = record('pass', 'fail').stdout.trim();
  expect(existsSync(join(root, `runs/${run}/rig.log`))).toBe(true);
  expect(loadRepo(root).entries.get(run)?.meta.data.confirmed?.T.commit).toBe(git(root, ['rev-parse', '--short', 'HEAD']));
  expect(plm(root, 'confirm', run).status).toBe(1);
  expect(validate(loadRepo(root))).toEqual([]);
  const tests = (outdated: boolean) => [['U', 'DropT', 'fail'], ['T', 'LoadT', 'pass']]
    .map(([id, title, result]) => ({ testCase: { id, title }, run: { id: run, title: 'T, U on A' }, result, outdated }));
  expect(json(root, 'report', 'coverage', 'A')[0]).toMatchObject({ state: 'verified', tests: tests(false) });
  write(root, { 'wing/spar/item.yaml': 'id: P\ntype: part\ntitle: Spar\n' });
  expect(json(root, 'report', 'coverage', 'A')[0]).toEqual({ requirement: 'R', title: 'Load', state: 'pending', tests: tests(true) });
  expect(plm(root, 'confirm', 'P').status).toBe(0);
  expect(plm(root, 'suspects').status).toBe(0);
  expect(json(root, 'report', 'coverage', '--by', 'type')[0]).toMatchObject({ total: 1 });
  renameSync(join(root, 'runs', run), join(root, 'r1'));
  expect(validate(loadRepo(root)).some((f) => f.code === 'misplaced')).toBe(true);
}, 15000);

test('TE-05.1–TE-05.2: impact', () => {
  const root = fixture();
  write(root, {
    'runs/X/item.yaml': 'id: X\ntype: test-run\ntitle: Run\nlinks:\n  - type: tests\n    target: A\n',
    'meta/P.yaml': 'confirmed:\n  R:\n    version: outdated\n',
  });
  write(root, { 'meta/X.yaml': `confirmed:\n  A:\n    version: ${currentVersions(loadRepo(root)).get('A')}\n` });
  commit(root);
  bump(root);
  const impact = (range: string) => json(root, 'impact', range);
  const expected = { changed: [{ id: 'R', title: 'Load' }], propagated: [{ id: 'A', title: 'Wing' }], suspects: [], runs: [{ id: 'X', title: 'Run' }] };
  expect(impact('HEAD')).toMatchObject(expected);
  commit(root);
  expect(impact('HEAD~1..HEAD')).toMatchObject(expected);
  expect(plm(root, 'impact', 'nonsense').status).toBe(2);
});

test('TE-01.1–TE-01.2: commit', () => {
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

test('CO-03.1–CO-03.2, CL-01.1, CL-05.3: search', () => {
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
  expect(json(root, 'search', 'bo')).toMatchObject([{ path: 'bolt', meta: {}, links: [{ target: 'R' }] }]);
});
