import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test } from 'vitest';
import { changeSince, confirm, linkStates } from '../src/links.ts';
import { loadRepo, Refused } from '../src/repo.ts';
import { validate } from '../src/validate.ts';
import { currentVersions, git, versionAt } from '../src/version.ts';

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
  const root = mkdtempSync(join(tmpdir(), 'plm-test-'));
  write(root, {
    'plm.yaml': 'prefixes:\n  part: PRT-\n  test-run: RUN-\n',
    'A-wing/item.yaml': 'id: A\ntype: assembly\ntitle: Wing\nuses: [L]\n',
    'A-wing/P-spar/item.yaml': 'id: P\ntype: part\ntitle: Spar\n',
    'A-wing/requirements/R-load.yaml': 'id: R\ntype: requirement\ntitle: Load\ntext: Carry 3g.\n',
    'L-bolt/item.yaml': 'id: L\ntype: part\ntitle: Bolt\n',
    'meta/P.yaml': '# reviewed by stress\nlinks:\n  - type: satisfies\n    target: R\n',
  });
  git(root, ['init', '-q']);
  commit(root);
  return root;
};
const plm = (root: string, ...args: string[]) => spawnSync(process.execPath, ['src/cli.ts', '-C', root, ...args], { encoding: 'utf8' });

test('TE-01.1: nested and used item changes propagate to ancestors only', () => {
  const root = fixture();
  const before = currentVersions(loadRepo(root));
  write(root, { 'A-wing/P-spar/item.yaml': 'id: P\ntype: part\ntitle: Main spar\n' });
  const after = currentVersions(loadRepo(root));
  expect(after.get('P')).not.toBe(before.get('P'));
  expect(after.get('A')).not.toBe(before.get('A'));
  expect(after.get('R')).toBe(before.get('R'));
  write(root, { 'L-bolt/item.yaml': 'id: L\ntype: part\ntitle: Hi-Lok\n' });
  expect(currentVersions(loadRepo(root)).get('A')).not.toBe(after.get('A'));
});

test('TE-01.2: uncommitted and committed states yield identical versions', () => {
  const root = fixture();
  write(root, { 'A-wing/P-spar/drawing.txt': 'rev 2' });
  const working = currentVersions(loadRepo(root));
  commit(root);
  expect(versionAt(root, 'HEAD', 'A')).toBe(working.get('A'));
});

test('CO-02.1, CO-02.2, CO-02.4: findings with codes and positions', () => {
  const root = fixture();
  write(root, {
    'A-wing/P-spar/item.yaml': 'id: P\ntype: part\ntitle: Spar\ncolour: red\nuses: [A]\n',
    'X-rib/item.yaml': 'id: Y\ntype: part\ntitle: Rib\n',
    'A-wing/requirements/Q.yaml': 'id: Q\ntype: part\ntitle: Stringer\n',
    'meta/P.yaml': 'links:\n  - type: verifies\n    target: R\n',
  });
  const findings = validate(loadRepo(root));
  expect(findings.map((f) => f.code).sort()).toEqual(['cycle', 'id-mismatch', 'link-type', 'misplaced', 'schema']);
  expect(findings.find((f) => f.code === 'schema')).toMatchObject({ file: 'A-wing/P-spar/item.yaml', line: 4, col: 9 });
});

test('TE-02.1, TE-02.2, TE-03.1, TE-03.2: confirm, then a target change makes the link suspect', () => {
  const root = fixture();
  let repo = loadRepo(root);
  expect(linkStates(repo, currentVersions(repo))[0].state).toBe('unconfirmed');
  confirm(repo, currentVersions(repo), [], 'P');
  expect(readFileSync(join(root, 'meta/P.yaml'), 'utf8')).toContain('# reviewed by stress'); // CO-01.1
  expect(git(root, ['hash-object', 'A-wing/requirements/R-load.yaml'])).toBe(linkStates(loadRepo(root), new Map())[0].link.version);

  write(root, { 'A-wing/requirements/R-load.yaml': 'id: R\ntype: requirement\ntitle: Load\ntext: Carry 4g.\n' });
  repo = loadRepo(root);
  const [state] = linkStates(repo, currentVersions(repo));
  expect(state.state).toBe('suspect');
  expect(changeSince(repo, state.link).diff).toContain('+text: Carry 4g.');

  write(root, { 'A-wing/requirements/R-load.yaml': 'id: R\ntype: requirement\n' });
  repo = loadRepo(root);
  expect(() => confirm(repo, currentVersions(repo), validate(repo), 'P')).toThrow(Refused);
});

test('CL-02.1, CL-02.2, CL-02.4: init, then new items nest in the working folder', () => {
  const root = join(mkdtempSync(join(tmpdir(), 'plm-test-')), 'new');
  expect(plm(root, 'init').status).toBe(0);
  expect(plm(root, 'init').status).toBe(2);
  const dir = join(root, `${plm(root, 'new', 'assembly', 'My aircraft').stdout.trim()}-my-aircraft`);
  const part = plm(dir, 'new', 'part', 'Main spar').stdout.trim();
  expect(part).toMatch(/^PRT-[0-9A-HJKMNP-TV-Z]{6}$/);
  expect(existsSync(join(dir, `${part}-main-spar/item.yaml`))).toBe(true);
  const req = plm(dir, 'new', 'requirement', 'Carry 3g').stdout.trim();
  expect(existsSync(join(dir, `requirements/${req}-carry-3g.yaml`))).toBe(true);
  const tc = plm(dir, 'new', 'test-case', 'Load').stdout.trim();
  expect(existsSync(join(root, `tests/${tc}-load/item.yaml`))).toBe(true);
  expect(validate(loadRepo(root))).toEqual([]);
});

test('CL-05.1, CL-05.2: JSON output and exit codes', () => {
  const root = fixture();
  expect(plm(root, 'validate').status).toBe(0);
  const suspects = plm(root, '--format', 'json', 'suspects');
  expect(suspects.status).toBe(1);
  expect(JSON.parse(suspects.stdout)).toMatchObject({ schema: 1, data: [{ state: 'unconfirmed' }] });
  expect(plm(root, 'nonsense').status).toBe(2);
});

test('CL-03.1–CL-03.3, TE-06.1, TE-06.2: recorded runs verify requirements until the SUT changes', () => {
  const root = fixture();
  const coverage = () => JSON.parse(plm(root, '--format', 'json', 'report', 'coverage', 'A').stdout).data[0].state;
  const record = (result: string) => plm(root, 'test', 'record', 'T', '--sut', 'A', '--result', result, '--log', join(root, 'rig.log'));
  expect(coverage()).toBe('unverified');
  write(root, {
    'tests/T-load/item.yaml': 'id: T\ntype: test-case\ntitle: Load test\n',
    'meta/T.yaml': 'links:\n  - type: verifies\n    target: R\n',
    'rig.log': 'ok',
  });
  expect(plm(root, 'confirm', 'T').status).toBe(0);
  expect(coverage()).toBe('pending');
  expect(record('pass').status).toBe(1);
  commit(root);
  expect(record('maybe').status).toBe(2);
  const run = record('pass').stdout.trim();
  expect(existsSync(join(root, `runs/${run}/rig.log`))).toBe(true);
  expect(validate(loadRepo(root))).toEqual([]);
  expect(coverage()).toBe('verified');
  write(root, { 'A-wing/P-spar/item.yaml': 'id: P\ntype: part\ntitle: Main spar\n' });
  expect(coverage()).toBe('pending');
});
