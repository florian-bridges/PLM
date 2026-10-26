// CO-03
import MiniSearch from 'minisearch';
import { list, named, selection, type Named, type Repo } from './repo.ts';

// CO-03.1
export function searchIndex(repo: Repo): MiniSearch {
  const index = new MiniSearch({ fields: ['id', 'title', 'text', 'attributes'], storeFields: ['type', 'status', 'owner'] });
  index.addAll([...repo.entries.values()].map(({ id, item, meta }) => {
    const { title, text, ...attributes } = item.data;
    return { id, title, text, attributes: JSON.stringify(attributes), type: item.data.type, status: meta.data.status, owner: meta.data.owner };
  }));
  return index;
}

// CO-03.2, CO-03.3
export function parseFilters(query: string) {
  const pattern = /\b(\w+):(\S+)/g;
  return { filters: [...query.matchAll(pattern)].map((m) => [m[1], m[2]]), text: query.replace(pattern, '').trim() };
}

// CO-03.2
export function search(repo: Repo, query: string): Named[] {
  const { filters, text } = parseFilters(query);
  const filter = (result: Record<string, unknown>) => filters.every(([field, value]) => result[field] === value);
  return searchIndex(repo).search(text || MiniSearch.wildcard, { prefix: true, combineWith: 'AND', filter }).map((result) => named(repo, result.id));
}

// CO-03.3
export function entries(repo: Repo, extra: string[][], root?: string) {
  const scope = root && new Set(selection(repo, root));
  return Object.entries(repo.settings.entries ?? {}).flatMap(([field, config]) => {
    const required = [...parseFilters(config).filters, ...extra];
    return [...repo.entries.values()].flatMap((source) => list<any>(source.item.data[field]).flatMap((data: any) =>
      (Object.values(data) as string[])
        .filter((refers) => repo.entries.has(refers) && (!scope || scope.has(refers))
          && required.every(([k, val]) => String(data[k] ?? repo.entries.get(refers)?.meta.data[k as never]) === val))
        .map((refers) => ({ source: source.id, refers, ...data }))));
  });
}
