# Ports, Connections and YAML Type Definitions — Implementation Plan

> **For agentic workers:** this repository's `CLAUDE.md` governs execution and overrides generic plan skills. Per phase: `requirements-author` and `quality` first, then `implementer` agents per stream in their own worktrees, merge and commit stream by stream, `quality` final pass. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A project defines its item types in YAML, declares the ports of its items, joins them into connections, and gets a report of open or inconsistent interfaces.

**Architecture:** `types/<type>.yaml` replaces `schemas/*.schema.json`, `templates/*.yaml` and `prefixes`/`folders` in `plm.yaml`. `port` and `connection` become built-in types with a `connects` link, so loading, versions, suspects and impact apply unchanged. One new report, `plm report connections`, holds every interface finding.

**Tech stack:** TypeScript on Node.js 22, Commander, Ajv 2020-12, `yaml`, Vitest. No new dependency.

**Concept:** [multi-discipline.md](multi-discipline.md), examples in [multi-discipline-walkthrough.md](multi-discipline-walkthrough.md).

---

## Issues

The work is split into self-contained GitHub issues, each leaving a working version:

| Issue | Content | Plan phase |
|---|---|---|
| #26 | Type files replace JSON schemas and template files | 1 |
| #27 | Prefix and home folder in the type file, built-in defaults | 1 |
| #28 | A project type based on a built-in type (`base`) | 1 |
| #29 | Built-in `port` and `connection`, `connects` link | 2 |
| #30 | Directed port types, `role` | 2 |
| #31 | `plm report connections` | 3 |
| #32 | End-to-end check and release 0.3.0 | 4 |

## Findings from the code that change the concept

1. **One shape per type already holds** (concept decision 7). `loadRepo` reads a requirement only as `<name>.yaml` and every other item only as `<name>/item.yaml` (`src/repo.ts:54-72`), and `newItem` writes the same (`src/repo.ts:135`). No code change; only CO-01.1's wording is tightened in Phase 1.
2. **`plm show` already lists incoming links** (concept addition 4): it calls `linkStates(repo, versions, id)`, which keeps links whose target is `id` (`src/links.ts:38`). No CLI work. The extension is left as it is; its word limit (1659, 23 free) was not raised.
3. **A home folder is transparent to the loader**, so a port in `<unit>/ports/` is a nested item of the unit: a port change also changes the unit's version. Wanted, and free.

## Conventions for every phase

- Requirements first, then code and test together, each tagged with its ID (`// CO-02.8`, `test('CO-02.8: ...')`).
- Check before every commit:
  ```sh
  npm test && npm run typecheck
  python3 scripts/wordcount.py --max-docs 10000 --max-src 10000 --max-ext 1659 -u
  ```
  Expected: all tests pass, no `LIMIT EXCEEDED`.
- Commit messages carry no Claude attribution.
- Requirement wording below is a draft for `requirements-author`, who shortens it and merges it into the existing sentences. New IDs were checked unused in `git log -S`: US-12, CR-20, CO-02.8, CO-02.9, TE-07, TE-07.1.

## File map

| File | Phase | Change |
|---|---|---|
| `src/schemas.ts` | 1, 2 | `TypeDef`, built-in types with prefix, folder, fields; `typeFileSchema`; link rules |
| `src/repo.ts` | 1 | load `types/*.yaml`; `typeOf`, `baseOf`, `homeFolders`; `newId`, `newItem` use them |
| `src/validate.ts` | 1, 2 | schema from `typeOf`; `type-file` findings; role rule |
| `src/links.ts`, `src/version.ts`, `src/impact.ts`, `src/search.ts` | 1 | literal type comparisons go through `baseOf` |
| `src/cli.ts` | 1, 3 | `new --help` lists types; `report connections` |
| `src/connections.ts` (new) | 3 | `connectionReport` |
| `extension/src/extension.ts:95` | 1 | type picker reads `repo.types` |
| `test/plm.test.ts` | 1–3 | fixture without `prefixes`; three new tests |
| `documents/*.md`, `README.md`, `CHANGELOG.md`, `package.json` | 1–4 | requirements, configuration section, 0.3.0 |

