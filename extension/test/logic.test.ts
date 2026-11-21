import { expect, test } from 'vitest';
import { LineCounter, parseDocument } from 'yaml';
import type { Coverage, LinkState } from '../../src/links.ts';
import type { Entry, Repo } from '../../src/repo.ts';
import * as logic from '../src/logic.ts';

const fakeRepo = (...entries: { id: string; [field: string]: unknown }[]) => ({ entries: new Map(entries.map((found) => [found.id, {
  path: found.id, nested: [], requirements: [], item: { data: { title: found.id.toLowerCase(), text: `${found.id} text` } }, meta: { data: { status: 'draft' } }, ...found,
}])) }) as unknown as Repo;

test('VS-02.1, VS-02.3: composition from the top-level items, nested before used, with each uses quantity', () => {
  const repo = fakeRepo({ id: 'A', nested: ['P'], item: { data: { uses: [{ item: 'L', quantity: 3 }, 'X'] } } }, { id: 'P', path: 'A/P' }, { id: 'L' }, { id: 'U', path: 'runs/U' });
  expect(logic.productTree(repo).map((found) => found.id)).toEqual(['A', 'L']);
  const children = logic.productTree(repo, 'A');
  expect(children.map((found) => found.id)).toEqual(['P', 'L']);
  expect(logic.withQuantities(repo.entries.get('A'), children).map((found) => found.quantity)).toEqual([undefined, 3]);
});

test('VS-02.4, VS-02.6: a status bar label for the configuration; breadcrumbs to the active item', () => {
  expect(logic.configLabel('')).toBe('$(settings-gear) config');
  expect(logic.configLabel('p=1')).toBe('$(settings-gear) p=1');
  const repo = fakeRepo({ id: 'A', nested: ['P'] }, { id: 'P', nested: ['L'] }, { id: 'L' });
  expect(logic.breadcrumbChain(repo, 'L')).toEqual(['A', 'P', 'L']);
});

test('VS-03.1, VS-03.3, VS-03.4: coverage and suspects, then a section per subtree item once by depth with its requirements, links and runs', () => {
  const repo = fakeRepo({ id: 'A', requirements: ['R'], nested: ['P'], item: { data: { title: 'a', uses: ['L'] } } }, { id: 'R' }, { id: 'P', meta: { data: {} }, item: { data: { title: 'p', uses: ['L'] } } }, { id: 'L' }, { id: 'T' }, { id: 'U' });
  const suspect = { source: 'R', link: { type: 'derives', target: 'X' }, state: 'suspect' } as LinkState;
  const verifies = { source: 'T', link: { type: 'verifies', target: 'R' }, state: 'current' } as LinkState;
  const rows = [{ requirement: 'R', title: 'r', state: 'pending', tests: [{ testCase: { id: 'T', title: 't' }, run: { id: 'U', title: 'u' }, result: 'pass', outdated: true }] }] as Coverage[];
  const review = '[Review link](command:plm.reviewLink?%5B%22R%22%2C%22X%22%5D)';
  expect(logic.requirementsMarkdown(repo, 'A', (found) => `#${found.id}`, [suspect, verifies], rows, [suspect])).toBe(`- pending [R](#R) r\n- suspect ${review} [R](#R) r derives X\n`
    + `\n## 1 [A](#A) a *draft*\n\n**r** [R](#R) *draft* pending\n\nR text\n\n- suspect ${review} [R](#R) r derives X\n- current [T](#T) t verifies [R](#R) r\n- [T](#T) t: [U](#U) u pass outdated\n\n`
    + '\n### 1.1 [P](#P) p\n\n\n#### 1.1.1 [L](#L) l *draft*\n\n');
});

test('VS-01.2: the active item\'s own file maps to a schema id, not another file in its folder', () => {
  const repo = fakeRepo({ id: 'A', path: 'a', item: { path: 'a/item.yaml', data: { type: 'part' } } });
  expect(logic.schemaIdFor(repo, 'a/item.yaml')).toBe('A');
  expect(logic.schemaIdFor(repo, 'a/other.yaml')).toBeUndefined();
  const repoWithType = { types: { part: { fields: { mass_kg: { type: 'number' } } } }, entries: repo.entries } as unknown as Repo;
  expect(logic.schemaOf(repoWithType, 'A')).toContain('mass_kg');
});

test('VS-01.3, VS-01.5: diagnostics group by file; item types for "New item" exclude meta', () => {
  const findings = [{ file: 'A', message: 'm1' }, { file: 'B', message: 'm2' }] as never[];
  expect([...logic.diagnosticsOf(findings)].map(([file, found]) => [file, found.length])).toEqual([['A', 1], ['B', 1]]);
  expect(logic.itemTypes({ types: { part: {}, meta: {} } } as unknown as Repo)).toEqual(['part']);
});

test('VS-04.3: hover', () => {
  const repo = fakeRepo({ id: 'A', item: { data: { text: 'a', links: [{ target: 'R' }] } } }, { id: 'R', item: { path: 'R', data: { title: 'r', type: 'requirement', text: '<R>' } } });
  expect(logic.hoverMarkdown(repo, [{ source: 'A', link: { target: 'R' }, state: 'suspect' } as LinkState], 'R', 'A'))
    .toBe('**r**\n\nrequirement, draft\n\nsuspect [Review link](command:plm.reviewLink?%5B%22A%22%2C%22R%22%5D)');
});

test('VS-04.4, VS-04.6: a suspect link reports its YAML line, and flags its item for decoration', () => {
  const text = 'id: A\ntype: part\ntitle: t\nlinks:\n  - type: satisfies\n    target: R\n';
  const lines = new LineCounter(), doc = parseDocument(text, { lineCounter: lines });
  const found = { id: 'A', item: { doc, lines, data: doc.toJS() } } as unknown as Entry;
  const state = { source: 'A', link: { type: 'satisfies', target: 'R' }, state: 'suspect' } as LinkState;
  expect(logic.suspectLines(found, [state])).toEqual([{ line: 5, state }]);
  expect(logic.hasSuspect([state], 'A')).toBe(true);
  expect(logic.hasSuspect([state], 'B')).toBe(false);
});
