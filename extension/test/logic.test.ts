import { expect, test } from 'vitest';
import type { LinkState } from '../../src/links.ts';
import type { Entry, Repo } from '../../src/repo.ts';
import { changedPaths, linkRows, productTree, requirementsMarkdown } from '../src/logic.ts';

const fakeRepo = (...entries: { id: string; [field: string]: unknown }[]) => ({ entries: new Map(entries.map((found) => [found.id, {
  path: found.id, nested: [], requirements: [], item: { data: { title: found.id.toLowerCase(), text: `${found.id} text` } }, meta: { data: { status: 'draft' } }, ...found,
}])) }) as unknown as Repo;

test('VS-02.1: composition from the top-level items, nested before used items', () => {
  const repo = fakeRepo({ id: 'A', nested: ['P'], item: { data: { uses: ['L', 'X'] } } }, { id: 'P', path: 'A/P' }, { id: 'L' }, { id: 'U', path: 'runs/U' });
  expect(productTree(repo).map((found) => found.id)).toEqual(['A', 'L']);
  expect(productTree(repo, 'A').map((found) => found.id)).toEqual(['P', 'L']);
});

test('VS-04.1: outgoing and incoming links of an item', () => {
  const link = (source: string, target: string, state: LinkState['state']): LinkState =>
    ({ source, title: source.toLowerCase(), link: { type: 'satisfies', target }, targetTitle: target.toLowerCase(), state });
  const rows = linkRows([link('P', 'R', 'suspect'), link('A', 'P', 'current'), link('A', 'R', 'unconfirmed')], 'P');
  expect(rows.map((row) => [row.label, row.state.state])).toEqual([['→ satisfies R (r)', 'suspect'], ['← A (a) satisfies', 'current']]);
});

test('VS-04.2: changed files from the diff headers', () => {
  const diff = 'diff --git a/A/x.yaml b/A/x.yaml\n--- a/A/x.yaml\n+++ b/A/x.yaml\n@@ -1 +1,2 @@\n+diff --git a/no b/no\ndiff --git a/B/y b/B/y\n';
  expect(changedPaths(diff)).toEqual(['A/x.yaml', 'B/y']);
});

test('VS-03.1: requirements of the item, then its nested items, as numbered sections', () => {
  const repo = fakeRepo({ id: 'A', requirements: ['R'], nested: ['P'] }, { id: 'R' }, { id: 'P', requirements: ['Q'] }, { id: 'Q' });
  expect(requirementsMarkdown(repo, 'A', (found) => `#${found.id}`)).toBe('# 1 [A](#A) a *draft*\n\nA text\n\n## 1.1 [R](#R) r *draft*\n\nR text\n\n'
    + '## 1.2 [P](#P) p *draft*\n\nP text\n\n### 1.2.1 [Q](#Q) q *draft*\n\nQ text\n\n');
});
