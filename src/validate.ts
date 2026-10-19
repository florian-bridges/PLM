import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import { childrenOf, innermostItem, linksOf, usesOf, type Repo, type YamlFile } from './repo.ts';
import { allows, baseSchema, builtinTypes, linkRules } from './schemas.ts';

// CO-02.4
export interface Finding { file: string; line: number; col: number; severity: 'error' | 'warning'; code: string; message: string }

function finding(file: YamlFile<unknown>, path: (string | number)[], code: string, message: string): Finding {
  let node: unknown;
  for (let depth = path.length; depth > 0 && !node; depth--) node = file.doc.getIn(path.slice(0, depth), true);
  const offset = (node as { range?: number[] } | undefined)?.range?.[0] ?? 0;
  const { line, col } = file.lines.linePos(offset);
  return { file: file.path, line, col, severity: 'error', code, message };
}

// CO-02.1
function schemaFor(ajv: Ajv2020, root: string, type: string): ValidateFunction | undefined {
  const extensionFile = join(root, 'schemas', `${type}.schema.json`);
  const builtin = Object.hasOwn(builtinTypes, type) ? builtinTypes[type] : undefined;
  const extension = existsSync(extensionFile) ? JSON.parse(readFileSync(extensionFile, 'utf8')) : undefined;
  const parts = [builtin, extension].filter(Boolean);
  if (!parts.length) return undefined;
  if (!ajv.getSchema(type)) ajv.addSchema({ allOf: [baseSchema, ...parts], unevaluatedProperties: false }, type);
  return ajv.getSchema(type);
}

const newAjv = () => new Ajv2020({ allErrors: true, strictTypes: false });

// VS-01.2: the type's validator for the item form.
export const itemSchema = (root: string, type: string) => schemaFor(newAjv(), root, type);

export function validate(repo: Repo): Finding[] {
  const ajv = newAjv();
  const findings: Finding[] = [];
  for (const entry of [...repo.entries.values(), ...repo.duplicates]) {
    const { id, item } = entry;
    const type = String(item.data.type);
    const validateSchema = schemaFor(ajv, repo.root, type);
    if (!validateSchema) findings.push(finding(item, ['type'], 'unknown-type', `Unknown item type "${type}"`));
    else if (!validateSchema(item.data)) {
      for (const error of validateSchema.errors ?? []) {
        const unexpected = error.params.unevaluatedProperty;
        const path = [...error.instancePath.split('/').slice(1), ...(unexpected ? [unexpected] : [])];
        findings.push(finding(item, path, 'schema', `${path.join('.') || 'item'} ${error.message}`));
      }
    }

    // CO-02.2
    const folders = dirname(entry.path).split('/');
    const home = repo.settings.folders![type];
    const misplaced = home ? (type === 'test-run' || !!innermostItem(repo, folders.join('/'))) && !folders.includes(home) : Object.values(repo.settings.folders!).some((folder) => folders.includes(folder));
    if (misplaced) findings.push(finding(item, ['type'], 'misplaced', `outside ${home}`));

    if (repo.duplicates.includes(entry)) findings.push(finding(item, ['id'], 'id-clash', `Duplicate id ${id}`));

    usesOf(entry).forEach((used, index) => {
      if (!repo.entries.has(used)) findings.push(finding(item, ['uses', index], 'unknown-use', `Unknown used item ${used}`));
    });

    linksOf(entry).forEach((link, index) => {
      const target = repo.entries.get(link.target)?.item.data;
      if (!target) {
        findings.push(finding(item, ['links', index, 'target'], 'unknown-target', `Unknown link target ${link.target}`));
        return;
      }
      const [sourceTypes, targetTypes] = linkRules[link.type] ?? [[], []];
      if (!allows(sourceTypes, type) || !allows(targetTypes, target.type)) {
        findings.push(finding(item, ['links', index, 'type'], 'link-type', `${link.type} not allowed from ${type} to ${target.type}`));
      }
    });
  }
  // CO-02.2
  const metaFolder = join(repo.root, 'meta');
  const orphans = existsSync(metaFolder) ? readdirSync(metaFolder).filter((f) => f.endsWith('.yaml') && !repo.entries.has(f.slice(0, -5))) : [];
  for (const file of orphans) findings.push({ file: `meta/${file}`, line: 1, col: 1, severity: 'error', code: 'orphan', message: `No item: meta/${file}` });

  return [...findings, ...cycles(repo)];
}

// CO-02.2
function cycles(repo: Repo): Finding[] {
  const state = new Map<string, 'open' | 'done'>();
  const findings: Finding[] = [];
  const visit = (id: string) => {
    state.set(id, 'open');
    const entry = repo.entries.get(id)!;
    for (const child of childrenOf(entry)) {
      const closesCycle = state.get(child) === 'open';
      if (closesCycle) findings.push(finding(entry.item, ['uses'], 'cycle', `${id} → ${child} closes composition cycle`));
      else if (!state.has(child) && repo.entries.has(child)) visit(child);
    }
    state.set(id, 'done');
  };
  for (const id of repo.entries.keys()) if (!state.has(id)) visit(id);
  return findings;
}