---

## Phase 0: Finish `feat/parameter-references`

Uncommitted work for issue #19 is in `src/cli.ts`, `src/repo.ts`, `src/validate.ts`, `src/version.ts`, `test/plm.test.ts`; `npm test` passes (18 tests).

- [ ] **0.1** Run the checks above. Expected: pass; `src/` + `test/` 4658 / 10000.
- [ ] **0.2** `quality` reviews the diff for traceability.
- [ ] **0.3** Commit the five files and `CLAUDE.md` (word limits) separately; leave `test_products/` and `concepts/` untracked unless the user says otherwise.
- [ ] **0.4** Merge into `main` by the user's usual route; branch `feat/ports-and-connections` from it.

---

## Phase 1: Type definitions in `types/<type>.yaml`

Breaking: `schemas/`, `templates/`, `prefixes` and `folders` are no longer read.

### 1a. Requirements (`requirements-author` with `quality`)

- [ ] **CO-02.8 (new, refines CO-02):** A type shall be built in or defined by `types/<type>.yaml` with optional `base` (a built-in type whose behaviour, link rules, prefix, home folder and fields it takes), `prefix`, `folder` (only without `base`), `template`, `fields` (JSON Schema properties) and `required`; a file named after a built-in type extends it. The core shall report as error `type-file` a type file that has other keys or an unknown `base`. `types/meta.yaml` gives the fields of `meta/<ID>.yaml`.
- [ ] **CO-02.5 (changed):** built-in types with their default prefix and home folder: `requirement` `REQ-` `requirements`, `test-case` `TC-` `tests`, `test-run` `RUN-` `runs`, `part` `PRT-`, `assembly` `ASM-`.
- [ ] **CO-02.1 (changed):** validate against the schema composed from the type's `fields` and `required` (CO-02.8); drop `schemas/<type>.schema.json` and `schemas/meta.schema.json`.
- [ ] **CO-01.1 (changed):** drop `folders:` from `plm.yaml`; home folders come from CO-02.5 and CO-02.8; state that a requirement is `<home>/<name>.yaml` and any other item `<name>/item.yaml`.
- [ ] **CL-02.1 (changed):** create from the type's `template` (CO-02.8); drop `templates/<type>.yaml`.
- [ ] **CL-02.2 (changed):** prefix from the type (CO-02.5, CO-02.8).
- [ ] **CL-01.1 (changed):** `new --help` lists all types.
- [ ] `architecture.md` repository layout: add `types/<type>.yaml`. `README.md` Configuration: rewrite for `types/`, with a migration paragraph (step 1c).
- [ ] Commit `documents/` and `README.md`: `documents: project types in types/<type>.yaml (CO-02.8)`.

### 1b. Code and tests (one `implementer`, stream `types`; files: all of `src/`, `test/plm.test.ts`, `extension/src/extension.ts`)

- [ ] **Step 1: Write the failing test** in `test/plm.test.ts`, and change the `beforeEach` fixture's `plm.yaml` to an empty file (the defaults replace `prefixes`).

