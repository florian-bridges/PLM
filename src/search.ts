// CO-03
import MiniSearch from 'minisearch';
import { named, type Named, type Repo } from './repo.ts';

// CO-03.1: one document per item, with its other attributes as text.
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
  const filters = [...query.matchAll(/\b(type|status|owner):(\S+)/g)];
  const text = query.replace(/\b(type|status|owner):\S+/g, '').trim();
  const filter = (result: Record<string, unknown>) => filters.every(([, field, value]) => result[field] === value);
  return searchIndex(repo).search(text || MiniSearch.wildcard, { prefix: true, combineWith: 'AND', filter }).map((result) => named(repo, result.id));
}
