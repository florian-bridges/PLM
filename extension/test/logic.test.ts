import { expect, test } from 'vitest';
import type { LinkState } from '../../src/links.ts';
import type { Repo } from '../../src/repo.ts';
import { activeItem, changedPaths, diagnosticsByFile, linkRows } from '../src/logic.ts';

test('VS-01.3: findings become zero-based diagnostics per file', () => {
  const finding = { file: 'A/item.yaml', line: 4, col: 9, severity: 'error', code: 'schema', message: 'bad' } as const;
  expect(diagnosticsByFile([finding, { ...finding, line: 1, severity: 'warning' }])).toEqual(new Map([['A/item.yaml', [
    { line: 3, col: 8, error: true, code: 'schema', message: 'bad' },
    { line: 0, col: 8, error: false, code: 'schema', message: 'bad' },
  ]]]));
});

test('VS-04.1: outgoing and incoming links of the innermost item containing the file', () => {
  const entries = new Map([['A', { id: 'A', path: 'A-wing' }], ['P', { id: 'P', path: 'A-wing/P-spar' }]]);
  const repo = { root: '/r', entries } as unknown as Repo;
  expect(activeItem(repo, '/r/A-wing/P-spar/drawing.txt')).toBe('P');
  expect(activeItem(repo, '/r/A-wing/notes.md')).toBe('A');
  expect(activeItem(repo, '/r/plm.yaml')).toBeUndefined();

  const link = (source: string, target: string, state: LinkState['state']): LinkState =>
    ({ source, title: source.toLowerCase(), link: { type: 'satisfies', target }, targetTitle: target.toLowerCase(), state });
  const rows = linkRows([link('P', 'R', 'suspect'), link('A', 'P', 'current'), link('A', 'R', 'unconfirmed')], 'P');
  expect(rows.map((row) => [row.label, row.state.state])).toEqual([['→ satisfies R (r)', 'suspect'], ['← A (a) satisfies', 'current']]);
});

test('VS-04.2: changed files from the diff headers', () => {
  const diff = 'diff --git a/A/x.yaml b/A/x.yaml\n--- a/A/x.yaml\n+++ b/A/x.yaml\n@@ -1 +1,2 @@\n+diff --git a/no b/no\ndiff --git a/B/y b/B/y\n';
  expect(changedPaths(diff)).toEqual(['A/x.yaml', 'B/y']);
});
