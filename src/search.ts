// CO-03
import MiniSearch from 'minisearch';
import { entry, list as values, named, subtree, type Named, type Repo } from './repo.ts';

// CO-03.1
export function searchIndex(repo: Repo): MiniSearch {
  const index = new MiniSearch({ fields: ['id', 'title', 'text', 'attributes'], storeFields: ['type', 'status', 'owner'] });
  index.addAll([...repo.entries.values()].map(({ id, item, meta }) => {
    const { title, text, ...attributes } = item.data;
    return { id, title, text, attributes: JSON.stringify(attributes), type: item.data.type, status: meta.data.status, owner: meta.data.owner };
  }));
  return index;
}

// CO-03.2
export function search(repo: Repo, query: string): Named[] {
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
