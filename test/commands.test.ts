import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeEach, expect, test } from 'vitest';

const base = mkdtempSync(join(tmpdir(), 'plm-cli-test-')),
  write = (root: string, files: Record<string, string>) => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  },
  fixture = () => {
    const root = mkdtempSync(join(base, 'repo-'));
    write(root, {
      'plm.yaml': '',
      'wing/item.yaml': 'id: A\ntype: assembly\ntitle: Wing\nmass_kg: 1\nparameters: [{name: span, value: 3, unit: m}]\n',
      'wing/requirements/load.yaml': 'id: R\ntype: requirement\ntitle: Load\ntext: Carry 3g.\nfindings: [{item: A, state: open, severity: major}]\n',
      'meta/A.yaml': '# reviewed\nstatus: draft\n',
    });
    return root;
  },
  plm = (root: string, ...args: string[]) => spawnSync(process.execPath, ['src/cli.ts', '-C', root, ...args], { encoding: 'utf8' });
afterAll(() => rmSync(base, { recursive: true, force: true }));
let root: string;
beforeEach(() => { root = fixture(); });

test('CL-01.3: set', () => {
  plm(root, 'set', 'A', 'owner', 'ana');
  expect(readFileSync(join(root, 'meta/A.yaml'), 'utf8')).toBe('# reviewed\nstatus: draft\nowner: ana\n');
  expect(plm(root, 'set', 'A', 'mass_kg', '2').status).toBe(2);
  expect(plm(root, 'set', 'A', 'title', 'Spar').status).toBe(0);

  const read = () => readFileSync(join(root, 'wing/item.yaml'), 'utf8');
  plm(root, 'set', 'A:span', 'value', '5');
  expect(read()).toContain('value: 5');
  plm(root, 'set', 'A:span', 'value', '');
  expect(read()).not.toContain('value:');
  plm(root, 'set', 'A:span', 'state', 'final');
  plm(root, 'set', 'A:chord', 'value', '2');
  expect(read()).toContain('state: final');
  expect(read()).toContain('name: chord');
  expect(plm(root, 'set', 'A:span', 'unit', 'm').status).toBe(2);
});

test('CL-01.4: get', () => {
  expect(plm(root, 'get', 'A:span').stdout).toBe('3\n');
  expect(plm(root, 'get', 'A:span', 'unit').stdout).toBe('m\n');
  plm(root, 'set', 'A:span', 'value', '');
  expect(plm(root, 'get', 'A:span').status).toBe(1);
  expect(plm(root, 'get', 'A:span', 'x').status).toBe(2);
  expect(plm(root, 'get', 'A:nope').status).toBe(2);
});

test('CO-03.3, CL-01.1: list', () => {
  const findings = plm(root, 'list', 'findings', 'severity:major');
  expect(findings.stdout).toBe('R (Load) item:A state:open severity:major\n');
  expect(plm(root, 'list', 'findings', 'severity:minor').stdout).toBe('\n');
  const parameters = JSON.parse(plm(root, '--format', 'json', 'list', 'parameters').stdout).data;
  expect(parameters).toEqual([{ source: 'A', name: 'span', value: 3, unit: 'm' }]);
  expect(plm(root, 'list', 'parameters', 'A').stdout).toBe('A (Wing) name:span value:3 unit:m\n');
  expect(plm(root, 'list', 'parameters', 'R').stdout).toBe('\n');
});
