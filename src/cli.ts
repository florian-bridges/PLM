#!/usr/bin/env node
// CL-01.1: the `plm` command-line program.
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command, CommanderError } from 'commander';
import { parseDocument, stringify } from 'yaml';
import { changeSince, confirm, linkStates } from './links.ts';
import { entry, loadRepo, readYaml, Refused, UsageError, writeYaml, type Repo } from './repo.ts';
import { builtinTypes } from './schemas.ts';
import { validate } from './validate.ts';
import { currentVersions, git } from './version.ts';

const program = new Command('plm')
  .option('-C, --repo <dir>', 'repository root', '.')
  .option('--format <format>', 'text or json', 'text')
  .exitOverride();
const repo = () => loadRepo(program.opts().repo);

// CL-05.1: JSON output carries a schema version.
function output(text: string, data: unknown) {
  console.log(program.opts().format === 'json' ? JSON.stringify({ schema: 1, data }, null, 2) : text);
}

// CL-05.2: 0 success, 1 findings, 2 usage errors, 3 internal errors.
let exitCode = 0;

program.command('validate').description('validate the repository').action(() => {
  const findings = validate(repo());
  output(findings.map((f) => `${f.file}:${f.line}:${f.col} ${f.severity} ${f.code}: ${f.message}`).join('\n'), findings);
  if (findings.some((f) => f.severity === 'error')) exitCode = 1;
});

program.command('show <id>').description('show an item, its version and links').action((id: string) => {
  const r = repo();
  const { item, meta } = entry(r, id);
  const versions = currentVersions(r);
  const links = linkStates(r, versions).filter((s) => s.source === id || s.link.target === id);
  const data = { ...item.data, version: versions.get(id), meta: meta.data, links };
  output(stringify(data, { aliasDuplicateObjects: false }), data);
});

program.command('link <source> <type> <target>').description('add an unconfirmed link').action((source: string, type: string, target: string) => {
  const { meta } = entry(repo(), source);
  if (meta.doc.hasIn(['links'])) meta.doc.addIn(['links'], { type, target });
  else meta.doc.setIn(['links'], [{ type, target }]);
  writeYaml(program.opts().repo, meta);
});

// CL-01.2: confirm all links of the source unless a type or target is given.
program.command('confirm <source> [type] [target]').description('confirm links').action((source: string, type?: string, target?: string) => {
  const r = repo();
  const links = confirm(r, currentVersions(r), validate(r), source, type, target);
  output(links.map((l) => `confirmed ${source} ${l.type} ${l.target}`).join('\n'), links);
});

program.command('suspects').option('--diff', 'show what changed').description('list suspect and unconfirmed links').action(({ diff }) => {
  const r = repo();
  const states = linkStates(r, currentVersions(r)).filter((s) => s.state !== 'current')
    .map((s) => ({ ...s, ...(diff && s.state === 'suspect' ? changeSince(r, s.link) : {}) }));
  output(states.map((s) => `${s.state} ${s.source} ${s.link.type} ${s.link.target}${s.diff ? `\n${s.diff}` : ''}`).join('\n'), states);
  if (states.length) exitCode = 1;
});

// CL-02.4: initialize a product repository.
program.command('init').description('create a product repository').action(() => {
  const root = program.opts().repo;
  if (existsSync(join(root, 'plm.yaml'))) throw new UsageError('plm.yaml already exists');
  mkdirSync(root, { recursive: true });
  git(root, ['init', '-q']);
  const prefixes = { requirement: 'REQ-', specification: 'SPEC-', part: 'PRT-', assembly: 'ASM-', 'test-case': 'TC-' };
  writeFileSync(join(root, 'plm.yaml'), stringify({ prefixes }));
});

// CL-02.1: create item and meta files from a template.
program.command('new <type>').option('--title <title>', 'item title', '').description('create an item').action((type: string, { title }) => {
  const r = repo();
  if (!Object.hasOwn(builtinTypes, type) && !existsSync(join(r.root, 'schemas', `${type}.schema.json`))) throw new UsageError(`Unknown type ${type}`);
  const id = newId(r, type);
  const item = readYaml(r.root, `templates/${type}.yaml`);
  item.path = `items/${id}/item.yaml`;
  for (const [key, value] of Object.entries({ id, type, title })) item.doc.setIn([key], value);
  writeYaml(r.root, item);
  writeYaml(r.root, { ...item, path: `meta/${id}.yaml`, doc: parseDocument('status: draft\n') });
  output(id, { id });
});

// CL-02.2: type prefix plus six random Crockford Base32 characters.
function newId(r: Repo, type: string): string {
  const prefix = r.settings.prefixes?.[type];
  if (!prefix) throw new UsageError(`No ID prefix for type ${type} in plm.yaml`);
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  return prefix + Array.from(randomBytes(6), (b) => alphabet[b & 31]).join('');
}

try {
  program.parse();
  process.exitCode = exitCode;
} catch (e) {
  if (!(e instanceof CommanderError)) console.error((e as Error).message);
  process.exitCode = e instanceof CommanderError ? (e.exitCode && 2) : e instanceof UsageError ? 2 : e instanceof Refused ? 1 : 3;
}
