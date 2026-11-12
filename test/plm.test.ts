import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeEach, expect, test } from 'vitest';
import { changeSince, confirm, link, linkStates, recordRun } from '../src/links.ts';
import { git, linksOf, loadRepo, Refused } from '../src/repo.ts';
import { search } from '../src/search.ts';
import { validate } from '../src/validate.ts';
import { currentVersions, versionAt } from '../src/version.ts';

const base = mkdtempSync(join(tmpdir(), 'plm-test-')),
  write = (root, files) => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  },
  commit = (root) => {
    git(root, ['add', '-A']);
    git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'change']);
  },
  bolt = 'id: L\ntype: part\ntitle: Bolt\n', wing = 'id: A\ntype: assembly\ntitle: Wing\n', spar = 'id: P\ntype: part\ntitle: Spar\n',
  setLoad = (root, extra = '', g = 4) => write(root, { 'wing/requirements/load.yaml': `id: R\ntype: requirement\ntitle: Load\ntext: Carry ${g}g.\n${extra}` }),
  plm = (root, ...args) => spawnSync(process.execPath, ['src/cli.ts', '-C', root, ...args], { encoding: 'utf8' }),
  json = (root, ...args) => JSON.parse(plm(root, '--format', 'json', ...args).stdout).data;
afterAll(() => rmSync(base, { recursive: true, force: true }));
let root;
beforeEach(() => {
  root = mkdtempSync(join(base, 'repo-'));
  write(root, {
    'plm.yaml': 'prefixes:\n  part: PRT-\n  test-run: RUN-\n',
    'wing/item.yaml': `${wing}uses: [L]\n`,
    'wing/spar/item.yaml': `${spar}links:\n  - type: satisfies\n    target: R\n`,
    'bolt/item.yaml': bolt,
    'meta/P.yaml': '# reviewed\nstatus: draft\n',
  });
  setLoad(root, '', 3);
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'Tess']);
  commit(root);
});

test('TE-01.1, TE-03.1: mv', () => {
  const before = currentVersions(loadRepo(root));
  write(root, { 'wing/spar/item.yaml': `${spar}links: [{type: satisfies, target: R}]\n` });
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
  const repo = loadRepo(root), now = currentVersions(repo);
  expect(now.get('P')).toBe(moved.get('P'));
  expect(now.get('A')).not.toBe(moved.get('A'));
  expect(now.get('L')).not.toBe(moved.get('L'));
  expect(linkStates(repo, now)[0].state).toBe('current');
  setLoad(root);
  git(root, ['mv', 'wing/requirements/load.yaml', 'wing/requirements/carry.yaml']);
  expect(plm(root, 'suspects').stdout).toBe('suspect P (Spar) satisfies R (Load)\n');
});

test('TE-01.2, CO-01.3: artifacts', () => {
  write(root, { 'wing/spar/drawing.txt': 'rev 2', 'wing/spar/cad/model.step': 'version https://git-lfs.github.com/spec/v1\n', 'wing/requirements/.gitkeep': '', '.gitignore': 'tmp', 'wing/spar/tmp': '' });
  expect(json(root, 'show', 'P')).toMatchObject({ path: 'wing/spar', artifacts: [{ path: 'wing/spar/cad/model.step', lfs: 'missing' }, { path: 'wing/spar/drawing.txt' }] });
  expect(json(root, 'show', 'A').artifacts).toEqual([]);
  const working = currentVersions(loadRepo(root));
  commit(root);
  expect(versionAt(root, 'HEAD', 'A')).toBe(working.get('A'));
  rmSync(join(root, 'wing/spar/drawing.txt'));
  expect(json(root, 'show', 'P').artifacts).toHaveLength(1);
});

