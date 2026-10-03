#!/usr/bin/env node
// CL-01.1
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { Command, CommanderError, Option } from 'commander';
import { parseDocument, stringify } from 'yaml';
import { changedFiles, impact } from './impact.ts';
import { changeSince, confirm, coverage, fromRun, linkStates, recordRun, type LinkState } from './links.ts';
import { entry, homeFolders, isRequirementFile, loadRepo, nameFor, newId, readYaml, Refused, UsageError, writeYaml, type Named } from './repo.ts';
import { results } from './schemas.ts';
import { validate } from './validate.ts';
import { currentVersions, git, snapshotAt } from './version.ts';

const program = new Command('plm')
  .option('-C, --repo <dir>', 'working folder', '.')
  .option('--format <format>', 'text or json', 'text')
  .exitOverride();
const workingFolder = (): string => program.opts().repo;
const openRepo = () => loadRepo(workingFolder());

// CL-05.1
function output(text: string, data: unknown) {
  const json = program.opts().format === 'json';
  console.log(json ? JSON.stringify({ schema: 2, data }, null, 2) : text);
}

// CL-05.3
const label = ({ id, title }: Named) => (title ? `${id} (${title})` : id);
const linkLabel = (state: LinkState) => `${label({ id: state.source, title: state.title })} ${state.link.type} ${label({ id: state.link.target, title: state.targetTitle })}`;

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
program.command('confirm <source>').description('confirm all links of an item').action((source: string) => {
  const repo = openRepo();
  const links = confirm(repo, currentVersions(repo), validate(repo), source);
  output(links.map((link) => `confirmed ${source} ${link.type} ${link.target}`).join('\n'), links);
});

program.command('suspects').description('list suspect and unconfirmed links').option('--diff', 'show what changed').action(({ diff }) => {
  const repo = openRepo();
  const states = linkStates(repo, currentVersions(repo))
    .filter((state) => state.state !== 'current' && !fromRun(repo, state))
    .map((state) => (diff && state.state === 'suspect' ? { ...state, ...changeSince(repo, state.link) } : state));
  const lines = states.map((state) => {
    const change = 'diff' in state && state.diff ? `\n${state.diff}` : '';
    return `${state.state} ${linkLabel(state)}${change}`;
  });
  output(lines.join('\n'), states);
  if (states.length) exitCode = 1;
});

// TE-05.1
program.command('impact <range>').description('list items, links and test runs affected by a change').action((range: string) => {
  const repo = openRepo();
  const [base, head] = range.split('..');
  const headSnapshot = head ? snapshotAt(repo.root, head) : { repo, versions: currentVersions(repo) };
  const result = impact(snapshotAt(repo.root, base), headSnapshot, changedFiles(repo.root, base, head));
  const lines = [
    ...result.changed.map((item) => `changed ${label(item)}`),
    ...result.propagated.map((item) => `propagated ${label(item)}`),
    ...result.suspects.map((state) => `suspect ${linkLabel(state)}`),
    ...result.runs.map((run) => `outdated run ${label(run)}`),
  ];
  output(lines.join('\n'), result);
});

// CL-02.4
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
  const name = nameFor(id, title);
  let folder = parent ? `${parent.path}/` : '';
  if (type === 'test-case') folder += `${homeFolders['test-case']}/`;

  const item = readYaml(repo.root, `templates/${type}.yaml`);
  item.path = type === 'requirement' ? `${folder}${homeFolders.requirement}/${name}.yaml` : `${folder}${name}/item.yaml`;
  for (const [key, value] of Object.entries({ id, type, title })) item.doc.setIn([key], value);
  writeYaml(repo.root, item);
  writeYaml(repo.root, { path: `meta/${id}.yaml`, doc: parseDocument('status: draft\n') });
  output(id, { id });
});

// CL-02.5
program.command('rename <id> <title>').description('retitle an item and rename its folder or file').action((id: string, title: string) => {
  const repo = openRepo();
  const { item, path } = entry(repo, id);
  item.doc.setIn(['title'], title);
  writeYaml(repo.root, item);
  const name = nameFor(id, title) + (isRequirementFile(path) ? '.yaml' : '');
  renameSync(join(repo.root, path), join(repo.root, dirname(path), name));
});

// CL-03.1
program.command('test').command('record <test-case>').description('record a test run')
  .requiredOption('--sut <id>')
  .addOption(new Option('--result <result>').choices(results).makeOptionMandatory())
  .option('--log <files...>', '', [])
  .action((testCase: string, options: { sut: string; result: string; log: string[] }) => {
    const id = recordRun(openRepo(), testCase, options.sut, options.result, options.log);
    output(id, { id });
  });

// TE-06.2
program.command('report').command('coverage [item]').description('report requirement verification')
  .action((item: string | undefined) => {
    const repo = openRepo();
    const root = item ? entry(repo, item).id : undefined;
    const rows = coverage(repo, linkStates(repo, currentVersions(repo)), root);
        const line = (row: (typeof rows)[number]) => [row.state, label({ id: row.requirement, title: row.title }), row.run && label(row.run), ...(row.outdated ? ['outdated', ...row.outdated.map(label)] : [])];
    output(rows.map((row) => line(row).filter(Boolean).join(' ')).join('\n'), rows);
    if (rows.some((row) => row.state !== 'verified')) exitCode = 1;
  });

try {
  program.parse();
  process.exitCode = exitCode;
} catch (error) {
  if (!(error instanceof CommanderError)) console.error((error as Error).message);
  process.exitCode = exitCodeFor(error);
}
