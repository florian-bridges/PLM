#!/usr/bin/env node
// CL-01.1
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Command, CommanderError, Option } from 'commander';
import { parse as parseYaml, stringify } from 'yaml';
import { changedFiles, impact } from './impact.ts';
import { allocation, confirm, connections, coverage, link, linkStates, recordRun, requirementsMarkdown, suspects, unreached, type LinkState } from './links.ts';
import { artifacts, entry, expanded, journalFiles, journalOff, journalOn, loadRepo, named, newItem, parameterOf, partsOf, productTree, parentOf, Refused, rollback, setConfig, targetId, UsageError, usesOf, walk, writeYaml, type Entry, type Named, type Parameter, type Repo } from './repo.ts';
import { allowedLinks, results } from './schemas.ts';
import { list, search, setParameter } from './search.ts';
import { validate } from './validate.ts';
import { currentVersions, snapshotAt } from './version.ts';

const program = new Command('plm')
    .version(createRequire(import.meta.url)('../package.json').version)
    .option('-C, --repo <dir>', '', '.')
    .option('--format <format>', '', 'text')
    .option('--config <config>', '')
    .exitOverride(),
  workingFolder = () => program.opts().repo,
  openRepo = () => loadRepo(workingFolder());
// TE-06.2, CO-01.6
const scoped = (item?: string) => {
  const repo = openRepo();
  setConfig(repo, program.opts().config);
  return [repo, linkStates(repo, currentVersions(repo)), item && entry(repo, item).id] as const;
};

// CL-05.1
function output(text: string, data: unknown, json = program.opts().format === 'json') {
  console.log(json ? JSON.stringify({ schema: 4, data }, null, 2) : text);
}

// CL-05.3
const record = (repo: Repo, found: Entry) => ({ ...found.item.data, text: expanded(repo, found), path: found.path, meta: found.meta.data }),
  label = ({ id, title }: Named) => (title ? `${id} (${title})` : id),
  linkLabel = (state: LinkState) => `${label({ id: state.source, title: state.title })} ${state.link.type} ${label({ id: state.link.target, title: state.targetTitle })}`;

// CL-01.10
const stateColor = { current: 'green', suspect: 'orange', unconfirmed: 'red' };
function mermaid(repo: Repo, ids: Set<string>) {
  const edges = [...ids].flatMap((i) => [[parentOf(repo, i), 'nesting', i], ...usesOf(repo.entries.get(i)?.item.data).map((u) => [i, 'uses', u])])
    .concat(linkStates(repo, currentVersions(repo)).map((s) => [s.source, s.link.type, targetId(s.link.target), stateColor[s.state]]))
    .filter(([a, , b]) => ids.has(a) && ids.has(b));
  return ['graph TD', ...[...ids].map((i) => `  ${i}["${label(named(repo, i)).replaceAll('"', '#quot;')}"]`), ...edges.map(([a, t, b]) => `  ${a} -->|${t}| ${b}`),
    ...edges.map(([, , , c], n) => c && `linkStyle ${n} stroke:${c}`).filter(Boolean)].join('\n');
}

// CL-05.2
let exitCode = 0;

program.command('validate').description('check the repository').action(() => {
  const findings = validate(openRepo()),
    lines = findings.map((finding) => `${finding.file}:${finding.line}:${finding.col} ${finding.severity} ${finding.code}: ${finding.message}`);
  output(lines.join('\n'), findings);
  exitCode = +findings.some((finding) => finding.severity === 'error');
});

// CL-01.5, CO-01.6
program.command('show <id>').description('show an item')
  .option('--down <n>').option('--up <n>')
  .action((id, options) => {
    const repo = openRepo(), found = entry(repo, id), steps = options.down ?? options.up;
    if (steps !== undefined) {
      setConfig(repo, program.opts().config);
      const reached = walk(repo, id, options.down !== undefined, Number(steps)), rows = reached.filter((w) => w.depth)
        .map((w) => ({ ...named(repo, w.id), depth: w.depth, via: w.via }));
      if (program.opts().format === 'mermaid') return output(mermaid(repo, new Set(reached.map((w) => w.id))), null);
      return output(rows.map((w) => `${w.depth} ${w.via} ${label(w)}`).join('\n'), rows);
    }
    const versions = currentVersions(repo),
      data = {
        ...record(repo, found), version: versions.get(id), parent: parentOf(repo, id),
        requirements: found.requirements.map((r) => ({ ...named(repo, r), links: linkStates(repo, versions, r) })),
        links: linkStates(repo, versions, id), artifacts: artifacts(repo, found),
      };
    output(stringify(data, { aliasDuplicateObjects: false }), data);
  });

program.command('link <source> <type> <target>').description('add a link')
  .option('--remove')
  .action((source, type, target, options) => link(openRepo(), source, type, target, options.remove));

// CL-05.4
program.command('types').description('print the type and link schema').action(() => {
  const repo = openRepo(), types = Object.fromEntries(Object.entries(repo.types).filter(([name]) => name !== 'meta')),
    links = allowedLinks(repo),
    lines = [
      ...Object.entries(types).map(([name, t]) => `${name}${t.base ? ` (${t.base})` : ''} ${t.prefix ?? ''} ${t.folder ?? ''} fields:${Object.keys(t.fields ?? {})} required:${t.required ?? ''}`),
      ...Object.entries(links).map(([type, [from, to]]) => `${from} ${type} ${to}`),
    ];
  output(lines.join('\n'), { types, links });
});

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

