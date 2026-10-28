import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test } from 'vitest';
import { loadRepo } from '../src/repo.ts';
import { validate } from '../src/validate.ts';

const root = mkdtempSync(join(tmpdir(), 'plm-validate-')),
  write = (files: Record<string, string>) => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  };

test('CO-02.7: parameters', () => {
  write({
    'plm.yaml': 'parameter_states: [draft, final]\n',
    'A/item.yaml': 'id: A\ntype: assembly\ntitle: A\nparameters: [{name: v, value: bad}, {name: s, state: wrong}]\n',
    'B/item.yaml': 'id: B\ntype: assembly\ntitle: B\nparameters: [{name: v, value: 2}]\n'
      + 'links: [{type: derives-from, target: "A:v"}, {type: derives-from, target: "A:missing"}, {type: derives-from, target: "A:s"}]\n',
    'meta/A.yaml': 'status: draft\n', 'meta/B.yaml': 'status: draft\n',
  });
  const codes = validate(loadRepo(root)).map((f) => f.code);
  expect(codes).toEqual(expect.arrayContaining(['schema', 'unknown-state', 'unknown-target', 'tbd-source', 'stale-value']));
});
