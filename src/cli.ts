#!/usr/bin/env node
// CL-01.1: the `plm` command-line program.
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { Command, CommanderError, Option } from 'commander';
import { Document, parseDocument, stringify } from 'yaml';
import { changedFiles, impact } from './impact.ts';
import { changeSince, confirm, coverage, fromRun, linkStates } from './links.ts';
import { entry, homeFolders, isRequirementFile, loadRepo, readYaml, Refused, UsageError, writeYaml, type Repo } from './repo.ts';
import { results } from './schemas.ts';
import { validate } from './validate.ts';
import { currentVersions, git, snapshotAt, versionAt } from './version.ts';

const program = new Command('plm')
  .option('-C, --repo <dir>', 'working folder', '.')
  .option('--format <format>', 'text or json', 'text')
  .exitOverride();
const workingFolder = (): string => program.opts().repo;
const openRepo = () => loadRepo(workingFolder());

// CL-05.1: JSON output carries a schema version.
function output(text: string, data: unknown) {
  const json = program.opts().format === 'json';
  console.log(json ? JSON.stringify({ schema: 1, data }, null, 2) : text);
}

// CL-05.2
let exitCode = 0;

function exitCodeFor(error: unknown): number {
  if (error instanceof CommanderError) return error.exitCode === 0 ? 0 : 2;
  if (error instanceof UsageError) return 2;
  if (error instanceof Refused) return 1;
  return 3;
}

program.command('validate').description('validate the repository').action(() => {
  const findings = validate(openRepo());
  const lines = findings.map((finding) => `${finding.file}:${finding.line}:${finding.col} ${finding.severity} ${finding.code}: ${finding.message}`);
  output(lines.join('\n'), findings);
  if (findings.some((finding) => finding.severity === 'error')) exitCode = 1;
});

program.command('show <id>').description('show an item, its version and links').action((id: string) => {
  const repo = openRepo();
  const { item, meta } = entry(repo, id);
  const versions = currentVersions(repo);
  const links = linkStates(repo, versions).filter((state) => state.source === id || state.link.target === id);
  const data = { ...item.data, version: versions.get(id), meta: meta.data, links };
  output(stringify(data, { aliasDuplicateObjects: false }), data);
});

program.command('link <source> <type> <target>').description('add an unconfirmed link').action((source: string, type: string, target: string) => {
  const repo = openRepo();
  const { meta } = entry(repo, source);
  if (meta.doc.hasIn(['links'])) meta.doc.addIn(['links'], { type, target });
  else meta.doc.setIn(['links'], [{ type, target }]);
  writeYaml(repo.root, meta);
});

// CL-01.2
program.command('confirm <source> [type] [target]').description('confirm links').action((source: string, type?: string, target?: string) => {
  const repo = openRepo();
  const links = confirm(repo, currentVersions(repo), validate(repo), source, type, target);
  output(links.map((link) => `confirmed ${source} ${link.type} ${link.target}`).join('\n'), links);
});

program.command('suspects').description('list suspect and unconfirmed links').option('--diff', 'show what changed').action(({ diff }) => {
  const repo = openRepo();
  const states = linkStates(repo, currentVersions(repo))
    .filter((state) => state.state !== 'current' && !fromRun(repo, state))
    .map((state) => (diff && state.state === 'suspect' ? { ...state, ...changeSince(repo, state.link) } : state));
  const lines = states.map((state) => {
    const change = 'diff' in state && state.diff ? `\n${state.diff}` : '';
    return `${state.state} ${state.source} ${state.link.type} ${state.link.target}${change}`;
  });
  output(lines.join('\n'), states);
  if (states.length) exitCode = 1;
});

// TE-05.1: impact of the changes from a base commit to a head commit or the working tree.
program.command('impact <range>').description('list items, links and test runs affected by a change').action((range: string) => {
  const repo = openRepo();
  const [base, head] = range.split('..');
  const headSnapshot = head ? snapshotAt(repo.root, head) : { repo, versions: currentVersions(repo) };
  const result = impact(snapshotAt(repo.root, base), headSnapshot, changedFiles(repo.root, base, head));
  const lines = [
    ...result.changed.map((id) => `changed ${id}`),
    ...result.propagated.map((id) => `propagated ${id}`),
    ...result.suspects.map((state) => `suspect ${state.source} ${state.link.type} ${state.link.target}`),
    ...result.runs.map((id) => `outdated run ${id}`),
  ];
  output(lines.join('\n'), result);
});

