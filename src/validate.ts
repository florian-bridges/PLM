import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import { childrenOf, innermostItem, linksOf, list, parameterOf, targetId, targetPath, usesOf, type Parameter, type Repo, type YamlFile } from './repo.ts';
import { allows, baseSchema, builtinTypes, linkRules } from './schemas.ts';

// CO-02.4
export interface Finding { file: string; line: number; col: number; severity: 'error' | 'warning'; code: string; message: string }

function finding(file: YamlFile<unknown>, path: (string | number)[], code: string, message: string): Finding {
  let node: unknown;
  for (let depth = path.length; depth > 0 && !node; depth--) node = file.doc.getIn(path.slice(0, depth), true);
  const offset = (node as { range?: number[] } | undefined)?.range?.[0] ?? 0,
    { line, col } = file.lines.linePos(offset);
  return { file: file.path, line, col, severity: 'error', code, message };
}

// CO-02.1
function schemaFor(ajv: Ajv2020, root: string, name: string, base?: object) {
  const extensionFile = join(root, 'schemas', `${name}.schema.json`),
    builtin = Object.hasOwn(builtinTypes, name) ? builtinTypes[name] : undefined,
    extension = existsSync(extensionFile) ? JSON.parse(readFileSync(extensionFile, 'utf8')) : undefined,
    parts = [builtin, extension].filter(Boolean);
  if (!parts.length) return undefined;
  if (!ajv.getSchema(name)) ajv.addSchema(base ? { allOf: [base, ...parts], unevaluatedProperties: false } : parts[0], name);
  return ajv.getSchema(name);
}

const newAjv = () => new Ajv2020({ allErrors: true, strictTypes: false });

// VS-01.2
export const itemSchema = (root: string, type: string) => schemaFor(newAjv(), root, type, baseSchema);

// CO-02.1, CO-02.4
function schemaFindings(file: YamlFile<unknown>, check: ValidateFunction, data: unknown, draft: boolean): Finding[] {
  if (check(data)) return [];
  return (check.errors ?? []).map((error) => {
    const path = [...error.instancePath.split('/').slice(1), ...(error.params.unevaluatedProperty ? [error.params.unevaluatedProperty] : [])];
    return { ...finding(file, path, 'schema', `${path.join('.') || 'item'} ${error.message}`), severity: error.keyword === 'required' && draft ? 'warning' : 'error' };
  });
}

export function validate(repo: Repo) {
  const ajv = newAjv(), findings: Finding[] = [],
    // CO-02.7
    states = (repo.settings as any).parameter_states ?? ['provisional', 'final'];
  for (const entry of [...repo.entries.values(), ...repo.duplicates]) {
    const { id, item, meta } = entry, type = String(item.data.type), draft = meta.data.status === 'draft',
      validateSchema = schemaFor(ajv, repo.root, type, baseSchema), validateMeta = schemaFor(ajv, repo.root, 'meta'),
      // CO-02.2
      folders = dirname(entry.path).split('/'), home = repo.settings.folders![type],
      misplaced = home ? (type === 'test-run' || !!innermostItem(repo, folders.join('/'))) && !folders.includes(home) : Object.values(repo.settings.folders!).some((folder) => folders.includes(folder));
    if (!validateSchema) findings.push(finding(item, ['type'], 'unknown-type', type));
    else findings.push(...schemaFindings(item, validateSchema, item.data, draft));
    // CO-02.1
    if (validateMeta) findings.push(...schemaFindings(meta, validateMeta, meta.data, false));

    if (misplaced) findings.push(finding(item, ['type'], 'misplaced', `outside ${home}`));

    if (repo.duplicates.includes(entry)) findings.push(finding(item, ['id'], 'id-clash', id));

    usesOf(entry).forEach((used, index) => {
      if (!repo.entries.has(used)) findings.push(finding(item, ['uses', index], 'unknown-use', used));
    });

    // CO-02.7
    list<Parameter>(item.data.parameters).forEach((p, index) => {
      if (p.state && !states.includes(p.state)) findings.push(finding(item, ['parameters', index, 'state'], 'unknown-state', p.state));
    });

    linksOf(entry).forEach((link, index) => {
      const param = parameterOf(repo, link.target), path = targetPath(repo, link.target),
        targetEntry = repo.entries.get(targetId(link.target)), [sourceTypes, targetTypes] = linkRules[link.type] ?? [[], []];
      if (!path || !existsSync(join(repo.root, path)) || (link.target.includes(':') && !param)) {
        findings.push(finding(item, ['links', index, 'target'], 'unknown-target', link.target));
        return;
      }
      if (!allows(sourceTypes, type) || !allows(targetTypes, targetEntry!.item.data.type)) {
        findings.push(finding(item, ['links', index, 'type'], 'link-type', `${type} ${link.type} ${targetEntry!.item.data.type}`));
      }
      if (!param) return; // CO-02.7
      if (param.parameter.value == null) findings.push({ ...finding(item, ['links', index, 'target'], 'tbd-source', link.target), severity: 'warning' });
      else if (link.type === 'derives-from' && list<Parameter>(item.data.parameters).some((p) => p.name === param.parameter.name && p.value != null && p.value !== param.parameter.value))
        findings.push(finding(item, ['links', index, 'target'], 'stale-value', link.target));
    });
  }
  // CO-02.2
  const metaFolder = join(repo.root, 'meta'),
    orphans = existsSync(metaFolder) ? readdirSync(metaFolder).filter((f) => f.endsWith('.yaml') && !repo.entries.has(f.slice(0, -5))) : [];
  for (const file of orphans) findings.push({ file: `meta/${file}`, line: 1, col: 1, severity: 'error', code: 'orphan', message: file });

  return [...findings, ...cycles(repo)];
}

// CO-02.2
function cycles(repo: Repo) {
  const state = new Map<string, 'open' | 'done'>(), findings: Finding[] = [],
    visit = (id: string) => {
    state.set(id, 'open');
    const entry = repo.entries.get(id)!;
    for (const child of childrenOf(entry)) {
      if (state.get(child) === 'open') findings.push(finding(entry.item, ['uses'], 'cycle', `${id} → ${child}`));
      else if (!state.has(child) && repo.entries.has(child)) visit(child);
    }
    state.set(id, 'done');
  };
  for (const id of repo.entries.keys()) if (!state.has(id)) visit(id);
  return findings;
}
