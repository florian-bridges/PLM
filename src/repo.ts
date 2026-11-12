// CO-01.1–CO-01.2
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { Document, LineCounter, parseDocument } from 'yaml';

// CL-05.2
export function git(root: string, args: string[], env: Record<string, string> = {}) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, ...env }, maxBuffer: 1 << 28 }).trim();
}
export const tryGit = (root: string, args: string[]) => { try { return git(root, args); } catch { return ''; } };

export interface Link { type: string; target: string; result?: string; title?: string; version?: string; by?: string; on?: string; commit?: string }
interface Item { id: string; type: string; title: string; [attribute: string]: unknown }
interface Meta { confirmed?: Record<string, Omit<Link, 'type' | 'target'>>; status?: string; owner?: string }

export interface YamlFile<T> { path: string; doc: Document; lines: LineCounter; data: T }
export interface Entry { id: string; path: string; nested: string[]; requirements: string[]; item: YamlFile<Item>; meta: YamlFile<Meta> }
interface Settings { prefixes?: Record<string, string>; informative?: string[]; folders?: Record<string, string> }
export interface Repo { root: string; settings: Settings; entries: Map<string, Entry>; duplicates: Entry[] }

export class UsageError extends Error {}
export class Refused extends Error {}

function readYaml<T>(root: string, path: string) {
  const file = join(root, path), lines = new LineCounter(), text = existsSync(file) ? readFileSync(file, 'utf8') : '',
    doc = parseDocument(text, { lineCounter: lines });
  return { path, doc, lines, data: (doc.toJS() ?? {}) as T };
}

export function writeYaml(root: string, file: Pick<YamlFile<unknown>, 'path' | 'doc'>) {
  const target = join(root, file.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, file.doc.toString({ lineWidth: 0 }));
}

// CL-01.1
export function findRoot(start: string) {
  for (let folder = resolve(start); ; folder = dirname(folder)) {
    if (existsSync(join(folder, 'plm.yaml'))) return folder;
    if (folder === dirname(folder)) throw new UsageError(`No plm.yaml from ${start}`);
  }
}

export function loadRepo(start: string) {
  const root = findRoot(start),
    repo: Repo = { root, settings: readYaml<Settings>(root, 'plm.yaml').data, entries: new Map(), duplicates: [] };
  // CO-01.1, CO-02.2
  repo.settings.folders = { requirement: 'requirements', 'test-case': 'tests', 'test-run': 'runs', ...repo.settings.folders };

  const addEntry = (path: string) => {
      const item = readYaml<Item>(root, isRequirementFile(path) ? path : `${path}/item.yaml`),
        id = String(item.data.id ?? basename(path)),
        added: Entry = { id, path, nested: [], requirements: [], item, meta: readYaml(root, `meta/${id}.yaml`) };
      if (repo.entries.has(id)) repo.duplicates.push(added);
      else repo.entries.set(id, added);
      return added;
    },
    walk = (folder: string, parent?: Entry, requirements?: boolean) => {
    for (const child of readdirSync(join(root, folder), { withFileTypes: true })) {
      const path = folder ? `${folder}/${child.name}` : child.name;
      if (requirements) {
        if (child.isDirectory()) walk(path, parent, true);
        else if (isRequirementFile(path)) parent!.requirements.push(addEntry(path).id);
      } else if (!child.isDirectory() || child.name.startsWith('.')) continue;
      else if (parent && child.name === repo.settings.folders!.requirement) walk(path, parent, true);
      else if (parent ? child.name === repo.settings.folders!['test-case'] : !folder && child.name === repo.settings.folders!['test-run']) walk(path);
      else if (existsSync(join(root, path, 'item.yaml'))) {
        const nested = addEntry(path);
        parent?.nested.push(nested.id);
        walk(path, nested);
      } else walk(path, parent); // CO-01.1
    }
  };

  walk('');
  return repo;
}

// TE-01.1
export const targetId = (target: string) => target.split(':')[0];

// CO-02.7, TE-01.1
export interface Parameter { name: string; value?: number; unit?: string; state?: string }
export function parameterOf(repo: Repo, ref: string) {
  const id = targetId(ref), found = repo.entries.get(id);
  if (!found || id === ref) return undefined;
  const parameter = list<Parameter>(found.item.data.parameters).find((p) => p.name === ref.slice(id.length + 1));
  return parameter && { entry: found, parameter };
}

export const isRequirementFile = (path: string) => path.endsWith('.yaml');
export const list = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);
export const usesOf = (entry?: Entry): string[] => list(entry?.item.data.uses);
export const childrenOf = (entry?: Entry) => [...(entry?.nested ?? []), ...usesOf(entry)];