```ts
test('CO-02.1, CO-02.5, CO-02.8, CL-02.1–CL-02.2: types', () => {
  write(root, {
    'types/part.yaml': 'fields:\n  finish: {type: string}\n',
    'types/bracket.yaml': 'base: part\nprefix: BRK-\ntemplate: {material: steel}\nfields:\n  holes: {type: integer}\nrequired: [holes]\n',
    'types/study.yaml': 'prefix: STU-\nfolder: studies\n',
    'types/meta.yaml': 'fields:\n  status: {enum: [draft, released]}\n',
    'types/bad.yaml': 'base: nothing\ncolour: red\n',
    'bolt/item.yaml': `${bolt}finish: zinc\n`,
  });
  const created = json(root, 'new', 'bracket', 'Hinge'), study = json(root, '-C', `${root}/wing`, 'new', 'study', 'Flutter');
  expect(created.id).toMatch(/^BRK-[0-9A-Z]{6}$/);
  expect(readFileSync(join(root, created.path), 'utf8')).toContain('material: steel');
  expect(study.path).toBe('wing/studies/flutter/item.yaml');
  expect(json(root, 'new', 'part', 'Rib').id).toMatch(/^PRT-/);
  write(root, { 'meta/L.yaml': 'status: lost\n' });
  expect(validate(loadRepo(root)).map((f) => `${f.file} ${f.code} ${f.severity}`).sort()).toEqual([
    `${created.path} schema warning`,          // holes required, item is draft
    'meta/L.yaml schema error',
    'types/bad.yaml type-file error',          // unknown key
    'types/bad.yaml type-file error',          // unknown base
  ]);
  expect(plm(root, 'new', 'gadget', 'X').status).toBe(2);
});
```

- [ ] **Step 2:** `npx vitest run -t types`. Expected: FAIL (`No prefix for bracket`).

- [ ] **Step 3: `src/schemas.ts`** — replace `builtinTypes` and add the type-file schema.

```ts
// CO-02.5, CO-02.8
export interface TypeDef { base?: string; prefix?: string; folder?: string; directed?: boolean; template?: Record<string, unknown>; fields?: Record<string, object>; required?: string[] }
export const builtinTypes: Record<string, TypeDef> = {
  requirement: { prefix: 'REQ-', folder: 'requirements' },
  part: { prefix: 'PRT-', fields: { part_number: str, material: str, mass_kg: { type: 'number' } } },
  assembly: { prefix: 'ASM-', fields: { part_number: str } },
  'test-case': { prefix: 'TC-', folder: 'tests', fields: { procedure: str } },
  'test-run': { prefix: 'RUN-', folder: 'runs', fields: { date: str } },
};
// CO-02.8
export const typeFileSchema = {
  type: 'object', additionalProperties: false,
  properties: { base: { enum: Object.keys(builtinTypes) }, prefix: str, folder: str, directed: { type: 'boolean' }, template: { type: 'object' }, fields: { type: 'object' }, required: { type: 'array', items: str } },
};
```

- [ ] **Step 4: `src/repo.ts`** — `Settings` loses `prefixes` and `folders`; `Repo` gains `types` and `typeFiles`.

```ts
// CO-02.8
export interface Repo { root: string; settings: Settings; entries: Map<string, Entry>; duplicates: Entry[]; types: Record<string, TypeDef>; typeFiles: YamlFile<TypeDef>[] }

function loadTypes(root: string) {
  const folder = join(root, 'types'),
    typeFiles = (existsSync(folder) ? readdirSync(folder) : []).filter((f) => f.endsWith('.yaml')).map((f) => readYaml<TypeDef>(root, `types/${f}`)),
    own = (type: string, file?: TypeDef): TypeDef => ({ ...builtinTypes[type], ...file, fields: { ...builtinTypes[type]?.fields, ...file?.fields } }),
    types = Object.fromEntries([...Object.keys(builtinTypes).map((t) => [t, own(t)]), ...typeFiles.map((f) => [basename(f.path, '.yaml'), own(basename(f.path, '.yaml'), f.data)])]);
  return { types, typeFiles };
}
// CO-02.8: a type with its base's prefix, folder, fields and required merged in
export const typeOf = (repo: Repo, type: string): TypeDef | undefined => {
  const def = repo.types[type], base = def?.base ? repo.types[def.base] : undefined;
  return def && { ...base, ...def, fields: { ...base?.fields, ...def.fields }, required: [...(base?.required ?? []), ...(def.required ?? [])] };
};
export const baseOf = (repo: Repo, type: unknown) => repo.types[String(type)]?.base ?? String(type);
export const homeFolders = (repo: Repo) => [...new Set(Object.keys(repo.types).map((t) => typeOf(repo, t)!.folder).filter(Boolean))] as string[];
```

