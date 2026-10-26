#!/usr/bin/env node
// CL-01.1
import { Command, CommanderError, Option } from 'commander';
import { stringify } from 'yaml';
import { changedFiles, impact } from './impact.ts';
import { allocation, confirm, coverage, link, linkStates, recordRun, suspects, type LinkState } from './links.ts';
import { artifacts, entry, loadRepo, newItem, Refused, UsageError, writeYaml, type Named } from './repo.ts';
import { results } from './schemas.ts';
import { entries, parseFilters, search } from './search.ts';
import { validate } from './validate.ts';
import { currentVersions, snapshotAt } from './version.ts';

const program = new Command('plm')
    .option('-C, --repo <dir>', '', '.')
    .option('--format <format>', '', 'text')
    .exitOverride(),
  workingFolder = () => program.opts().repo,
  openRepo = () => loadRepo(workingFolder());
// TE-06.2
const scoped = (item?: string) => {
  const repo = openRepo();
  return [repo, linkStates(repo, currentVersions(repo)), item && entry(repo, item).id] as const;
};

// CL-05.1
function output(text: string, data: unknown) {
  const json = program.opts().format === 'json';
  console.log(json ? JSON.stringify({ schema: 4, data }, null, 2) : text);
}

// CL-05.3
const record = (found: any) => ({ ...found.item.data, path: found.path, meta: found.meta.data }),
  label = ({ id, title }: Named) => (title ? `${id} (${title})` : id),
  linkLabel = (state: LinkState) => `${label({ id: state.source, title: state.title })} ${state.link.type} ${label({ id: state.link.target, title: state.targetTitle })}`;

// CL-05.2
let exitCode = 0;

const exitCodeFor = (error: unknown) =>
  error instanceof CommanderError ? (error.exitCode && 2) : error instanceof UsageError ? 2 : error instanceof Refused ? 1 : 3;

program.command('validate').description('check').action(() => {
  const findings = validate(openRepo()),
    lines = findings.map((finding) => `${finding.file}:${finding.line}:${finding.col} ${finding.severity} ${finding.code}: ${finding.message}`);
  output(lines.join('\n'), findings);
  if (findings.some((finding) => finding.severity === 'error')) exitCode = 1;
});

program.command('show <id>').description('details').action((id: string) => {
  const repo = openRepo(), found = entry(repo, id), versions = currentVersions(repo),
    links = linkStates(repo, versions).filter((state) => state.source === id || state.link.target === id),
    // CO-01.3, CO-03.3
    data = { ...record(found),version: versions.get(id),links,artifacts: artifacts(repo, found),entries: entries(repo, []).filter((m) => m.refers === id) };
  output(stringify(data, { aliasDuplicateObjects: false }), data);
});

program.command('link <source> <type> <target>').description('add')
  .option('--remove')
  .action((source: string, type: string, target: string, options: any) => link(openRepo(), source, type, target, options.remove));

// CL-01.3
program.command('set <id> <field> <value>').description('set').action((id: string, field: string, value: string) => {
  const repo = openRepo(), found = entry(repo, id), file = field === 'owner' || field === 'status' ? found.meta : found.item,
    current = (file.data as any)[field];
  if (current !== undefined && typeof current !== 'string') throw new UsageError(field);
  file.doc.setIn([field], value);
  writeYaml(repo.root, file);
});

// CO-03.2
program.command('search <query...>').description('find').action((query: string[]) => {
  const repo = openRepo(), found = search(repo, query.join(' ')).map((item) => record(entry(repo, item.id)));
  output(found.map(label).join('\n'), found);
});

// CL-01.2
program.command('confirm <source> [target]').description('confirm').action((source: string, target?: string) => {
  const repo = openRepo(), links = confirm(repo, currentVersions(repo), validate(repo), source, target);
  output(links.map((link) => `confirmed ${source} ${link.type} ${link.target}`).join('\n'), links);
});

program.command('suspects [item]').description('suspects').action((item?: string) => {
  const states = suspects(...scoped(item));
  output(states.map((state) => `${state.state} ${linkLabel(state)}`).join('\n'), states);
  if (states.length) exitCode = 1;
});

// TE-05.1
program.command('impact <range>').description('impact').action((range: string) => {
  const repo = openRepo(), [base, head] = range.split('..'),
    headSnapshot = head ? snapshotAt(repo.root, head) : { repo, versions: currentVersions(repo) },
    result = impact(snapshotAt(repo.root, base), headSnapshot, changedFiles(repo.root, base, head)),
    lines = [
      ...result.changed.map((item) => `changed ${label(item)}`),
      ...result.propagated.map((item) => `propagated ${label(item)}`),
      ...result.suspects.map((state) => `suspect ${linkLabel(state)}`),
      ...result.runs.map((run) => `outdated run ${label(run)}`),
    ];
  output(lines.join('\n'), result);
});

// CL-02.1
program.command('new <type> <title>').description('create').action((type: string, title: string) => {
  const id = newItem(openRepo(), type, title, workingFolder());
  output(id, { id });
});

// CL-03.1
program.command('test').command('record <test-case...>').description('record')
  .requiredOption('--sut <id>')
  .addOption(new Option('--result <results...>').choices(results).makeOptionMandatory())
  .option('--log <files...>', '', [])
  .action((testCases: string[], options: { sut: string; result: string[]; log: string[] }) => {
    const id = recordRun(openRepo(), testCases, options.sut, options.result, options.log);
    output(id, { id });
  });

const report = program.command('report');

// TE-06.2, TE-06.4
report.command('coverage [item]').description('coverage')
  .option('--by <field>')
  .option('--allocation')
  .action((item?: string, options?: any) => {
    const state = scoped(item), alloc = options?.allocation,
      rows = alloc ? allocation(...state) : coverage(...state);
    if (alloc && options.by) throw new UsageError('--by');
    if (rows.some((row) => row.state !== (alloc ? 'allocated' : 'verified'))) exitCode = 1;
    if (options?.by) {
      // TE-06.3
      const groups: Record<string, any> = {};
      rows.forEach((row) => {
        const value = String(entry(state[0], row.requirement).item.data[options.by] ?? ''),
          g = groups[value] ??= { value, verified: 0, pending: 0, unverified: 0, total: 0 };
        g[row.state]++; g.total++;
      });
      return output(Object.values(groups).map((g) => Object.entries(g).flat().slice(1).join(' ')).join('\n'), Object.values(groups));
    }
    const lines = rows.flatMap((row) => [[row.state, label({ id: row.requirement, title: row.title })],
      ...row.tests.map((test) => ['  ' + label(test.testCase), test.run && label(test.run), test.result, test.outdated && 'outdated'])]);
    output(lines.map((line) => line.filter(Boolean).join(' ')).join('\n'), rows);
  });

// CO-03.3, CL-01.1
report.command('entries [args...]').description('entries').action((args: string[] = []) => {
  const { filters,text } = parseFilters(args.join(' ')),
    [repo, , id] = scoped(text),matches = entries(repo, filters, id),
    lines = matches.map((m) => Object.entries(m).map((e) => e.join(':')).join(' '));
  output(lines.join('\n'),matches);
  if (matches.length) exitCode = 1;
});

try {
  program.parse();
  process.exitCode = exitCode;
} catch (error) {
  if (!(error instanceof CommanderError)) console.error((error as Error).message);
  process.exitCode = exitCodeFor(error);
}
