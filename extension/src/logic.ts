// VS-01–VS-04: editor logic without the vscode API, for tests.
import type { Document } from 'yaml';
import { requirementsMarkdown as render, type Coverage, type LinkState } from '../../src/links.ts';
import { childrenOf, entry, targetId, type Entry, type Link, type Repo } from '../../src/repo.ts';
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

// VS-01.2: empty fields are removed.
export function applyForm(item: Document, meta: Document, fields: Field[], raw: Record<string, string>): void {
  for (const { name, kind, meta: inMeta } of fields) {
    const doc = inMeta ? meta : item;
    const value = raw[name]?.trim();
    if (!value) doc.deleteIn([name]);
    else doc.setIn([name], kind === 'number' ? Number(value) : kind === 'list' ? value.split(',').map((part) => part.trim()).filter(Boolean) : value);
  }
}

// VS-02.1
export const productTree = (repo: Repo, parent?: string): Entry[] => parent
  ? childrenOf(repo.entries.get(parent)).flatMap((id) => repo.entries.get(id) ?? [])
  : [...repo.entries.values()].filter((found) => !found.path.includes('/'));

// VS-03.3, VS-04.3
export const linkState = (state: LinkState, review = state.state !== 'current') =>
  state.state + (review ? ` [Review link](command:plm.reviewLink?${encodeURIComponent(JSON.stringify([state.source, state.link.target]))})` : '');

// VS-03.1, VS-03.3, VS-03.4: shares rendering with `report document` (CL-01.8), adding Review links.
export const requirementsMarkdown = (repo: Repo, id: string, link: (found: Entry) => string, states: LinkState[], rows: Coverage[], suspects: LinkState[]) =>
  render(repo, id, link, states, rows, suspects, (state) => linkState(state).slice(state.state.length));

// VS-04.3
export function hoverMarkdown(repo: Repo, states: LinkState[], id: string, source?: string) {
  const { item, meta } = entry(repo, id);
  const link = states.find((state) => state.source === source && state.link.target === id);
  return `**${item.data.title}**\n\n${[item.data.type, meta.data.status].filter(Boolean).join(', ')}${link ? `\n\n${linkState(link, true)}` : ''}`;
}

// VS-04.2
export function reviewHtml(repo: Repo, source: string, link: Link, change: string, findings: Finding[]) {
  const target = entry(repo, targetId(link.target)); // TE-01.1
  return `<pre>${[`${source} ${link.type} ${link.target}`, entry(repo, source).item.data.text, target.item.data.text, change, link.by && `Confirmed by ${link.by} on ${link.on}`,
    ...findings.filter((finding) => finding.file === target.item.path).map((f) => `${f.code} ${f.message}`)].filter(Boolean).map(escape).join('</pre><pre>')}</pre>
<button onclick="vscode.postMessage(1)">Confirm</button><button onclick="vscode.postMessage(0)">Cancel</button><script>const vscode = acquireVsCodeApi()</script>`;
}