// CO-02.7
const cited = /\{([^{}\s]+)\}/g;
export const citations = (data: any, local = false) => [...new Set([...String(data?.text ?? '').matchAll(cited)].map((match) => match[1]))].filter((ref) => ref.includes(':') !== local);
export const linksOf = ({ item, meta }: Entry) => {
  const listed = list<Link>(item.data.links);
  return [...listed, ...citations(item.data).filter((target) => !listed.some((link) => link.target === target)).map((target) => ({ type: 'derives-from', target }))]
    .map((link) => ({ ...meta.data.confirmed?.[link.target], ...link }));
};

// CL-05.3
export const expanded = (repo: Repo, { id, item: { data: { text } } }: Entry) => (typeof text !== 'string' ? text : text.replace(cited, (all, ref) => {
  const found = parameterOf(repo, ref.includes(':') ? ref : `${id}:${ref}`)?.parameter;
  return !found ? all : found.value == null ? 'TBD' : `${found.value} ${found.unit ?? ''}`.trim();
}));

// TE-05.1, VS-01.2
export const innermostItem = (repo: Repo, file: string) => [...repo.entries.values()]
  .filter((candidate) => file === candidate.path || file.startsWith(`${candidate.path}/`))
  .sort((a, b) => b.path.length - a.path.length)[0]?.id;

// CL-02.2
export function newId(repo: Repo, type: string) {
  const prefix = repo.settings.prefixes?.[type];
  if (!prefix) throw new UsageError(`No prefix for ${type}`);
  return prefix + Array.from(randomBytes(6), (byte) => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[byte & 31]).join('');
}

// CL-02.1
export function newItem(repo: Repo, type: string, title: string, folder: string) {
  const cwd = relative(repo.root, resolve(folder)), parent = repo.entries.get(innermostItem(repo, cwd) ?? '');
  if ((type === 'requirement' || type === 'test-case') && !parent) throw new UsageError(`Create ${type}s inside an item`);

  const id = newId(repo, type),
    typeHome = parent && repo.settings.folders![type] && `${parent.path}/${repo.settings.folders![type]}`,
    inGroup = !!parent && (!typeHome || cwd === typeHome || cwd.startsWith(`${typeHome}/`)),
    path = [inGroup ? cwd : typeHome || parent?.path, title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || id].filter(Boolean).join('/'),
    item = readYaml(repo.root, `templates/${type}.yaml`);
  item.path = type === 'requirement' ? `${path}.yaml` : `${path}/item.yaml`;
  if (existsSync(join(repo.root, item.path))) throw new UsageError(`${item.path} exists`);
  for (const [key, value] of Object.entries({ id, type, title })) item.doc.setIn([key], value);
  writeYaml(repo.root, item);
  writeYaml(repo.root, { path: `meta/${id}.yaml`, doc: parseDocument('status: draft\n') });
  return { id, path: item.path };
}

// CO-01.3
export const tracked = (repo: Repo) => git(repo.root, ['ls-files', '-co', '--exclude-standard']).split('\n').map((file) => file.replace(/\/$/, '')).filter((file) => file && existsSync(join(repo.root, file)));

export function artifacts(repo: Repo, { path, nested }: Entry) {
  if (isRequirementFile(path)) return [];
  const skip = Object.values(repo.settings.folders!), prefix = `${path}/`,
    nestedPaths = nested.map((id) => repo.entries.get(id)!.path),
    isPointer = (file: string, stat = statSync(join(repo.root, file))) => stat.isFile() && stat.size < 200
      && readFileSync(join(repo.root, file), 'utf8').startsWith('version https://git-lfs.github.com/spec/v1');
  return tracked(repo).filter((file) => file.startsWith(prefix) && file.slice(prefix.length) !== 'item.yaml'
      && !skip.includes(file.slice(prefix.length).split('/')[0]) && !nestedPaths.some((n) => file.startsWith(`${n}/`)))
    .sort().map((file) => (isPointer(file) ? { path: file, lfs: 'missing' } : { path: file }));
}

// CL-05.3
export interface Named { id: string; title: string }
export const named = (repo: Repo, id: string) => ({ id, title: String(repo.entries.get(id)?.item.data.title ?? '') });

export function entry(repo: Repo, id: string) {
  const found = repo.entries.get(id);
  if (!found) throw new UsageError(`Unknown item ${id}`);
  return found;
}

// TE-03.2, TE-06.2
export function subtree(repo: Repo, id: string, seen = new Set<string>()): string[] {
  if (seen.has(id) || !repo.entries.has(id)) return [];
  seen.add(id);
  return [id, ...childrenOf(repo.entries.get(id)).flatMap((child) => subtree(repo, child, seen))];
}