In `loadRepo`: spread `...loadTypes(root)` into `repo`, delete the `repo.settings.folders = …` line, and replace `repo.settings.folders!.requirement`, `['test-case']`, `['test-run']` by `repo.types.requirement.folder` etc. In `newId`: `const prefix = typeOf(repo, type)?.prefix`. In `newItem`: compare `baseOf(repo, type)` instead of `type`, take the home folder from `typeOf(repo, type)?.folder`, and build the file from the template:

```ts
const doc = new Document({ id, type, title, ...typeOf(repo, type)!.template }), itemPath = baseOf(repo, type) === 'requirement' ? `${path}.yaml` : `${path}/item.yaml`;
```

In `artifacts`: `skip = homeFolders(repo)`.

- [ ] **Step 5: `src/validate.ts`** — `schemaFor` takes the repo and composes from `typeOf`; type files are checked once.

```ts
// CO-02.1
function schemaFor(ajv: Ajv2020, repo: Repo, name: string, base?: object) {
  const def = typeOf(repo, name);
  if (!def) return undefined;
  const own = { properties: def.fields, required: def.required };
  if (!ajv.getSchema(name)) ajv.addSchema(base ? { allOf: [base, own], unevaluatedProperties: false } : own, name);
  return ajv.getSchema(name);
}
```

At the start of `validate`, before the entry loop:

```ts
// CO-02.8
const checkType = ajv.compile(typeFileSchema);
for (const file of repo.typeFiles) findings.push(...schemaFindings(file, checkType, false).map((f) => ({ ...f, code: 'type-file' })));
```

`misplaced` uses `typeOf(repo, type)?.folder` and `homeFolders(repo)`. `itemSchema(root, type)` (used by the extension) becomes `itemSchema(repo, type)`; update its caller.

- [ ] **Step 6: literal type comparisons.** `grep -n "'requirement'\|'test-case'\|'test-run'" src/*.ts`; where the compared value is an item's `type`, wrap it in `baseOf(repo, …)`. `disallowed(source, type, target)` callers in `src/validate.ts` and `src/links.ts` pass `baseOf` of both types.

- [ ] **Step 7: `src/cli.ts`** `new` help: `Types: ${Object.keys(openRepo().types).filter((t) => t !== 'meta').join(' ')}`. Same expression in `extension/src/extension.ts:95`, keeping its `test-run` filter.

- [ ] **Step 8:** update existing tests that write `schemas/…json`, `templates/…yaml` or `prefixes:`/`folders:` to the `types/` form (`grep -n "schemas/\|templates/\|prefixes\|folders" test/plm.test.ts`).

- [ ] **Step 9:** run the checks. Expected: 19 tests pass.

- [ ] **Step 10:** `quality` reviews the diff; commit `src, test, extension: project types in types/<type>.yaml (CO-02.8)`.

### 1c. Migration note (in `README.md`, written in 1a)

| Before | After |
|---|---|
| `prefixes: {analysis: ANA-}` and `folders: {analysis: analyses}` in `plm.yaml` | `prefix: ANA-` and `folder: analyses` in `types/analysis.yaml` |
| `schemas/<type>.schema.json` `properties` / `required` | `fields` / `required` in `types/<type>.yaml` |
| `templates/<type>.yaml` | `template:` in `types/<type>.yaml` |
| `schemas/meta.schema.json` | `types/meta.yaml` |

A schema that used keywords other than `properties` and `required` cannot be carried over; none is known.

---

## Phase 2: Built-in `port` and `connection`

### 2a. Requirements

