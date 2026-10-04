// CO-01.1, CO-01.2
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { Document, LineCounter, parseDocument } from 'yaml';

export interface Link { type: string; target: string; result?: string; title?: string; version?: string; by?: string; on?: string; commit?: string }
export interface Item { id: string; type: string; title: string; [attribute: string]: unknown }
export interface Meta { confirmed?: Record<string, Omit<Link, 'type' | 'target'>>; status?: string; owner?: string }

export interface YamlFile<T> { path: string; doc: Document; lines: LineCounter; data: T }
// `path`: item folder or requirement file.
export interface Entry { id: string; path: string; nested: string[]; requirements: string[]; item: YamlFile<Item>; meta: YamlFile<Meta> }
export interface Settings { prefixes?: Record<string, string> }
export interface Repo { root: string; settings: Settings; entries: Map<string, Entry>; duplicates: Entry[] }

export class UsageError extends Error {}
export class Refused extends Error {}

export function readYaml<T>(root: string, path: string): YamlFile<T> {
  const file = join(root, path);
  const lines = new LineCounter();
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const doc = parseDocument(text, { lineCounter: lines });
  return { path, doc, lines, data: (doc.toJS() ?? {}) as T };
}

export function writeYaml(root: string, file: Pick<YamlFile<unknown>, 'path' | 'doc'>): void {
  const target = join(root, file.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, String(file.doc));
}

// CL-01.1
export function findRoot(start: string): string {
  for (let folder = resolve(start); ; folder = dirname(folder)) {
    if (existsSync(join(folder, 'plm.yaml'))) return folder;
    const isFileSystemRoot = folder === dirname(folder);
    if (isFileSystemRoot) throw new UsageError(`No plm.yaml found in ${start} or above`);
  }
}

// CO-01.1, CO-02.2
export const homeFolders: Record<string, string> = { requirement: 'requirements', 'test-case': 'tests', 'test-run': 'runs' };