// CL-02.4: initialize a product repository.
program.command('init').description('create a product repository').action(() => {
  const root = workingFolder();
  if (existsSync(join(root, 'plm.yaml'))) throw new UsageError('plm.yaml already exists');
  mkdirSync(root, { recursive: true });
  git(root, ['init', '-q']);
  const prefixes = { requirement: 'REQ-', part: 'PRT-', assembly: 'ASM-', 'test-case': 'TC-', 'test-run': 'RUN-' };
  writeFileSync(join(root, 'plm.yaml'), stringify({ prefixes }));
});

// CL-02.1
program.command('new <type> [title]').description('create an item in the current item folder').action((type: string, title = '') => {
  const repo = openRepo();
  const here = relative(repo.root, resolve(workingFolder()));
  const contains = (folder: string) => here === folder || here.startsWith(`${folder}/`);
  // Parents load first, so the last match is innermost.
  const parent = [...repo.entries.values()].filter((candidate) => !isRequirementFile(candidate.path) && contains(candidate.path)).at(-1);
  if ((type === 'requirement' || type === 'test-case') && !parent) throw new UsageError(`Create ${type}s inside an item folder`);

  const id = newId(repo, type);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const name = slug ? `${id}-${slug}` : id;
  let folder = parent ? `${parent.path}/` : '';
  if (type === 'test-case') folder += `${homeFolders['test-case']}/`;

  const item = readYaml(repo.root, `templates/${type}.yaml`);
  item.path = type === 'requirement' ? `${folder}${homeFolders.requirement}/${name}.yaml` : `${folder}${name}/item.yaml`;
  for (const [key, value] of Object.entries({ id, type, title })) item.doc.setIn([key], value);
  writeYaml(repo.root, item);
  writeYaml(repo.root, { path: `meta/${id}.yaml`, doc: parseDocument('status: draft\n') });
  output(id, { id });
});

// CL-03.1, CL-03.2
program.command('test').command('record <test-case>').description('record a test run')
  .requiredOption('--sut <id>')
  .addOption(new Option('--result <result>').choices(results).makeOptionMandatory())
  .option('--log <files...>', '', [])
  .option('--commit <commit>', '', 'HEAD')
  .action((testCase: string, options: { sut: string; result: string; log: string[]; commit: string }) => {
    const repo = openRepo();
    const current = currentVersions(repo);
    const testedVersion = (id: string) => versionAt(repo.root, options.commit, entry(repo, id).id);
    const links = [
      { type: 'executes', target: testCase, version: testedVersion(testCase) },
      { type: 'tests', target: options.sut, version: testedVersion(options.sut) },
    ];
    // CL-03.3
    const changed = links.find((link) => link.version !== current.get(link.target));
    if (changed) throw new Refused(`${changed.target} differs from ${options.commit}; commit it first`);

    const id = newId(repo, 'test-run');
    const folder = `${homeFolders['test-run']}/${id}`;
    const item = { id, type: 'test-run', title: `${testCase} on ${options.sut}`, date: new Date().toISOString(), result: options.result };
    writeYaml(repo.root, { path: `${folder}/item.yaml`, doc: new Document(item) });
    writeYaml(repo.root, { path: `meta/${id}.yaml`, doc: new Document({ status: 'draft', links }) });
    for (const log of options.log) copyFileSync(log, join(repo.root, folder, basename(log)));
    output(id, { id });
  });

// TE-06.2: requirement coverage, optionally of one item's subtree.
program.command('report').command('coverage [item]').description('report requirement verification')
  .action((item: string | undefined) => {
    const repo = openRepo();
    const root = item ? entry(repo, item).id : undefined;
    const rows = coverage(repo, linkStates(repo, currentVersions(repo)), root);
    output(rows.map((row) => [row.state, row.requirement, row.run, ...(row.outdated ? ['outdated', ...row.outdated] : [])].filter(Boolean).join(' ')).join('\n'), rows);
    if (rows.some((row) => row.state !== 'verified')) exitCode = 1;
  });

// CL-02.2
function newId(repo: Repo, type: string): string {
  const prefix = repo.settings.prefixes?.[type];
  if (!prefix) throw new UsageError(`No ID prefix for type ${type} in plm.yaml`);
  const crockfordBase32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const characters = Array.from(randomBytes(6), (byte) => crockfordBase32[byte & 31]);
  return prefix + characters.join('');
}

try {
  program.parse();
  process.exitCode = exitCode;
} catch (error) {
  if (!(error instanceof CommanderError)) console.error((error as Error).message);
  process.exitCode = exitCodeFor(error);
}
