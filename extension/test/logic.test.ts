import { expect, test } from 'vitest';
import { parseDocument } from 'yaml';
import type { LinkState } from '../../src/links.ts';
import type { Repo } from '../../src/repo.ts';
import { baseSchema } from '../../src/schemas.ts';
import { applyForm, formData, formFields, formHtml, completesId, hoverMarkdown, productTree, references, requirementsMarkdown, reviewHtml } from '../src/logic.ts';

const fakeRepo = (...entries: { id: string; [field: string]: unknown }[]) => ({ entries: new Map(entries.map((found) => [found.id, {
  path: found.id, nested: [], requirements: [], item: { data: { title: found.id.toLowerCase(), text: `${found.id} text` } }, meta: { data: { status: 'draft' } }, ...found,
}])) }) as unknown as Repo;

test('VS-02.1: composition from the top-level items, nested before used items', () => {
  const repo = fakeRepo({ id: 'A', nested: ['P'], item: { data: { uses: ['L', 'X'] } } }, { id: 'P', path: 'A/P' }, { id: 'L' }, { id: 'U', path: 'runs/U' });
  expect(productTree(repo).map((found) => found.id)).toEqual(['A', 'L']);
  expect(productTree(repo, 'A').map((found) => found.id)).toEqual(['P', 'L']);
});

test('VS-03.1: requirements of the item, then its nested items, as numbered sections', () => {
  const repo = fakeRepo({ id: 'A', requirements: ['R'], nested: ['P'] }, { id: 'R' }, { id: 'P', requirements: ['Q'] }, { id: 'Q' });
  expect(requirementsMarkdown(repo, 'A', (found) => `#${found.id}`)).toBe('# 1 [A](#A) a *draft*\n\nA text\n\n## 1.1 [R](#R) r *draft*\n\nR text\n\n'
    + '## 1.2 [P](#P) p *draft*\n\nP text\n\n### 1.2.1 [Q](#Q) q *draft*\n\nQ text\n\n');
});

test('VS-01.2: flat form fields from the schema, written back keeping other attributes and comments', () => {
  const fields = formFields({ allOf: [baseSchema, { properties: { mass_kg: { type: 'number' }, grade: { enum: ['A', 'B'] }, spec: { type: 'object' } } }] });
  expect(fields.map((field) => `${field.name}:${field.kind}`)).toEqual(['title:string', 'text:text', 'uses:list', 'mass_kg:number', 'grade:enum', 'status:string', 'owner:string']);
  const html = formHtml('P', fields, { title: '<Spar>' });
  expect(html).toContain('value="&#60;Spar&#62;"');

  const item = parseDocument('# spar\ntitle: Old\ntext: x\nspec: { a: 1 }\n');
  const meta = parseDocument('');
  applyForm(item, meta, fields, formData(fields, { title: 'Spar', text: ' ', uses: 'L, M,', mass_kg: '1.5', status: 'released' }));
  expect(item.toJS()).toEqual({ title: 'Spar', spec: { a: 1 }, uses: ['L', 'M'], mass_kg: 1.5 });
  expect(String(item)).toContain('# spar');
  expect(meta.toJS()).toEqual({ status: 'released' });
});

test('VS-01.6: completion after target:, uses: and dashes', () => {
  expect(['  target: R', 'uses: ', '  - P', 'title: P'].map(completesId)).toEqual([true, true, true, false]);
});

test('VS-04.2, VS-04.3: review page, hover, references', () => {
  const repo = fakeRepo({ id: 'A', item: { data: { text: 'a', links: [{ target: 'R' }] } } }, { id: 'B', item: { data: { uses: ['R'] } } }, { id: 'R', item: { path: 'R', data: { title: 'r', type: 'requirement', text: '<R>' } } });
  expect(reviewHtml(repo, 'A', { type: 'satisfies', target: 'R', by: 'Ann', on: 'May' }, '+x', [{ file: 'R', message: 'bad' }, { file: 'A', message: 'other' }] as never))
    .toMatch(/A.satisfies.R.*<pre>a<.*&#60;R&#62;.*\+x.*Ann.on.May.*bad<\/pre>\s<button.*Confirm.*Cancel/);
  expect(hoverMarkdown(repo, [{ source: 'A', link: { target: 'R' }, state: 'suspect' } as LinkState], 'R', 'A'))
    .toBe('**r**\n\nrequirement, draft\n\nsuspect [Review link](command:plm.reviewLink?%5B%22A%22%2C%22R%22%5D)');
  expect(references(repo, 'R').map((found) => found.id)).toEqual(['A', 'B']);
});
