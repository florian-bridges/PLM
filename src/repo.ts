// CO-01.1, CO-01.2: load and write the product repository.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { Document, LineCounter, parseDocument } from 'yaml';

export interface Link { type: string; target: string; version?: string }
export interface Item { id: string; type: string; title: string; [attr: string]: unknown }
export interface Meta { links?: Link[] }

export interface YamlFile<T> { path: string; doc: Document; lines: LineCounter; data: T }
// `path`: item folder or requirement file.
export interface Entry { id: string; path: string; nested: string[]; item: YamlFile<Item>; meta: YamlFile<Meta> }
export interface Repo { root: string; settings: { prefixes?: Record<string, string> }; entries: Map<string, Entry>; duplicates: Entry[] }

export class UsageError extends Error {}
export class Refused extends Error {}

export function readYaml<T>(root: string, path: string): YamlFile<T> {
  const file = join(root, path);
  const lines = new LineCounter();
  const doc = parseDocument(existsSync(file) ? readFileSync(file, 'utf8') : '', { lineCounter: lines });
  return { path, doc, lines, data: (doc.toJS() ?? {}) as T };
}

// Writes through the parsed document, keeping comments and formatting.
export function writeYaml(root: string, file: Pick<YamlFile<unknown>, 'path' | 'doc'>): void {
  mkdirSync(dirname(join(root, file.path)), { recursive: true });
  writeFileSync(join(root, file.path), String(file.doc));
}

// CL-01.1: the repository is the nearest folder upwards containing plm.yaml.
export function findRoot(start: string): string {
  for (let dir = resolve(start); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'plm.yaml'))) return dir;
    if (dir === dirname(dir)) throw new UsageError(`No plm.yaml found in ${start} or above`);
  }
}

// Item folders contain item.yaml and nest; requirements are files in their requirements folder;
// test cases and runs are item folders in the top-level tests and runs folders.
export function loadRepo(start: string): Repo {
  const repo: Repo = { root: findRoot(start), settings: {}, entries: new Map(), duplicates: [] };
  repo.settings = readYaml<Repo['settings']>(repo.root, 'plm.yaml').data;
  const add = (path: string) => {
    const item = readYaml<Item>(repo.root, path.endsWith('.yaml') ? path : `${path}/item.yaml`);
    const id = String(item.data.id ?? basename(path));
    const e: Entry = { id, path, nested: [], item, meta: readYaml(repo.root, `meta/${id}.yaml`) };
    if (repo.entries.has(id)) repo.duplicates.push(e);
    else repo.entries.set(id, e);
    return e;
  };
  const walk = (dir: string, parent?: Entry) => {
    for (const d of readdirSync(join(repo.root, dir), { withFileTypes: true })) {
      const path = dir ? `${dir}/${d.name}` : d.name;
      if (!d.isDirectory()) continue;
      if (parent && d.name === 'requirements') {
        for (const f of readdirSync(join(repo.root, path))) if (f.endsWith('.yaml')) add(`${path}/${f}`);
      } else if (!dir && ['tests', 'runs'].includes(d.name)) walk(path);
      else if (existsSync(join(repo.root, path, 'item.yaml'))) {
        const e = add(path);
        parent?.nested.push(e.id);
        walk(path, e);
      }
    }
  };
  walk('');
  return repo;
}

// CO-02.2: a folder or file name is the ID, optionally followed by `-<title>`.
export const nameMatches = (name: string, id: string) => [id, `${id}.yaml`].includes(name) || name.startsWith(`${id}-`);

export const list = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);
export const usesOf = (entry?: Entry): string[] => list(entry?.item.data.uses);
export const childrenOf = (entry?: Entry): string[] => [...(entry?.nested ?? []), ...usesOf(entry)];
export const linksOf = (entry: Entry): Link[] => list(entry.meta.data.links);

export function entry(repo: Repo, id: string): Entry {
  const found = repo.entries.get(id);
  if (!found) throw new UsageError(`Unknown item ${id}`);
  return found;
}

// The item, its nested and used items, each listed once.
export function subtree(repo: Repo, id: string, seen = new Set<string>()): string[] {
  if (seen.has(id) || !repo.entries.has(id)) return [];
  seen.add(id);
  return [id, ...childrenOf(repo.entries.get(id)).flatMap((child) => subtree(repo, child, seen))];
}