- [ ] **`scenarios.md` US-2 (changed):** append "and declares the ports through which the item meets others".
- [ ] **`scenarios.md` US-12 (new) — Integrator:** Joins the ports of an assembly's items into connections, finds ports left open, and confirms a connection again when one of its ports changes.
- [ ] **`requirements.md` CR-20 (new) — Interfaces:** The tool shall represent the interfaces between items and report those that are open or inconsistent. (US-2, US-12) *Rationale:* Disciplines meet at interfaces; an interface nobody owns or that only one side changed is where integration fails.
- [ ] **`components.md`:** CO-01 and CO-02 cite CR-20 and US-12. **TE-07 (new):** The engine shall report ports no connection reaches and connections whose ports do not fit together. (CR-20; US-12) *Rationale:* Interface findings concern other people than traceability findings and must not mix with them. CL-01 cites CR-20 and US-12.
- [ ] **CO-02.5 (changed):** add `port` `PORT-` `ports` and `connection` `CON-` `connections`.
- [ ] **CO-02.6 (changed):** add `connects` from `connection` to `port`; `implements` also to `connection`.
- [ ] **CO-02.9 (new, refines CO-02):** A type based on `port` may be `directed`; an item of it shall have `role` `sender` or `receiver`, an item of any other port type no `role`.
- [ ] `architecture.md`: add `<title>/ports/` and `<title>/connections/` to the layout and one bullet on ports and connections.
- [ ] Commit `documents: ports and connections (US-12, CR-20, TE-07, CO-02.9)`.

### 2b. Code and tests (one `implementer`, stream `ports`; files: `src/schemas.ts`, `src/validate.ts`, `test/plm.test.ts`)

- [ ] **Step 1: Write the failing test.**

```ts
test('CO-02.5–CO-02.6, CO-02.9, CL-02.1, TE-03.1: ports', () => {
  write(root, { 'types/bus.yaml': 'base: port\ndirected: true\ntemplate: {role: sender}\n', 'types/joint.yaml': 'base: port\n' });
  const out = json(root, '-C', `${root}/wing`, 'new', 'bus', 'Out'), foot = json(root, '-C', `${root}/bolt`, 'new', 'joint', 'Foot'),
    cable = json(root, '-C', `${root}/wing`, 'new', 'connection', 'Cable');
  expect(out.path).toBe('wing/ports/out/item.yaml');
  expect(out.id).toMatch(/^PORT-/);
  expect(cable.path).toBe('wing/connections/cable/item.yaml');
  expect(plm(root, 'link', cable.id, 'connects', out.id).status).toBe(0);
  expect(plm(root, 'link', 'P', 'implements', cable.id).status).toBe(0);
  expect(plm(root, 'link', 'P', 'connects', out.id).status).toBe(2);
  expect(validate(loadRepo(root)).filter((f) => f.severity === 'error')).toEqual([]);
  plm(root, 'set', out.id, 'status', 'released');                    // a draft's missing field is only a warning (CO-02.4)
  plm(root, 'set', foot.id, 'role', 'sender');                       // role on an undirected port
  write(root, { [out.path]: `id: ${out.id}\ntype: bus\ntitle: Out\n` }); // directed port without role
  expect(validate(loadRepo(root)).map((f) => `${f.file} ${f.code}`).sort()).toEqual([`${foot.path} schema`, `${out.path} schema`]);
  write(root, { [out.path]: `id: ${out.id}\ntype: bus\ntitle: Out\nrole: receiver\n` });
  plm(root, 'confirm', cable.id); commit(root);
  write(root, { [`wing/ports/out/pins.csv`]: '1,tx\n' });
  expect(json(root, 'suspects').map((s) => s.source)).toContain(cable.id); // a port's file change flags the connection
});
```

- [ ] **Step 2:** `npx vitest run -t ports`. Expected: FAIL (`No prefix for bus`).

- [ ] **Step 3: `src/schemas.ts`.**

```ts
// CO-02.5, CO-02.9
  port: { prefix: 'PORT-', folder: 'ports', fields: { role: { enum: ['sender', 'receiver'] } } },
  connection: { prefix: 'CON-', folder: 'connections' },
```

```ts
// CO-02.6
  implements: [['*'], ['requirement', 'connection']],
  connects: [['connection'], ['port']],
```