export function loadRepo(start: string): Repo {
  const root = findRoot(start);
  const repo: Repo = { root, settings: readYaml<Settings>(root, 'plm.yaml').data, entries: new Map(), duplicates: [] };

  const addEntry = (path: string): Entry => {
    const item = readYaml<Item>(root, isRequirementFile(path) ? path : `${path}/item.yaml`);
    const id = String(item.data.id ?? basename(path));
    const added: Entry = { id, path, nested: [], requirements: [], item, meta: readYaml(root, `meta/${id}.yaml`) };
    if (repo.entries.has(id)) repo.duplicates.push(added);
    else repo.entries.set(id, added);
    return added;
  };

  const addRequirements = (folder: string, parent: Entry) => {
    for (const child of readdirSync(join(root, folder), { withFileTypes: true })) {
      const path = `${folder}/${child.name}`;
      if (child.isDirectory()) addRequirements(path, parent);
      else if (isRequirementFile(path)) parent.requirements.push(addEntry(path).id);
    }
  };

  const walk = (folder: string, parent?: Entry) => {
    for (const child of readdirSync(join(root, folder), { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      const path = folder ? `${folder}/${child.name}` : child.name;
      if (parent && child.name === homeFolders.requirement) addRequirements(path, parent);
      else if (parent ? child.name === homeFolders['test-case'] : !folder && child.name === homeFolders['test-run']) walk(path);
      else if (existsSync(join(root, path, 'item.yaml'))) {
        const nested = addEntry(path);
        parent?.nested.push(nested.id);
        walk(path, nested);
      }
    }
  };

  walk('');
  return repo;
}

export const isRequirementFile = (path: string) => path.endsWith('.yaml');
export const list = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);
export const usesOf = (entry?: Entry): string[] => list(entry?.item.data.uses);
export const childrenOf = (entry?: Entry): string[] => [...(entry?.nested ?? []), ...usesOf(entry)];
export const linksOf = (entry: Entry): Link[] => list<Link>(entry.item.data.links).map((link) => ({ ...entry.meta.data.confirmed?.[link.target], ...link }));

// TE-05.1, VS-01.2: the innermost item containing a file, given relative to the root.
export const innermostItem = (repo: Repo, file: string) => [...repo.entries.values()]
  .filter((candidate) => file === candidate.path || file.startsWith(`${candidate.path}/`))
  .sort((a, b) => b.path.length - a.path.length)[0]?.id;

// CL-02.2
export function newId(repo: Repo, type: string): string {
  const prefix = repo.settings.prefixes?.[type];
  if (!prefix) throw new UsageError(`No ID prefix for type ${type} in plm.yaml`);
  const crockfordBase32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const characters = Array.from(randomBytes(6), (byte) => crockfordBase32[byte & 31]);
  return prefix + characters.join('');
}

// CL-02.1
export function newItem(repo: Repo, type: string, title: string, folder: string): string {
  const cwd = relative(repo.root, resolve(folder));
  const parent = repo.entries.get(innermostItem(repo, cwd) ?? '');
  if ((type === 'requirement' || type === 'test-case') && !parent) throw new UsageError(`Create ${type}s inside an item folder`);

  const id = newId(repo, type);
  const home = [parent?.path, homeFolders[type]].filter(Boolean).join('/');
  const inGroup = type === 'requirement' && cwd.startsWith(`${home}/`);
  const path = [inGroup ? cwd : home, title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || id].filter(Boolean).join('/');

  const item = readYaml(repo.root, `templates/${type}.yaml`);
  item.path = type === 'requirement' ? `${path}.yaml` : `${path}/item.yaml`;
  if (existsSync(join(repo.root, item.path))) throw new UsageError(`${item.path} exists`);
  for (const [key, value] of Object.entries({ id, type, title })) item.doc.setIn([key], value);
  writeYaml(repo.root, item);
  writeYaml(repo.root, { path: `meta/${id}.yaml`, doc: parseDocument('status: draft\n') });
  return id;
}

// CO-01.3
export function artifacts(repo: Repo, { path }: Entry) {
  const skipped = ['item.yaml', homeFolders.requirement, homeFolders['test-case']];
  const files = (folder: string): string[] => readdirSync(join(repo.root, folder), { withFileTypes: true }).flatMap((child) => {
    const file = `${folder}/${child.name}`;
    if (child.name.startsWith('.') || (folder === path && skipped.includes(child.name))) return [];
    if (!child.isDirectory()) return existsSync(join(repo.root, file)) ? [file] : [];
    return existsSync(join(repo.root, file, 'item.yaml')) ? [] : files(file);
  });
  const isPointer = (file: string) => statSync(join(repo.root, file)).size < 200
    && readFileSync(join(repo.root, file), 'utf8').startsWith('version https://git-lfs.github.com/spec/v1');
  return isRequirementFile(path) ? [] : files(path).sort().map((file) => (isPointer(file) ? { path: file, lfs: 'missing' } : { path: file }));
}

// CL-05.3
export interface Named { id: string; title: string }
export const named = (repo: Repo, id: string): Named => ({ id, title: String(repo.entries.get(id)?.item.data.title ?? '') });

export function entry(repo: Repo, id: string): Entry {
  const found = repo.entries.get(id);
  if (!found) throw new UsageError(`Unknown item ${id}`);
  return found;
}

// TE-03.2, TE-06.2: the item, its nested and used items, each listed once.
export function subtree(repo: Repo, id: string, seen = new Set<string>()): string[] {
  if (seen.has(id) || !repo.entries.has(id)) return [];
  seen.add(id);
  const children = childrenOf(repo.entries.get(id));
  return [id, ...children.flatMap((child) => subtree(repo, child, seen))];
}

// TE-06.2
export function selection(repo: Repo, root: string): string[] {
  const items = subtree(repo, root);
  return [...items, ...items.flatMap((id) => entry(repo, id).requirements)];
}
