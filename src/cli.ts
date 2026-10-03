#!/usr/bin/env node
// CL-01.1: the `plm` command-line program.
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { Command, CommanderError, Option } from 'commander';
import { Document, parseDocument, stringify } from 'yaml';
import { changeSince, confirm, coverage, linkStates } from './links.ts';
import { entry, loadRepo, readYaml, Refused, UsageError, writeYaml, type Repo } from './repo.ts';
import { results } from './schemas.ts';
import { validate } from './validate.ts';
import { currentVersions, git, versionAt } from './version.ts';

const program = new Command('plm')
  .option('-C, --repo <dir>', 'working folder', '.')
  .option('--format <format>', 'text or json', 'text')
  .exitOverride();
const repo = () => loadRepo(program.opts().repo);

// CL-05.1: JSON output carries a schema version.
function output(text: string, data: unknown) {
  console.log(program.opts().format === 'json' ? JSON.stringify({ schema: 1, data }, null, 2) : text);
}

// CL-05.2
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
  const r = repo();
  const { meta } = entry(r, source);
  if (meta.doc.hasIn(['links'])) meta.doc.addIn(['links'], { type, target });
  else meta.doc.setIn(['links'], [{ type, target }]);
  writeYaml(r.root, meta);
});

// CL-01.2
program.command('confirm <source> [type] [target]').description('confirm links').action((source: string, type?: string, target?: string) => {
  const r = repo();
  const links = confirm(r, currentVersions(r), validate(r), source, type, target);
  output(links.map((l) => `confirmed ${source} ${l.type} ${l.target}`).join('\n'), links);
});

program.command('suspects').description('list suspect and unconfirmed links').option('--diff', 'show what changed').action(({ diff }) => {
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
  const prefixes = { requirement: 'REQ-', part: 'PRT-', assembly: 'ASM-', 'test-case': 'TC-', 'test-run': 'RUN-' };
  writeFileSync(join(root, 'plm.yaml'), stringify({ prefixes }));
});

// CL-02.1
program.command('new <type> [title]').description('create an item in the current item folder').action((type: string, title = '') => {
  const r = repo();
  const here = relative(r.root, resolve(program.opts().repo));
  // Parents load first, so the last match is innermost.
  const parent = [...r.entries.values()].filter((e) => !e.path.endsWith('.yaml') && (here === e.path || here.startsWith(`${e.path}/`))).at(-1);
  const id = newId(r, type);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const name = slug ? `${id}-${slug}` : id;
  const folder = type === 'test-case' ? 'tests/' : parent ? `${parent.path}/` : '';
  if (type === 'requirement' && !parent) throw new UsageError('Create requirements inside an item folder');
  const item = readYaml(r.root, `templates/${type}.yaml`);
  item.path = type === 'requirement' ? `${folder}requirements/${name}.yaml` : `${folder}${name}/item.yaml`;
  for (const [key, value] of Object.entries({ id, type, title })) item.doc.setIn([key], value);
  writeYaml(r.root, item);
  writeYaml(r.root, { ...item, path: `meta/${id}.yaml`, doc: parseDocument('status: draft\n') });
  output(id, { id });
});

// CL-03.1, CL-03.2
program.command('test').command('record <test-case>').description('record a test run')
  .requiredOption('--sut <id>')
  .addOption(new Option('--result <result>').choices(results).makeOptionMandatory())
  .option('--log <files...>', '', [])
  .option('--commit <commit>', '', 'HEAD')
  .action((testCase: string, o) => {
    const r = repo();
    const current = currentVersions(r);
    const links = [['executes', testCase], ['tests', o.sut]].map(([type, target]) => ({ type, target, version: versionAt(r.root, o.commit, entry(r, target).id) }));
    // CL-03.3
    for (const l of links) if (l.version !== current.get(l.target)) throw new Refused(`${l.target} differs from ${o.commit}; commit it first`);
    const id = newId(r, 'test-run');
    const item = { id, type: 'test-run', title: `${testCase} on ${o.sut}`, date: new Date().toISOString(), result: o.result };
    writeYaml(r.root, { path: `runs/${id}/item.yaml`, doc: new Document(item) });
    writeYaml(r.root, { path: `meta/${id}.yaml`, doc: new Document({ status: 'draft', links }) });
    for (const log of o.log) copyFileSync(log, join(r.root, 'runs', id, basename(log)));
    output(id, { id });
  });

// TE-06.2: requirement coverage, optionally of one item's subtree.
program.command('report').command('coverage [item]').description('report requirement verification').action((item?: string) => {
  const r = repo();
  const rows = coverage(r, linkStates(r, currentVersions(r)), item && entry(r, item).id);
  output(rows.map((c) => `${c.state} ${c.requirement}${c.run ? ` ${c.run}` : ''}`).join('\n'), rows);
  if (rows.some((c) => c.state !== 'verified')) exitCode = 1;
});

// CL-02.2
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
