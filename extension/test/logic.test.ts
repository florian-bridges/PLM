import { expect, test } from 'vitest';
import { parseDocument } from 'yaml';
import type { LinkState } from '../../src/links.ts';
import type { Repo } from '../../src/repo.ts';
import { baseSchema } from '../../src/schemas.ts';
import { applyForm, formData, formFields, formHtml, linkRows, productTree, requirementsMarkdown } from '../src/logic.ts';

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

test('VS-03.1: requirements of the item, then its nested items, as numbered sections', () => {
  const repo = fakeRepo({ id: 'A', requirements: ['R'], nested: ['P'] }, { id: 'R' }, { id: 'P', requirements: ['Q'] }, { id: 'Q' });
  expect(requirementsMarkdown(repo, 'A', (found) => `#${found.id}`)).toBe('# 1 [A](#A) a *draft*\n\nA text\n\n## 1.1 [R](#R) r *draft*\n\nR text\n\n'
    + '## 1.2 [P](#P) p *draft*\n\nP text\n\n### 1.2.1 [Q](#Q) q *draft*\n\nQ text\n\n');
});

test('VS-01.2: flat form fields from the schema, written back keeping other attributes and comments', () => {
  const fields = formFields({ allOf: [baseSchema, { properties: { mass_kg: { type: 'number' }, grade: { enum: ['A', 'B'] }, spec: { type: 'object' } } }] });
  expect(fields.map((field) => `${field.name}:${field.kind}`)).toEqual(['title:string', 'text:text', 'uses:list', 'mass_kg:number', 'grade:enum', 'status:string', 'owner:string']);
  const html = formHtml('P', fields, { title: '<Spar>', grade: 'B', uses: ['L', 'M'] });
  expect(html).toContain('value="&#60;Spar&#62;"');
  expect(html).toContain('<option selected>B</option>');
  expect(html).toContain('value="L, M"');

  const item = parseDocument('# spar\ntitle: Old\ntext: x\nspec: { a: 1 }\n');
  const meta = parseDocument('');
  applyForm(item, meta, fields, formData(fields, { title: 'Spar', text: ' ', uses: 'L, M,', mass_kg: '1.5', status: 'released' }));
  expect(item.toJS()).toEqual({ title: 'Spar', spec: { a: 1 }, uses: ['L', 'M'], mass_kg: 1.5 });
  expect(String(item)).toContain('# spar');
  expect(meta.toJS()).toEqual({ status: 'released' });
});
