// CO-03
import MiniSearch from 'minisearch';
import { entry, list as values, named, parameterOf, subtree, UsageError, writeYaml, type Parameter, type Repo } from './repo.ts';

// CO-03.1
function searchIndex(repo: Repo) {
  const index = new MiniSearch({ fields: ['id', 'title', 'text', 'attributes'], storeFields: ['type', 'status', 'owner'] });
  index.addAll([...repo.entries.values()].map(({ id, item, meta }) => {
    const { title, text, ...attributes } = item.data;
    return { id, title, text, attributes: JSON.stringify(attributes), type: item.data.type, status: meta.data.status, owner: meta.data.owner };
  }));
  return index;
}

// CO-03.2
export function search(repo: Repo, query: string) {
  const pattern = /\b(type|status|owner):(\S+)/g, filters = [...query.matchAll(pattern)], text = query.replace(pattern, '').trim(),
    filter = (result: Record<string, unknown>) => filters.every(([, field, value]) => result[field] === value);
  return searchIndex(repo).search(text || MiniSearch.wildcard, { prefix: true, combineWith: 'AND', filter }).map((result) => named(repo, result.id));
}

// CO-03.3
export function list(repo: Repo, field: string, item: string | undefined, filters: string[][]) {
  const scope = item && new Set(subtree(repo, entry(repo, item).id)),
    matches = (v: unknown, want: string) => (want ? String(v) === want : v == null || v === '');
  return [...repo.entries.values()].filter((source) => !scope || scope.has(source.id))
    .flatMap((source) => values<Record<string, unknown>>(source.item.data[field])
      .filter((data) => filters.every(([k, v]) => matches(data[k], v)))
      .map((data) => ({ source: source.id, ...data })));
}

// CL-01.3
export function setParameter(repo: Repo, id: string, ref: string, field: string, value: string) {
  if (field !== 'value' && field !== 'state') throw new UsageError(field);
  const found = entry(repo, id), name = ref.slice(id.length + 1),
    params = values<Record<string, unknown>>(found.item.data.parameters),
    at = params.findIndex((p) => p.name === name), index = at < 0 ? params.length : at;
  if (at < 0) found.item.doc.setIn(['parameters', index, 'name'], name);
  if (field === 'value' && !value) found.item.doc.deleteIn(['parameters', index, 'value']);
  else found.item.doc.setIn(['parameters', index, field], field === 'value' ? Number(value) : value);
  writeYaml(repo.root, found.item);
}

// CL-01.4
const parameterKeys: (keyof Parameter)[] = ['name', 'value', 'unit', 'state'];
export function getParameter(repo: Repo, ref: string, key = 'value') {
  const found = parameterOf(repo, ref);
  if (!found || !parameterKeys.includes(key as keyof Parameter)) throw new UsageError(ref);
  return found.parameter[key as keyof Parameter];
}
