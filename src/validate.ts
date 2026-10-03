// CO-02: validate items, links and composition.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import { childrenOf, linksOf, type Repo, type YamlFile } from './repo.ts';
import { baseSchema, builtinTypes, linkRules } from './schemas.ts';

// CO-02.4: every finding has a position, severity and stable code.
export interface Finding { file: string; line: number; col: number; severity: 'error' | 'warning'; code: string; message: string }

function finding(file: YamlFile<unknown>, path: (string | number)[], code: string, message: string): Finding {
  let node: unknown;
  for (let n = path.length; n > 0 && !node; n--) node = file.doc.getIn(path.slice(0, n), true);
  const offset = (node as { range?: number[] } | undefined)?.range?.[0] ?? 0;
  const { line, col } = file.lines.linePos(offset);
  return { file: file.path, line, col, severity: 'error', code, message };
}

// CO-02.1: built-in schema, extended by schemas/<type>.schema.json.
function schemaFor(ajv: Ajv2020, root: string, type: string): ValidateFunction | undefined {
  const extension = join(root, 'schemas', `${type}.schema.json`);
  const builtin = Object.hasOwn(builtinTypes, type) ? builtinTypes[type] : undefined;
  if (!builtin && !existsSync(extension)) return undefined;
  if (!ajv.getSchema(type)) {
    const parts = [baseSchema, builtin ?? {}];
    if (existsSync(extension)) parts.push(JSON.parse(readFileSync(extension, 'utf8')));
    ajv.addSchema({ allOf: parts, unevaluatedProperties: false }, type);
  }
  return ajv.getSchema(type);
}

export function validate(repo: Repo): Finding[] {
  const ajv = new Ajv2020({ allErrors: true, strictTypes: false });
  const findings: Finding[] = [];
  const lowerIds = new Map<string, string>();
  for (const entry of repo.entries.values()) {
    const { id, item, meta } = entry;
    const check = schemaFor(ajv, repo.root, String(item.data.type));
    if (!check) findings.push(finding(item, ['type'], 'unknown-type', `Unknown item type "${item.data.type}"`));
    else if (!check(item.data)) {
      for (const e of check.errors ?? []) {
        const extra = e.params.unevaluatedProperty;
        const path = [...e.instancePath.split('/').slice(1), ...(extra ? [extra] : [])];
        findings.push(finding(item, path, 'schema', `${path.join('.') || 'item'} ${e.message}`));
      }
    }

    // CO-02.2
    if (item.data.id !== id) findings.push(finding(item, ['id'], 'id-mismatch', `id "${item.data.id}" differs from directory ${id}`));
    const other = lowerIds.get(id.toLowerCase());
    if (other) findings.push(finding(item, ['id'], 'id-case', `${id} differs from ${other} only in case`));
    lowerIds.set(id.toLowerCase(), id);
    childrenOf(entry).forEach((child, i) => {
      if (!repo.entries.has(child)) findings.push(finding(item, ['children', i], 'unknown-child', `Unknown child ${child}`));
    });
    linksOf(entry).forEach((link, i) => {
      const target = repo.entries.get(link.target)?.item.data;
      const [from, to] = linkRules[link.type] ?? [[], []];
      const allowed = (types: string[], type: string) => types.includes('*') || types.includes(type);
      if (!target) findings.push(finding(meta, ['links', i, 'target'], 'unknown-target', `Unknown link target ${link.target}`));
      else if (!allowed(from, item.data.type) || !allowed(to, target.type)) {
        findings.push(finding(meta, ['links', i, 'type'], 'link-type', `${link.type} not allowed from ${item.data.type} to ${target.type}`));
      }
    });
  }
  return [...findings, ...cycles(repo)];
}

// CO-02.2: composition cycles, by depth-first search.
function cycles(repo: Repo): Finding[] {
  const state = new Map<string, 'open' | 'done'>();
  const findings: Finding[] = [];
  const visit = (id: string) => {
    state.set(id, 'open');
    const entry = repo.entries.get(id)!;
    childrenOf(entry).forEach((child, i) => {
      if (state.get(child) === 'open') findings.push(finding(entry.item, ['children', i], 'cycle', `${id} → ${child} closes a composition cycle`));
      else if (!state.has(child) && repo.entries.has(child)) visit(child);
    });
    state.set(id, 'done');
  };
  for (const id of repo.entries.keys()) if (!state.has(id)) visit(id);
  return findings;
}