- [ ] **Step 4: `src/validate.ts`** — in `schemaFor`, add the role rule to `own` (a draft item then gets a warning by CO-02.4, as for any required field):

```ts
// CO-02.9
const role = baseOf(repo, name) !== 'port' ? {} : def.directed ? { required: [...(def.required ?? []), 'role'] } : { properties: { ...def.fields, role: false } },
  own = { properties: def.fields, required: def.required, ...role };
```

- [ ] **Step 5:** run the checks. Expected: 20 tests pass.
- [ ] **Step 6:** `quality` review; commit `src, test: built-in port and connection, connects link (CO-02.5, CO-02.6, CO-02.9)`.

---

## Phase 3: `plm report connections`

### 3a. Requirements

- [ ] **TE-07.1 (new, refines TE-07):** For the repository or an item subtree, the engine shall list each port no `connects` link reaches as `open`, and each connection with fewer than two ports as `few`, with ports of more than one type as `mixed`, or, if its ports' type is directed, without exactly one `sender` as `senders`.
- [ ] **CL-01.1 (changed):** add `report connections [<item>]`, exit 1 if anything is listed.
- [ ] **CL-05.3 (changed):** `report connections` shows items as `<ID> (<title>)`; JSON rows `{code, item: {id, title}, detail}`.
- [ ] Commit `documents: report connections (TE-07.1)`.

### 3b. Code and tests (one `implementer`, stream `report`; files: `src/connections.ts`, `src/cli.ts`, `test/plm.test.ts`)

- [ ] **Step 1: Write the failing test.**

```ts
test('TE-07.1, CL-01.1, CL-05.2–CL-05.3: connections', () => {
  const port = (id, type, role = '') => `id: ${id}\ntype: ${type}\ntitle: ${id}\n${role && `role: ${role}\n`}`,
    connection = (id, ...ports) => `id: ${id}\ntype: connection\ntitle: ${id}\nlinks:\n${ports.map((p) => `  - {type: connects, target: ${p}}\n`).join('')}`;
  write(root, {
    'types/bus.yaml': 'base: port\ndirected: true\n', 'types/joint.yaml': 'base: port\n',
    'wing/ports/o/item.yaml': port('O', 'bus', 'sender'), 'wing/ports/i/item.yaml': port('I', 'bus', 'sender'),
    'wing/ports/f/item.yaml': port('F', 'joint'), 'bolt/ports/s/item.yaml': port('S', 'joint'),
    'wing/connections/c/item.yaml': connection('C', 'O', 'I'),
    'wing/connections/m/item.yaml': connection('M', 'F', 'O'),
    'wing/connections/t/item.yaml': connection('T', 'F'),
  });
  const rows = (...scope) => { const run = plm(root, '--format', 'json', 'report', 'connections', ...scope); return [run.status, ...JSON.parse(run.stdout).data.map((r) => `${r.code} ${r.item.id} ${r.detail}`.trim())]; };
  expect(rows()).toEqual([1, 'open S', 'senders C 2', 'mixed M joint bus', 'few T 1']);
  expect(rows('L')).toEqual([1, 'open S']);
  expect(plm(root, 'report', 'connections', 'A').stdout).toContain('senders C (C) 2');
  write(root, { 'wing/ports/i/item.yaml': port('I', 'bus', 'receiver'), 'wing/connections/m/item.yaml': connection('M', 'F', 'S'), 'wing/connections/t/item.yaml': connection('T', 'F', 'S') });
  expect(rows()).toEqual([0]);
});
```

`A` is the fixture's `wing`, `L` its `bolt`.

- [ ] **Step 2:** `npx vitest run -t connections`. Expected: FAIL (unknown command `connections`).

- [ ] **Step 3: create `src/connections.ts`.**

