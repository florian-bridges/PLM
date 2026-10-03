import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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
// Wing assembly A with spar P, satisfying requirement R.
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'plm-test-'));
  write(root, {
    'plm.yaml': 'prefixes:\n  part: PRT-\n',
    'items/A/item.yaml': 'id: A\ntype: assembly\ntitle: Wing\nchildren: [P]\n',
    'items/P/item.yaml': 'id: P\ntype: part\ntitle: Spar\n',
    'items/R/item.yaml': 'id: R\ntype: requirement\ntitle: Load\ntext: Carry 3g.\n',
    'meta/A.yaml': '# reviewed by stress\nlinks:\n  - type: satisfies\n    target: R\n',
  });
  git(root, ['init', '-q']);
  commit(root);
  return root;
};
const plm = (root: string, ...args: string[]) => spawnSync(process.execPath, ['src/cli.ts', '-C', root, ...args], { encoding: 'utf8' });

test('TE-01.1: a child change propagates to ancestors only', () => {
  const root = fixture();
  const before = currentVersions(loadRepo(root));
  write(root, { 'items/P/item.yaml': 'id: P\ntype: part\ntitle: Main spar\n' });
  const after = currentVersions(loadRepo(root));
  expect(after.get('P')).not.toBe(before.get('P'));
  expect(after.get('A')).not.toBe(before.get('A'));
  expect(after.get('R')).toBe(before.get('R'));
});

test('TE-01.2: uncommitted and committed states yield identical versions', () => {
  const root = fixture();
  write(root, { 'items/P/drawing.txt': 'rev 2' });
  const working = currentVersions(loadRepo(root));
  commit(root);
  expect(versionAt(root, 'HEAD', 'A')).toBe(working.get('A'));
});

test('CO-02.1, CO-02.2, CO-02.4: findings with codes and positions', () => {
  const root = fixture();
  write(root, {
    'items/P/item.yaml': 'id: P\ntype: part\ntitle: Spar\ncolour: red\nchildren: [A]\n',
    'items/X/item.yaml': 'id: Y\ntype: part\ntitle: Rib\n',
    'meta/P.yaml': 'links:\n  - type: verifies\n    target: R\n',
  });
  const findings = validate(loadRepo(root));
  expect(findings.map((f) => f.code).sort()).toEqual(['cycle', 'id-mismatch', 'link-type', 'schema']);
  expect(findings.find((f) => f.code === 'schema')).toMatchObject({ file: 'items/P/item.yaml', line: 4, col: 9 });
});

test('TE-02.1, TE-03.1, TE-03.2: confirm, then a target change makes the link suspect', () => {
  const root = fixture();
  let repo = loadRepo(root);
  expect(linkStates(repo, currentVersions(repo))[0].state).toBe('unconfirmed');
  confirm(repo, currentVersions(repo), [], 'A');
  expect(readFileSync(join(root, 'meta/A.yaml'), 'utf8')).toContain('# reviewed by stress'); // CO-01.1

  write(root, { 'items/R/item.yaml': 'id: R\ntype: requirement\ntitle: Load\ntext: Carry 4g.\n' });
  repo = loadRepo(root);
  const [state] = linkStates(repo, currentVersions(repo));
  expect(state.state).toBe('suspect');
  expect(changeSince(repo, state.link).diff).toContain('+text: Carry 4g.');
});

test('TE-02.2: confirmation is refused while the target is invalid', () => {
  const root = fixture();
  write(root, { 'items/R/item.yaml': 'id: R\ntype: requirement\n' });
  const repo = loadRepo(root);
  expect(() => confirm(repo, currentVersions(repo), validate(repo), 'A')).toThrow(Refused);
});

test('CL-02.1, CL-02.2, CL-02.4: init, then new items get a prefixed Crockford Base32 ID', () => {
  const root = join(mkdtempSync(join(tmpdir(), 'plm-test-')), 'new');
  expect(plm(root, 'init').status).toBe(0);
  expect(plm(root, 'init').status).toBe(2);
  const id = plm(root, 'new', 'part', '--title', 'Rib').stdout.trim();
  expect(id).toMatch(/^PRT-[0-9A-HJKMNP-TV-Z]{6}$/);
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