// CL-01.2, TE-02.2
program.command('confirm <source> [target]').description('confirm links').option('--reason <text>').action((source, target, options) => {
  const repo = openRepo(), links = confirm(repo, currentVersions(repo), validate(repo), source, target, options.reason);
  output(links.map((link) => `confirmed ${source} ${link.type} ${link.target}`).join('\n'), links);
});

program.command('suspects [item]').description('list suspect links').action((item) => {
  const states = suspects(...scoped(item));
  output(states.map((state) => `${state.state} ${linkLabel(state)}`).join('\n'), states);
  exitCode = states.length && 1;
});

// TE-05.1, TE-05.3, TE-05.4
program.command('impact <range>').description('list a change\'s impact').action((range) => {
  const repo = openRepo(), [base, head] = range.split('..'),
    headSnapshot = head ? snapshotAt(repo.root, head) : { repo, versions: currentVersions(repo) },
    result = impact(snapshotAt(repo.root, base), headSnapshot, changedFiles(repo.root, base, head)),
    lines = [
      ...result.changed.map((item) => `changed ${label(item)}`),
      ...result.propagated.map((item) => `propagated ${label(item)}`),
      ...result.released.map((item) => `released ${label(item)}`),
      ...result.suspects.map((state) => `suspect ${linkLabel(state)}`),
      ...result.runs.map((run) => `outdated run ${label(run)}`),
      ...result.uses.map((u) => `uses ${u.status} ${label(u.uses)} ${u.status === 'removed' ? 'from' : 'to'} ${label(u)}`),
    ];
  output(lines.join('\n'), result);
  exitCode = result.released.length && 1;
});

// CL-02.1
program.command('new <type> <title>').description('create an item')
  .action((type, title) => {
  const created = newItem(openRepo(), type, title, workingFolder());
  output(created.id, created);
  if (program.opts().format !== 'json') console.error(created.path);
});

// CL-01.6
const splitLine=(line: string)=>[...line.matchAll(/"[^"]*"|'[^']*'|\S+/g)].map((m)=>m[0].replace(/^['"]|['"]$/g,'')),
  errorKeys=(repo: Repo)=>validate(repo).filter((f)=>f.severity==='error').map((f)=>`${f.file}:${f.code}:${f.message}`);

program.command('apply <file>').description('run related commands all or nothing, with a dry run').option('--dry-run').action((file,options)=>{
    const root=workingFolder(),json=program.opts().format==='json',
      lines=parseYaml(readFileSync(file,'utf8')) as string[],before=errorKeys(openRepo()),ids:string[]=[],texts:string[]=[];
    journalOn();
    try {
      for(const raw of lines) {
        const line=raw.replace(/\$(\d+)/g,(m: string,n: string)=>ids[+n-1]??m),args=splitLine(line),log=console.log,cerr=console.error;
        let text='';
        console.log=console.error=(s: string)=>{text+=`${s}\n`;};
        exitCode=0;
        try {
          if(!['new','set','link','confirm'].includes(args[0])) throw new UsageError(args[0]);
          program.parse(['-C',root,...args],{from:'user'});
        } catch(e) {exitCode=1;text+=`${String(e)}\n`;}
        console.log=log;console.error=cerr;
        texts.push(`${line}\n${text}`.trimEnd());
        ids.push(text.split('\n')[0]);
        if(exitCode||errorKeys(openRepo()).some((e)=>!before.includes(e))) {exitCode=1;break;}
      }
    } finally {
      const written=journalFiles();
      if(exitCode||options.dryRun) rollback(root);
      journalOff();
      output([...texts,`files: ${written.join(' ')}`].join('\n'),{commands:texts,files:written},json);
    }
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

// TE-06.2, TE-06.4, TE-06.5
const report = program.command('report');
report.command('coverage [item]').description('report verification coverage')
  .option('--by <field>')
  .option('--allocation')
  .option('--link <type>')
  .action((item, options) => {
    const state = scoped(item);
    if (options.link) {
      const rows = unreached(state[0], state[1], options.link, state[2]);
      exitCode = rows.length && 1;
      return output(rows.map(label).join('\n'), rows);
    }
    const alloc = options?.allocation,
      rows = alloc ? allocation(...state) : coverage(...state);
    if (alloc && options.by) throw new UsageError('--by');
    exitCode = +rows.some((row) => alloc ? row.state === 'unallocated' : row.state !== 'verified');
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

// TE-06.6
report.command('connections [item]').description('report ports and connections that do not fit')
  .action((item) => {
    const rows = connections(...scoped(item));
    exitCode = rows.length && 1;
    output(rows.map((row) => `${row.code} ${label(row.item)}${row.detail && ' ' + row.detail}`).join('\n'), rows);
  });

// CO-03.4, CO-01.6
report.command('parts [item]').description('report item totals').action((item) => {
  const repo = openRepo();
  setConfig(repo, program.opts().config);
  const rows = partsOf(repo, item && entry(repo, item).id);
  output(rows.map((r) => `${label(r)} ${r.quantity}`).join('\n'), rows);
});

// CL-01.8
report.command('document [item]').description('print the requirements document').action((item) => {
  const [repo, states, id] = scoped(item);
  const text = (id ? [id] : productTree(repo).map((found) => found.id))
    .map((root) => requirementsMarkdown(repo, root, (found) => found.item.path, states, coverage(repo, states, root), suspects(repo, states, root))).join('\n');
  output(text, text);
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