```ts
import { baseOf, linksOf, named, subtree, type Entry, type Named, type Repo } from './repo.ts';

// TE-07.1
export interface ConnectionFinding { code: 'open' | 'few' | 'mixed' | 'senders'; item: Named; detail: string }

export function connectionReport(repo: Repo, root?: string): ConnectionFinding[] {
  const scope = root && new Set(subtree(repo, root)),
    of = (base: string, all = false) => [...repo.entries.values()].filter((e) => baseOf(repo, e.item.data.type) === base && (all || !scope || scope.has(e.id))),
    portsOf = (connection: Entry) => linksOf(connection).filter((l) => l.type === 'connects').flatMap((l) => repo.entries.get(l.target) ?? []),
    connected = new Set(of('connection', true).flatMap(portsOf).map((p) => p.id)),
    row = (e: Entry, code: ConnectionFinding['code'], detail: unknown = ''): ConnectionFinding => ({ code, item: named(repo, e.id), detail: String(detail) });
  return [
    ...of('port').filter((p) => !connected.has(p.id)).map((p) => row(p, 'open')),
    ...of('connection').flatMap((c) => {
      const ports = portsOf(c), types = [...new Set(ports.map((p) => String(p.item.data.type)))], senders = ports.filter((p) => p.item.data.role === 'sender').length;
      return [
        ...(ports.length < 2 ? [row(c, 'few', ports.length)] : []),
        ...(types.length > 1 ? [row(c, 'mixed', types.join(' '))] : []),
        ...(types.length === 1 && repo.types[types[0]]?.directed && senders !== 1 ? [row(c, 'senders', senders)] : []),
      ];
    }),
  ];
}
```

A port counts as connected whichever connection in the repository reaches it, also one outside the scope.

- [ ] **Step 4: `src/cli.ts`** — keep the `report` command in a constant and add the subcommand.

```ts
const report = program.command('report');
// TE-07.1, CL-05.3
report.command('connections [item]').description('report open and inconsistent interfaces').action((item) => {
  const repo = openRepo(), rows = connectionReport(repo, item && entry(repo, item).id);
  exitCode = +!!rows.length;
  output(rows.map((row) => [row.code, label(row.item), row.detail].filter(Boolean).join(' ')).join('\n'), rows);
});
```

`report.command('coverage [item]')…` replaces `program.command('report').command('coverage [item]')…`.

- [ ] **Step 5:** run the checks. Expected: 21 tests pass.
- [ ] **Step 6:** `quality` review; commit `src, test: plm report connections (TE-07.1)`.

---

## Phase 4: Example, documentation, release

- [ ] **4.1 README:** a section "Ports and connections" after Configuration: one type file, `plm new`, `plm link … connects …`, `plm report connections`, and the sentence that interface findings appear only there. Neutral example data (`serial`, `mechanical`, `control-unit`, `frame`), no bus or project names.
- [ ] **4.2 Manual check** in a scratch repository, following the walkthrough sections 1–6 with neutral names. Expected: `plm validate` exits 0; `plm report connections` exits 1 until every port is connected, then 0; editing a file in a port folder makes `plm suspects` list the connection; `plm show <port>` lists the connection under `links`.
- [ ] **4.3 `CHANGELOG.md`** Unreleased: breaking change (type files, migration table), ports and connections, `report connections`. **`package.json`** version `0.3.0`; README install line likewise.
- [ ] **4.4** `quality` final pass over the whole change (traceability of every new function and test, word counts). Commit; merge by the user's usual route.
- [ ] **4.5** After the merge, move the still-valid parts of `concepts/` into `documents/architecture.md` or delete the folder, as the user decides.

---

## Parallelism

Phases 1, 2 and 3 each change `src/schemas.ts`, `src/validate.ts` or `test/plm.test.ts`, so their code steps run in sequence. Within a phase, the requirements step (a) can start while the previous phase's code is under review. Phase 3's requirements and Phase 4.1 touch disjoint files and can run alongside Phase 2b.

## Not in this plan

- Extension views for ports and connections: the extension's word limit is unchanged and has 23 words free. A separate change once the CLI is in use.
- Project-defined link types (issue #20).
- Checks of what an interface carries (signals, pins, loads): port level only, by decision 1.
