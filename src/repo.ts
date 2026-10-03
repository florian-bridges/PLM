// CO-01.1, CO-01.2: load and write the product repository.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Document, LineCounter, parseDocument } from 'yaml';

export interface Link { type: string; target: string; version?: string }
export interface Item { id: string; type: string; title: string; text?: string; children?: string[]; [attr: string]: unknown }
export interface Meta { owner?: string; status?: string; revision?: string; links?: Link[] }
export interface Settings { prefixes?: Record<string, string> }

export interface YamlFile<T> { path: string; doc: Document; lines: LineCounter; data: T }
export interface Entry { id: string; item: YamlFile<Item>; meta: YamlFile<Meta> }
export interface Repo { root: string; settings: Settings; entries: Map<string, Entry> }

export class UsageError extends Error {}
export class Refused extends Error {}

export function readYaml<T>(root: string, path: string): YamlFile<T> {
  const file = join(root, path);
  const lines = new LineCounter();
  const doc = parseDocument(existsSync(file) ? readFileSync(file, 'utf8') : '', { lineCounter: lines });
  return { path, doc, lines, data: (doc.toJS() ?? {}) as T };
}

// Writes through the parsed document, keeping comments and formatting.
export function writeYaml(root: string, file: YamlFile<unknown>): void {
  mkdirSync(dirname(join(root, file.path)), { recursive: true });
  writeFileSync(join(root, file.path), String(file.doc));
}

export function loadRepo(root: string): Repo {
  const entries = new Map<string, Entry>();
  const items = join(root, 'items');
  for (const dir of existsSync(items) ? readdirSync(items, { withFileTypes: true }) : []) {
    if (!dir.isDirectory()) continue;
    const id = dir.name;
    entries.set(id, { id, item: readYaml(root, `items/${id}/item.yaml`), meta: readYaml(root, `meta/${id}.yaml`) });
  }
  return { root, settings: readYaml<Settings>(root, 'plm.yaml').data, entries };
}

export const list = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);
export const childrenOf = (entry?: Entry): string[] => list(entry?.item.data.children);
export const linksOf = (entry: Entry): Link[] => list(entry.meta.data.links);

export function entry(repo: Repo, id: string): Entry {
  const found = repo.entries.get(id);
  if (!found) throw new UsageError(`Unknown item ${id}`);
  return found;
}

// The item and its descendants, each listed once.
export function subtree(repo: Repo, id: string, seen = new Set<string>()): string[] {
  if (seen.has(id) || !repo.entries.has(id)) return [];
  seen.add(id);
  return [id, ...childrenOf(repo.entries.get(id)).flatMap((child) => subtree(repo, child, seen))];
}
