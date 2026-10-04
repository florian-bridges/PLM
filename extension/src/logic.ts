// VS-01, VS-02, VS-03, VS-04: editor logic without the vscode API, so vitest can test it.
import type { Document } from 'yaml';
import type { LinkState } from '../../src/links.ts';
import { childrenOf, entry, linksOf, usesOf, type Entry, type Link, type Repo } from '../../src/repo.ts';
import type { Finding } from '../../src/validate.ts';

// VS-01.2
interface Property { type?: string; enum?: string[]; items?: { type?: string } }
export interface Field { name: string; kind: 'string' | 'text' | 'number' | 'enum' | 'list'; options?: string[]; meta?: boolean }

export function formFields(schema: { allOf: { properties?: Record<string, Property> }[] }): Field[] {
  const properties: Record<string, Property> = Object.assign({}, ...schema.allOf.map((part) => part.properties));
  const fields = Object.entries(properties).flatMap(([name, { type, enum: options, items }]): Field[] => {
    if (name === 'id' || name === 'type') return [];
    if (options) return [{ name, kind: 'enum', options }];
    if (type === 'number' || type === 'integer') return [{ name, kind: 'number' }];
    if (type === 'array' && items?.type === 'string') return [{ name, kind: 'list' }];
    if (type === 'string') return [{ name, kind: name === 'text' ? 'text' : 'string' }];
    return [];
  });
  return [...fields, { name: 'status', kind: 'string', meta: true }, { name: 'owner', kind: 'string', meta: true }];
}

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"]/g, (character) => `&#${character.charCodeAt(0)};`);

// VS-01.2
export function formHtml(heading: string, fields: Field[], values: Record<string, unknown>): string {
  const input = ({ name, kind, options = [] }: Field) => {
    const value = values[name];
    const text = escape(Array.isArray(value) ? value.join(', ') : value);
    if (kind === 'enum') return `<select name="${escape(name)}"><option></option>${options.map((option) => `<option${option === value ? ' selected' : ''}>${escape(option)}</option>`).join('')}</select>`;
    if (kind === 'text') return `<textarea name="${escape(name)}" rows="8" cols="80">${text}</textarea>`;
    return `<input name="${escape(name)}" value="${text}"${kind === 'number' ? ' type="number" step="any"' : ''}>`;
  };
  return `<h2>${escape(heading)}</h2><form>${fields.map((field) => `<p><label>${escape(field.name)}<br>${input(field)}</label></p>`).join('')}<button>Save</button></form><pre id="errors"></pre>
<script>
const vscode = acquireVsCodeApi(), form = document.forms[0];
const post = (save) => vscode.postMessage({ save, values: Object.fromEntries(new FormData(form)) });
form.oninput = () => post(false);
form.onsubmit = (event) => { event.preventDefault(); post(true); };
window.onmessage = (event) => { document.getElementById('errors').textContent = event.data; };
</script>`;
}

export const formData = (fields: Field[], raw: Record<string, string>) => Object.fromEntries(fields.map(({ name, kind }) => {
  const value = raw[name]?.trim();
  if (!value) return [name, undefined];
  if (kind === 'number') return [name, Number(value)];
  if (kind === 'list') return [name, value.split(',').map((part) => part.trim()).filter(Boolean)];
  return [name, value];
}));

// VS-01.2: empty fields are removed.
export function applyForm(item: Document, meta: Document, fields: Field[], data: Record<string, unknown>): void {
  for (const { name, meta: inMeta } of fields) {
    const doc = inMeta ? meta : item;
    if (data[name] === undefined) doc.deleteIn([name]);
    else doc.setIn([name], data[name]);
  }
}

// VS-02.1
export function productTree(repo: Repo, parent?: string): Entry[] {
  const ids = parent ? childrenOf(repo.entries.get(parent)) : [...repo.entries.values()].filter((found) => !found.path.includes('/')).map((found) => found.id);
  return ids.flatMap((id) => repo.entries.get(id) ?? []);
}

// VS-03.1
export function requirementsMarkdown(repo: Repo, id: string, link: (found: Entry) => string, number = '1'): string {
  const found = entry(repo, id);
  const { title, text } = found.item.data;
  const status = found.meta.data.status ? ` *${found.meta.data.status}*` : '';
  const section = `${'#'.repeat(Math.min(number.split('.').length, 6))} ${number} [${id}](${link(found)}) ${title}${status}\n\n${text ?? ''}\n\n`;
  return section + [...found.requirements, ...found.nested].map((child, index) => requirementsMarkdown(repo, child, link, `${number}.${index + 1}`)).join('');
}

// VS-01.6
export const completesId = (before: string) => /(target:|uses:|^\s*-)\s*[\w-]*$/.test(before);

// VS-04.3
export function hoverMarkdown(repo: Repo, states: LinkState[], id: string, source?: string) {
  const { item, meta } = entry(repo, id);
  const link = states.find((state) => state.source === source && state.link.target === id);
  const review = link ? `\n\n${link.state} [Review link](command:plm.reviewLink?${encodeURIComponent(JSON.stringify([source, id]))})` : '';
  return `**${item.data.title}**\n\n${item.data.type}, ${meta.data.status ?? ''}${review}`;
}

// VS-04.3
export const references = (repo: Repo, id: string) => [...repo.entries.values()].filter((found) => [...linksOf(found).map((link) => link.target), ...usesOf(found)].includes(id));

// VS-04.2
export function reviewHtml(repo: Repo, source: string, link: Link, change: string, findings: Finding[]) {
  const target = entry(repo, link.target);
  return `<pre>${[`${source} ${link.type} ${link.target}`, entry(repo, source).item.data.text, target.item.data.text, change, link.by && `Confirmed by ${link.by} on ${link.on}`,
    ...findings.filter((finding) => finding.file === target.item.path).map((finding) => finding.message)].map(escape).join('</pre><pre>')}</pre>
<button onclick="vscode.postMessage(1)">Confirm</button><button onclick="vscode.postMessage(0)">Cancel</button><script>const vscode = acquireVsCodeApi()</script>`;
}
