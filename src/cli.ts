#!/usr/bin/env node
// CL-01.1
import { createRequire } from 'node:module';
import { Command, CommanderError, Option } from 'commander';
import { stringify } from 'yaml';
import { changedFiles, impact } from './impact.ts';
import { allocation, confirm, coverage, link, linkStates, recordRun, suspects, type LinkState } from './links.ts';
import { artifacts, entry, expanded, loadRepo, named, newItem, parameterOf, Refused, targetId, UsageError, writeYaml, type Entry, type Named, type Parameter, type Repo } from './repo.ts';
import { linkRules, results } from './schemas.ts';
import { list, search, setParameter } from './search.ts';
import { validate } from './validate.ts';
import { currentVersions, snapshotAt } from './version.ts';

const program = new Command('plm')
    .version(createRequire(import.meta.url)('../package.json').version)
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
const record = (repo: Repo, found: Entry) => ({ ...found.item.data, text: expanded(repo, found), path: found.path, meta: found.meta.data }),
  label = ({ id, title }: Named) => (title ? `${id} (${title})` : id),
  linkLabel = (state: LinkState) => `${label({ id: state.source, title: state.title })} ${state.link.type} ${label({ id: state.link.target, title: state.targetTitle })}`;

// CL-05.2
let exitCode = 0;

program.command('validate').description('check the repository').action(() => {
  const findings = validate(openRepo()),
    lines = findings.map((finding) => `${finding.file}:${finding.line}:${finding.col} ${finding.severity} ${finding.code}: ${finding.message}`);
  output(lines.join('\n'), findings);
  exitCode = +findings.some((finding) => finding.severity === 'error');
});

program.command('show <id>').description('show an item').action((id) => {
  const repo = openRepo(), found = entry(repo, id), versions = currentVersions(repo),
    // CO-01.3
    data = { ...record(repo, found), version: versions.get(id), links: linkStates(repo, versions, id), artifacts: artifacts(repo, found) };
  output(stringify(data, { aliasDuplicateObjects: false }), data);
});

program.command('link <source> <type> <target>').description('add a link')
  .option('--remove')
  .addHelpText('after', () => 'Links (* any type):\n' + Object.entries(linkRules).map(([type, [from, to]]) => `${from} ${type} ${to}`).join('\n'))
  .action((source, type, target, options) => link(openRepo(), source, type, target, options.remove));

// CL-01.3
program.command('set <ref> <field> <value>').description('write a field or parameter').action((ref, field, value) => {
  const repo = openRepo(), id = targetId(ref);
  if (id !== ref) return setParameter(repo, id, ref, field, value);
  const found = entry(repo, id), file = field === 'owner' || field === 'status' ? found.meta : found.item, current = (file.data as any)[field];
  if (current !== undefined && typeof current !== 'string') throw new UsageError(field);
  file.doc.setIn([field], value);
  writeYaml(repo.root, file);
});

// CL-01.4
program.command('get <ref> [key]').description('print a parameter').action((ref, key = 'value') => {
  const found = parameterOf(openRepo(), ref);
  if (!found || !['name', 'value', 'unit', 'state'].includes(key)) throw new UsageError(ref);
  const val = found.parameter[key as keyof Parameter];
  if (val == null) return void (exitCode = 1);
  output(String(val), val);
});

// CO-03.3, CL-01.1
program.command('list <field> [args...]').description('list entries of a field').action((field, args: string[] = []) => {
  const repo=openRepo(),item=args[0]?.includes(':')?undefined:args.shift(),
    matches = list(repo,field,item,args.map((f)=>f.split(/:(.*)/))),
    lines = matches.map((m) => `${label(named(repo, m.source))} ${Object.entries(m).slice(1).map((e) => e.join(':')).join(' ')}`);
  output(lines.join('\n'), matches);
  exitCode=matches.length&&1;
});

// CO-03.2
program.command('search <query...>').description('find items').action((query) => {
  const repo = openRepo(), found = search(repo, query.join(' ')).map((item) => record(repo, entry(repo, item.id)));
  output(found.map(label).join('\n'), found);
});

// CL-01.2
program.command('confirm <source> [target]').description('confirm links').action((source, target) => {
  const repo = openRepo(), links = confirm(repo, currentVersions(repo), validate(repo), source, target);
  output(links.map((link) => `confirmed ${source} ${link.type} ${link.target}`).join('\n'), links);
});

program.command('suspects [item]').description('list suspect links').action((item) => {
  const states = suspects(...scoped(item));
  output(states.map((state) => `${state.state} ${linkLabel(state)}`).join('\n'), states);
  exitCode = states.length && 1;
});

// TE-05.1
program.command('impact <range>').description('list a change\'s impact').action((range) => {
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

// CL-01.1, CL-02.1
program.command('new <type> <title>').description('create an item')
  .addHelpText('after', () => `Types: ${Object.keys(openRepo().types).filter((type) => type !== 'meta').join(' ')}`)
  .action((type, title) => {
  const created = newItem(openRepo(), type, title, workingFolder());
  output(created.id, created);
  if (program.opts().format !== 'json') console.error(created.path);
});

// CL-03.1
program.command('test').command('record <test-case...>').description('record a test run')
  .requiredOption('--sut <ids...>')
  .addOption(new Option('--result <results...>').choices(results).makeOptionMandatory())
  .option('--log <files...>', '', [])
  .action((testCases, options) => {
    const id = recordRun(openRepo(), testCases, options.sut, options.result, options.log);
    output(id, { id });
  });

// TE-06.2, TE-06.4
program.command('report').command('coverage [item]').description('report verification coverage')
  .option('--by <field>')
  .option('--allocation')
  .action((item, options) => {
    const state = scoped(item), alloc = options?.allocation,
      rows = alloc ? allocation(...state) : coverage(...state);
    if (alloc && options.by) throw new UsageError('--by');
    exitCode = +rows.some((row) => row.state !== (alloc ? 'allocated' : 'verified'));
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
    const lines = rows.flatMap((row) => [[row.state, label(named(state[0], row.requirement))],
      ...row.tests.map((test) => ['  ' + label(test.testCase), test.run && label(test.run), test.result, test.outdated && 'outdated'])]);
    output(lines.map((line) => line.filter(Boolean).join(' ')).join('\n'), rows);
  });

try {
  program.parse();
  process.exitCode = exitCode;
} catch (error) {
  if (error instanceof CommanderError) process.exitCode = error.exitCode && 2;
  else {
    console.error((error as Error).message);
    process.exitCode = error instanceof UsageError ? 2 : error instanceof Refused ? 1 : 3;
  }
}
