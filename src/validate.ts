import { dirname } from 'node:path';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import { childrenOf, citations, homeFolders, innermostItem, linksOf, list, parameterOf, readYaml, targetId, typeOf, usesOf, yamlIn, type Parameter, type Repo, type YamlFile } from './repo.ts';
import { baseSchema, builtinTypes, disallowed, type TypeDef } from './schemas.ts';

// CO-02.4
export interface Finding { file: string; line: number; col: number; severity: 'error' | 'warning'; code: string; message: string }

function finding(file: YamlFile<unknown>, path: (string | number)[], code: string, message: string): Finding {
  let node: any;
  for (let depth = path.length; depth > 0 && !node; depth--) node = file.doc.getIn(path.slice(0, depth), true);
  return { file: file.path, ...file.lines.linePos(node?.range?.[0] ?? 0), severity: 'error', code, message };
}

// CO-02.1, CO-02.8: meta is no item type
function schemaFor(ajv: Ajv2020, types: Record<string, TypeDef>, name: string, base?: object) {
  const def = Object.hasOwn(types, name) ? types[name] : undefined, own = { properties: def?.fields, required: def?.required };
  if (!def || (base && name === 'meta')) return undefined;
  if (!ajv.getSchema(name)) ajv.addSchema(base ? { allOf: [base, own], unevaluatedProperties: false } : own, name);
  return ajv.getSchema(name);
}

const newAjv = () => new Ajv2020({ allErrors: true, strictTypes: false });

// VS-01.2
export const itemSchema = (repo: Repo, type: string) => schemaFor(newAjv(), repo.types, type, baseSchema);

// CO-02.1, CO-02.4
function schemaFindings(file: YamlFile<unknown>, check: ValidateFunction, draft: boolean): Finding[] {
  check(file.data);
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
      validateSchema = schemaFor(ajv, repo.types, type, baseSchema), validateMeta = schemaFor(ajv, repo.types, 'meta'),
      // CO-02.2, CO-02.8
      folders = dirname(entry.path).split('/'), home = repo.types[type]?.folder,
      misplaced = home ? (typeOf(repo, type) === 'test-run' ? folders[0] !== home : !!innermostItem(repo, folders.join('/')) && !folders.includes(home)) : homeFolders(repo).some((folder) => folders.includes(folder));
    // CO-02.2
    for (const file of [item, meta]) for (const error of file.doc.errors) findings.push({ ...finding(file, [], 'yaml', error.code), ...error.linePos![0] });
    if (!validateSchema) findings.push(finding(item, ['type'], 'unknown-type', type)); // CO-02.8
    else findings.push(...schemaFindings(item, validateSchema, draft));
    // CO-02.1
    if (validateMeta) findings.push(...schemaFindings(meta, validateMeta, false));

    if (misplaced) findings.push(finding(item, ['type'], 'misplaced', `outside ${home}`));

    if (repo.duplicates.includes(entry)) findings.push(finding(item, ['id'], 'id-clash', id));

    usesOf(entry).forEach((used, index) => {
      if (!repo.entries.has(used)) findings.push(finding(item, ['uses', index], 'unknown-use', used));
    });

    // CO-02.7
    list<Parameter>(item.data.parameters).forEach((p, index) => {
      if (p.state && !states.includes(p.state)) findings.push(finding(item, ['parameters', index, 'state'], 'unknown-state', p.state));
    });
    for (const name of citations(item.data, true)) if (!parameterOf(repo, `${id}:${name}`)) findings.push(finding(item, ['text'], 'unknown-parameter', name));

    linksOf(entry).forEach((link, index) => {
      const param = parameterOf(repo, link.target), targetEntry = repo.entries.get(targetId(link.target)),
        atTarget = (code: string) => finding(item, item.doc.hasIn(['links', index]) ? ['links', index, 'target'] : ['text'], code, link.target);
      if (!targetEntry || (link.target.includes(':') && !param)) return void findings.push(atTarget('unknown-target'));
      const bad = disallowed(typeOf(repo, type), link.type, typeOf(repo, targetEntry.item.data.type)); // CO-02.8
      if (bad) findings.push(finding(item, ['links', index, 'type'], 'link-type', bad));
      if (!param) return; // CO-02.7
      if (param.parameter.value == null) findings.push({ ...atTarget('tbd-source'), severity: 'warning' });
      else if (link.type === 'derives-from' && list<Parameter>(item.data.parameters).some((p) => p.name === param.parameter.name && p.value != null && p.value !== param.parameter.value))
        findings.push(atTarget('stale-value'));
    });
  }
  // CO-02.2
  for (const file of yamlIn(repo.root, 'meta')) if (!repo.entries.has(file.slice(0, -5))) findings.push({ file: `meta/${file}`, line: 1, col: 1, severity: 'error', code: 'orphan', message: file });
  // CO-02.8
  for (const file of yamlIn(repo.root, 'types').map((f) => readYaml<TypeDef>(repo.root, `types/${f}`))) {
    for (const key of Object.keys(file.data)) if (!['base', 'prefix', 'folder', 'template', 'fields', 'required'].includes(key)) findings.push(finding(file, [key], 'type-file', key));
    const { base } = file.data;
    if (base && (!Object.hasOwn(builtinTypes, base) || Object.hasOwn(builtinTypes, file.path.slice(6, -5)) || file.data.folder)) findings.push(finding(file, ['base'], 'type-file', base));
  }

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
