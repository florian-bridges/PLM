#!/usr/bin/env node
// CL-01.1
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command, CommanderError, Option } from 'commander';
import { stringify } from 'yaml';
import { changedFiles, impact } from './impact.ts';
import { addLink, confirm, coverage, linkStates, recordRun, suspects, type LinkState } from './links.ts';
import { artifacts, entry, loadRepo, newItem, Refused, UsageError, type Named } from './repo.ts';
import { results } from './schemas.ts';
import { search } from './search.ts';
import { validate } from './validate.ts';
import { currentVersions, git, snapshotAt } from './version.ts';

const program = new Command('plm')
  .option('-C, --repo <dir>', 'working folder', '.')
  .option('--format <format>', 'text or json', 'text')
  .exitOverride();
const workingFolder = (): string => program.opts().repo;
const openRepo = () => loadRepo(workingFolder());
// CL-01.1, TE-06.2
const scoped = (item?: string) => {
  const repo = openRepo();
  return [repo, linkStates(repo, currentVersions(repo)), item && entry(repo, item).id] as const;
};

// CL-05.1
function output(text: string, data: unknown) {
  const json = program.opts().format === 'json';
  console.log(json ? JSON.stringify({ schema: 3, data }, null, 2) : text);
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
  const found = entry(repo, id);
  const versions = currentVersions(repo);
  const links = linkStates(repo, versions).filter((state) => state.source === id || state.link.target === id);
  // CO-01.3
  const data = { ...found.item.data, version: versions.get(id), meta: found.meta.data, links, artifacts: artifacts(repo, found) };
  output(stringify(data, { aliasDuplicateObjects: false }), data);
});

program.command('link <source> <type> <target>').description('add an unconfirmed link')
  .action((source: string, type: string, target: string) => addLink(openRepo(), source, type, target));

// CO-03.2
program.command('search <query...>').description('search items, e.g. spar type:part').action((query: string[]) => {
  const found = search(openRepo(), query.join(' '));
  output(found.map(label).join('\n'), found);
});

// CL-01.2
program.command('confirm <source> [target]').description('confirm the link to target, or all links of an item').action((source: string, target?: string) => {
  const repo = openRepo();
  const links = confirm(repo, currentVersions(repo), validate(repo), source, target);
  output(links.map((link) => `confirmed ${source} ${link.type} ${link.target}`).join('\n'), links);
});

program.command('suspects [item]').description('list suspect and unconfirmed links').action((item?: string) => {
  const states = suspects(...scoped(item));
  output(states.map((state) => `${state.state} ${linkLabel(state)}`).join('\n'), states);
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
program.command('new <type> <title>').description('create an item in the current item folder').action((type: string, title: string) => {
  const id = newItem(openRepo(), type, title, workingFolder());
  output(id, { id });
});

// CL-03.1
program.command('test').command('record <test-case...>').description('record a test run')
  .requiredOption('--sut <id>')
  .addOption(new Option('--result <results...>').choices(results).makeOptionMandatory())
  .option('--log <files...>', '', [])
  .action((testCases: string[], options: { sut: string; result: string[]; log: string[] }) => {
    const id = recordRun(openRepo(), testCases, options.sut, options.result, options.log);
    output(id, { id });
  });

// TE-06.2
program.command('report').command('coverage [item]').description('report requirement verification')
  .action((item?: string) => {
    const rows = coverage(...scoped(item));
    const lines = rows.flatMap((row) => [[row.state, label({ id: row.requirement, title: row.title })],
      ...row.tests.map((test) => ['  ' + label(test.testCase), test.run && label(test.run), test.result, test.outdated && 'outdated'])]);
    output(lines.map((line) => line.filter(Boolean).join(' ')).join('\n'), rows);
    if (rows.some((row) => row.state !== 'verified')) exitCode = 1;
  });

try {
  program.parse();
  process.exitCode = exitCode;
} catch (error) {
  if (!(error instanceof CommanderError)) console.error((error as Error).message);
  process.exitCode = exitCodeFor(error);
}