test('CO-01.1–CO-01.2, CO-02.1–CO-02.2, CO-02.4, CO-02.6, TE-01.1: findings', () => {
  write(root, {
    'wing/spar/item.yaml': 'id: P\ntype: part\ncolour: red\nuses: [A]\nlinks:\n  - type: verifies\n    target: R\n    result: pass\n  - type: derives-from\n    target: A/x\n',
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
  expect(findings.map((f) => f.code).sort()).toEqual(['cycle', 'id-clash', 'link-type', 'misplaced', 'orphan', ...Array(5).fill('schema'), 'unknown-target']);
  expect(findings.findLast((f) => f.code === 'schema')).toMatchObject({ file: 'wing/spar/item.yaml', line: 3, col: 9 });
  expect(findings.filter((f) => f.severity === 'warning')).toHaveLength(1);
});

test('CL-01.1,CO-02.1,CO-02.8:remove',()=>{
  write(root,{'types/meta.yaml':'required: [owner]'});
  expect(validate(loadRepo(root)).some((f)=>f.file==='meta/P.yaml'&&f.code==='schema')).toBe(true);
  expect(plm(root,'link','P','satisfies','R','--remove').status).toBe(0);
  plm(root,'link','P','derives-from','L');
  expect(plm(root,'link','P','bogus','R')).toMatchObject({status:2,stderr:'part bogus requirement\n'});
  plm(root,'confirm','P');
  expect(plm(root,'link','P','derives-from','L','--remove').status).toBe(0);
  expect(linksOf(loadRepo(root).entries.get('P')!)).toEqual([]);
  expect(loadRepo(root).entries.get('P')!.meta.data.confirmed?.L).toBeUndefined();
});

test('CO-02.1, CO-02.8, CL-02.1: types', () => {
  write(root, {
    'plm.yaml': 'prefixes:\n  analysis: ANA-\n',
    'types/analysis.yaml': 'colour: red\ntemplate:\n  method: review\nfields:\n  method: {enum: [review]}\nrequired: [tool]\n',
    'types/part.yaml': 'fields:\n  finish: {type: string}\n',
    'types/meta.yaml': 'fields:\n  owner: {type: string}\n',
    'bolt/item.yaml': `${bolt}finish: zinc\n`,
    'bracket/item.yaml': 'id: B\ntype: bracket\ntitle: Bracket\n',
    'wing/item.yaml': 'id: A\ntype: meta\ntitle: Wing\n',
  });
  const { path } = json(root, 'new', 'analysis', 'Loads');
  expect(readFileSync(join(root, path), 'utf8')).toContain('method: review\nid: ANA-');
  expect(validate(loadRepo(root)).map((f) => `${f.file} ${f.code} ${f.severity}`).sort()).toEqual([
    'bracket/item.yaml unknown-type error', `${path} schema warning`, 'types/analysis.yaml type-file error', 'wing/item.yaml unknown-type error',
  ]);
});

test('TE-02.1–TE-02.2, TE-03.1–TE-03.2: suspects', () => {
  let repo = loadRepo(root);
  confirm(repo, currentVersions(repo), [], 'P');
  const got = () => linkStates(loadRepo(root), new Map())[0].link;
  expect(git(root, ['hash-object', 'wing/requirements/load.yaml'])).toBe(got().version);
  const head = git(root, ['rev-parse', '--short', 'HEAD']);
  expect(got()).toMatchObject({ title: 'Load', by: 'Tess', on: new Date().toISOString().slice(0, 10), commit: head });
  commit(root);
  setLoad(root);
  repo = loadRepo(root);
  const [state] = linkStates(repo, currentVersions(repo));
  expect(state.state).toBe('suspect');
  expect(changeSince(repo, state.link)).toMatchObject({ commit: head, diff: expect.stringContaining('+text: Carry 4g.') });
  confirm(repo, currentVersions(repo), [], 'P');
  expect(got()).not.toHaveProperty('commit');
  commit(root);
  setLoad(root, 'rationale: why.\n');
  expect(linkStates(loadRepo(root), currentVersions(repo))[0].state).toBe('current');
  write(root, { 'meta/P.yaml': 'confirmed:\n  R:\n    version: bad\n' });
  expect(linkStates(loadRepo(root), currentVersions(repo))[0].state).toBe('suspect');
  link(loadRepo(root), 'P', 'derives-from', 'A');
  confirm(loadRepo(root), currentVersions(loadRepo(root)), [], 'P', 'A');
  commit(root);
  write(root, { 'wing/item.yaml': `${wing}uses: [L]\nrationale: why.\nlinks: [{type: derives-from, target: L}]\n` });
  const toA = () => linkStates(loadRepo(root), currentVersions(loadRepo(root))).at(-1)!;
  expect(toA().state).toBe('current');
  setLoad(root);
  expect(toA().state).toBe('suspect');
  git(root, ['config', 'user.name', '']);
  expect(plm(root, 'confirm', 'P').status).toBe(1);
  write(root, { 'wing/requirements/load.yaml': 'id: R\ntype: requirement\n' });
  repo = loadRepo(root);
  expect(() => confirm(repo, currentVersions(repo), validate(repo), 'P')).toThrow(Refused);
});

test('TE-01.1, TE-03.1, CO-02.7, CO-03.3, CL-01.1, CL-01.3–CL-01.4: parameter', () => {
  write(root, {
    'wing/item.yaml': `${wing}mass_kg: 1\nparameters: [{name: span, value: 3, unit: m}]\n`,
    'wing/spar/item.yaml': `${spar}links:\n  - type: derives-from\n    target: A:span\n`,
    'meta/A.yaml': '# reviewed\nstatus: draft\n',
  });
  setLoad(root, 'findings: [{item: A, state: open, severity: major}]\n', 3);
  confirm(loadRepo(root), currentVersions(loadRepo(root)), [], 'P');
  expect(plm(root, 'list', 'findings', 'severity:major').stdout).toBe('R (Load) item:A state:open severity:major\n');
  expect(plm(root, 'list', 'findings', 'severity:minor').stdout).toBe('\n');
  expect(json(root, 'list', 'parameters')).toEqual([{ source: 'A', name: 'span', value: 3, unit: 'm' }]);
  expect(plm(root, 'list', 'parameters', 'A').stdout).toBe('A (Wing) name:span value:3 unit:m\n');
  expect(plm(root, 'list', 'parameters', 'R').stdout).toBe('\n');

  plm(root, 'set', 'A', 'owner', 'ana');
  expect(readFileSync(join(root, 'meta/A.yaml'), 'utf8')).toBe('# reviewed\nstatus: draft\nowner: ana\n');
  expect(plm(root, 'set', 'A', 'mass_kg', '2').status).toBe(2);
  expect(plm(root, 'set', 'A', 'title', 'Spar').status).toBe(0);
  expect(plm(root, 'get', 'A:span').stdout).toBe('3\n');
  expect(plm(root, 'get', 'A:span', 'unit').stdout).toBe('m\n');
  const read = () => readFileSync(join(root, 'wing/item.yaml'), 'utf8');
  plm(root, 'set', 'A:span', 'value', '5');
  expect(read()).toContain('value: 5');
  plm(root, 'set', 'A:span', 'value', '');
  expect(read()).not.toContain('value:');
  expect(plm(root, 'get', 'A:span', 'state')).toMatchObject({ status: 1, stdout: '' });
  expect(plm(root, 'get', 'A:span', 'x').status).toBe(2);
  expect(plm(root, 'get', 'A:nope').status).toBe(2);
  plm(root, 'set', 'A:span', 'state', 'final');
  plm(root, 'set', 'A:chord', 'value', '2');
  expect(read()).toContain('state: final');
  expect(read()).toContain('name: chord');
  plm(root, 'set', 'A:span', 'unit', 'mm');
  expect(read()).toContain('unit: mm');

  write(root, { 'wing/item.yaml': `${wing}parameters: [{name: span, value: 4, unit: m}]\n` });
  expect(linkStates(loadRepo(root), currentVersions(loadRepo(root)))[0]).toMatchObject({ targetTitle: 'Wing', state: 'suspect' });

  write(root, {
    'plm.yaml': 'parameter_states: [draft]\n',
    'wing/item.yaml': `${wing}parameters: [{name: v, value: bad}, {name: s, state: wrong}]\n`,
    'bolt/item.yaml': bolt + 'parameters: [{name: v, value: 2}]\nlinks: [{type: derives-from, target: "A:v"}, {type: derives-from, target: "A:s"}]\n',
  });
  expect(validate(loadRepo(root)).map((f) => f.code)).toEqual(expect.arrayContaining(['schema', 'unknown-state', 'unknown-target', 'tbd-source', 'stale-value']));
});

test('CO-02.7, TE-01.1, CL-05.3: citation', () => {
  const span = (value) => write(root, { 'wing/item.yaml': `${wing}parameters: [{name: span, value: ${value}, unit: m}, {name: chord}]\n` });
  span(0);
  setLoad(root, '', '{A:span} {A:chord} ');
  plm(root, 'confirm', 'R');
  plm(root, 'confirm', 'P');
  commit(root);
  expect(versionAt(root, 'HEAD', 'R')).toBe(currentVersions(loadRepo(root)).get('R'));
  expect(plm(root, 'suspects').stdout + plm(root, 'show', 'R').stdout).toMatch(/^\nid: R\n.*\n.*\ntext: Carry 0 m TBD g\./);
  span(4);
  expect(plm(root, 'suspects').stdout).toBe('suspect R (Load) derives-from A:span (Wing)\nsuspect P (Spar) satisfies R (Load)\n');
  setLoad(root, '', '{A:nope} {nope} ');
  expect(validate(loadRepo(root))).toMatchObject([{ code: 'unknown-parameter', line: 4 }, { code: 'unknown-target', line: 4 }]);
});

test('CL-02.1–CL-02.2, CL-05.2, CO-01.1, CO-02.2: nest', () => {
  root = join(base, 'new');
  write(root, { 'plm.yaml': 'prefixes: {assembly: ASM-, part: PRT-, requirement: REQ-, test-case: TC-}\n' });
  git(root, ['init', '-q']);
  expect(plm(root, 'suspects')).toMatchObject({ status: 0, stderr: '' });
  plm(root, 'new', 'assembly', 'Aircraft');
  const dir = join(root, 'aircraft'), created = plm(dir, 'new', 'part', 'Spar'), part = created.stdout.trim();
  expect(part).toMatch(/^PRT-[0-9A-HJKMNP-TV-Z]{6}$/);
  expect(created.stderr).toBe('aircraft/spar/item.yaml\n');
  expect(json(dir, 'new', 'part', 'Strut').path).toBe('aircraft/strut/item.yaml');
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

test('CL-01.1, CL-05.1–CL-05.3, CO-02.2, CO-02.4, TE-03.1, TE-06.4: exit', () => {
  expect(plm(root, '--version').stdout).toBe(`${JSON.parse(readFileSync('package.json', 'utf8')).version}\n`);
  expect(plm(root, 'new', '--help').stdout).toContain('Types: part test-run\n');
  expect(plm(root, 'link', '--help').stdout).toContain('(* any type):\n* satisfies requirement\n');
  expect(plm(root, 'validate').status).toBe(0);
  write(root, { 'meta/L.yaml': 'status: draft\nstatus: draft\n' });
  expect(plm(root, 'validate')).toMatchObject({ status: 1, stdout: 'meta/L.yaml:2:1 error yaml: DUPLICATE_KEY\n' });
  const suspects = plm(root, '--format', 'json', 'suspects');
  expect(suspects.status).toBe(1);
  expect(JSON.parse(suspects.stdout)).toMatchObject({ schema: 4, data: [{ state: 'unconfirmed', source: 'P', title: 'Spar', targetTitle: 'Load' }] });
  expect(plm(root, 'suspects', 'A').stdout).toBe('unconfirmed P (Spar) satisfies R (Load)\n');
  expect(plm(root, 'suspects', 'L').status).toBe(0);
  expect(plm(root, 'report', 'coverage').stdout).toBe('unverified R (Load)\n');
  setLoad(root);
  expect(plm(root, 'impact', 'HEAD').stdout).toBe('changed R (Load)\npropagated A (Wing)\n');

  write(root, { 'wing/requirements/gust.yaml': 'id: G\ntype: requirement\ntitle: Gust\n', 'wing/spar/requirements/low.yaml': 'id: Z\ntype: requirement\n' });
  const alloc = plm(root, 'report', 'coverage', '--allocation');
  expect(alloc.stdout).toContain('allocated R (Load)');
  expect(alloc.stdout).toContain('unallocated G (Gust)');
  expect(alloc.stdout).not.toContain('Z');
  expect(alloc.status).toBe(1);
  expect(plm(root, 'report', 'coverage', '--allocation', '--by', 'x').status).toBe(2);

  write(root, { '.git/index': 'x' });
  const broken = plm(root, 'suspects');
  expect([broken.status, broken.stderr.match(/fatal/g)?.length]).toEqual([3, 1]);
});

test('CO-01.1–CO-01.2, CO-02.2, CO-02.5, CL-03.1–CL-03.3, TE-03.1, TE-06.1–TE-06.3: SUT', () => {
  const coverage = () => json(root, 'report', 'coverage', 'A')[0],
    record = (...results) => plm(root, 'test', 'record', 'T', 'U', '--sut', 'L', 'A', '--result', ...results, '--log', join(root, 'rig.log'));
  expect(coverage().state).toBe('unverified');
  const wing = currentVersions(loadRepo(root)).get('A');
  expect(json(root, 'report', 'coverage', 'P')).toEqual([]);
  write(root, {
    'wing/tests/suite/load-test/item.yaml': 'id: T\ntype: test-case\ntitle: LoadT\nlinks:\n  - type: verifies\n    target: R\n',
    'wing/tests/drop-test/item.yaml': 'id: U\ntype: test-case\ntitle: DropT\nlinks:\n  - type: verifies\n    target: R\n',
    'rig.log': 'ok',
  });
  expect(currentVersions(loadRepo(root)).get('A')).not.toBe(wing);
  expect(plm(root, 'confirm', 'T').status + plm(root, 'confirm', 'U').status).toBe(0);
  expect(coverage().state).toBe('pending');
  expect(() => recordRun(loadRepo(root), ['T'], ['A'], ['pass'], [])).toThrow(Refused);
  commit(root);
  expect(record('pass', 'maybe').status + record('pass').status).toBe(4);
  const run = record('pass', 'fail').stdout.trim();
  expect(existsSync(join(root, `runs/${run}/rig.log`))).toBe(true);
  expect(linksOf(loadRepo(root).entries.get(run)!).filter((l) => l.type === 'tests')).toHaveLength(2);
  expect(loadRepo(root).entries.get(run)?.meta.data.confirmed?.T.commit).toBe(git(root, ['rev-parse', '--short', 'HEAD']));
  expect(plm(root, 'confirm', run).status).toBe(1);
  expect(validate(loadRepo(root))).toEqual([]);
  const tests = (outdated) => [['U', 'DropT', 'fail'], ['T', 'LoadT', 'pass']]
    .map(([id, title, result]) => ({ testCase: { id, title }, run: { id: run, title: 'T, U on L, A' }, result, outdated }));
  expect(coverage()).toMatchObject({ state: 'verified', tests: tests(false) });
  write(root, { 'wing/spar/item.yaml': spar + 'material: x\n' });
  expect(coverage()).toEqual({ requirement: 'R', title: 'Load', state: 'pending', tests: tests(true) });
  expect(plm(root, 'confirm', 'P').status).toBe(0);
  expect(plm(root, 'suspects').status).toBe(0);
  expect(json(root, 'report', 'coverage', '--by', 'type')[0]).toMatchObject({ total: 1 });
  renameSync(join(root, 'runs', run), join(root, 'r1'));
  expect(validate(loadRepo(root)).some((f) => f.code === 'misplaced')).toBe(true);
});

test('TE-05.1–TE-05.2: impact', () => {
  write(root, {
    'runs/X/item.yaml': 'id: X\ntype: test-run\ntitle: Run\nlinks:\n  - type: tests\n    target: A\n',
    'meta/P.yaml': 'confirmed:\n  R:\n    version: outdated\n',
  });
  write(root, { 'meta/X.yaml': `confirmed:\n  A:\n    version: ${currentVersions(loadRepo(root)).get('A')}\n` });
  commit(root);
  setLoad(root);
  const expected = { changed: [{ id: 'R', title: 'Load' }], propagated: [{ id: 'A', title: 'Wing' }], suspects: [], runs: [{ id: 'X', title: 'Run' }] };
  expect(json(root, 'impact', 'HEAD')).toMatchObject(expected);
  commit(root);
  expect(json(root, 'impact', 'HEAD~1..HEAD')).toMatchObject(expected);
  expect(plm(root, 'impact', 'nonsense').status).toBe(2);
});

test('TE-01.1–TE-01.2: commit', () => {
  const firmware = join(root, 'wing/spar/src');
  write(root, { 'wing/spar/src/main.c': 'int main() {}\n' });
  git(firmware, ['init', '-q']);
  expect(json(root, 'show', 'P').version).toBeTruthy();
  commit(firmware);
  git(root, ['add', 'wing/spar/src']);
  const before = currentVersions(loadRepo(root)).get('P');
  expect(plm(root, 'show', 'P').stderr).toBe('');
  write(root, { 'wing/spar/src/main.c': 'int main() { return 0; }\n' });
  commit(firmware);
  expect(currentVersions(loadRepo(root)).get('P')).not.toBe(before);
  commit(root);
  expect(json(root, 'impact', 'HEAD')).toMatchObject({ changed: [], propagated: [] });
});

test('CO-03.1–CO-03.2, CL-01.1, CL-05.3: search', () => {
  write(root, { 'meta/A.yaml': 'owner: ana\nstatus: draft\n' });
  const repo = loadRepo(root);
  expect(search(repo, 'spa')).toEqual([{ id: 'P', title: 'Spar' }]);
  expect(search(repo, 'carry 3')).toEqual([{ id: 'R', title: 'Load' }]);
  expect(search(repo, 'carry spar')).toEqual([]);
  expect(search(repo, 'owner:ana status:draft uses:L')).toEqual([{ id: 'A', title: 'Wing' }]);
  expect(search(repo, 'text:3G')).toEqual([{ id: 'R', title: 'Load' }]);
  expect(search(repo, 'type:par')).toEqual([]);
  expect(plm(root, 'search', 'L:bo').stdout).toBe('L (Bolt)\n');
  link(repo, 'L', 'satisfies', 'R');
  expect(json(root, 'search', 'bo')).toMatchObject([{ path: 'bolt', meta: {}, links: [{ target: 'R' }] }]);
});
