import { expect, test } from 'vitest';
import type { LinkState } from '../../src/links.ts';
import type { Repo } from '../../src/repo.ts';
import { changedPaths, linkRows, productTree } from '../src/logic.ts';

test('VS-02.1: composition from the top-level items, nested before used items', () => {
  const item = (id: string, path: string, nested: string[] = [], uses?: string[]) => [id, { id, path, nested, item: { data: { uses } } }] as const;
  const repo = { entries: new Map([item('A', 'A-wing', ['P'], ['L', 'X']), item('P', 'A-wing/P-spar'), item('L', 'L-bolt'), item('U', 'runs/U-run')]) } as unknown as Repo;
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
