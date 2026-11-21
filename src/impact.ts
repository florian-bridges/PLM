// TE-05
import { fromRun, linkStates } from './links.ts';
import { git, innermostItem, named, useEntries } from './repo.ts';
import { type Snapshot } from './version.ts';

// TE-05.1
export function changedFiles(root: string, base: string, head?: string) {
  return git(root, ['diff', '--name-only', '--relative', base, ...(head ? [head] : [])]).split('\n').filter(Boolean);
}

// TE-05.4
function usesDiff(base: Snapshot, head: Snapshot, ids: string[], name: (id: string) => any) {
  const group = (es: any[]) => es.reduce((m, u) => m.set(u.item, [...(m.get(u.item) ?? []), u]), new Map<string, any[]>()),
    same = (a: any, b: any) => (a.quantity ?? 1) === (b.quantity ?? 1) && a.ref === b.ref && JSON.stringify(a.when) === JSON.stringify(b.when);
  return ids.flatMap((id) => {
    const b = group(useEntries(base.repo.entries.get(id)?.item.data)), h = group(useEntries(head.repo.entries.get(id)?.item.data));
    return [...new Set([...b.keys(), ...h.keys()])].flatMap((item) => {
      const bs = b.get(item) ?? [], hs = h.get(item) ?? [], rows: any[] = [];
      for (let i = 0; i < Math.max(bs.length, hs.length); i++) {
        const status = !bs[i] ? 'added' : !hs[i] ? 'removed' : same(bs[i], hs[i]) ? '' : 'changed';
        if (status) rows.push({ ...name(id), uses: name(item), status });
      }
      return rows;
    });
  });
}

// TE-05.1, CL-05.3
export function impact(base: Snapshot, head: Snapshot, files: string[]) {
  const ownersOfChangedFiles = new Set(files.flatMap((file) => [innermostItem(base.repo, file), innermostItem(head.repo, file)])),
    ids = new Set([...base.repo.entries.keys(), ...head.repo.entries.keys()]),
    changedIds = [...ids].filter((id) => base.versions.get(id) !== head.versions.get(id)),
    // TE-05.2
    becameSuspects = linkStates(head.repo, head.versions).filter((state) => state.state === 'suspect' && state.link.version === base.versions.get(state.link.target)),
    changed = changedIds.filter((id) => ownersOfChangedFiles.has(id)),
    status = (snapshot: Snapshot, id: string) => snapshot.repo.entries.get(id)?.meta.data.status ?? '',
    name = (id: string) => named(head.repo.entries.has(id) ? head.repo : base.repo, id);
  return {
    changed: changed.map(name),
    propagated: changedIds.filter((id) => !ownersOfChangedFiles.has(id)).map(name),
    // TE-05.3
    released: changed.filter((id) => (base.repo.settings.released_states ?? ['released']).includes(status(base, id)) && status(head, id) === status(base, id)).map(name),
    suspects: becameSuspects.filter((state) => !fromRun(head.repo, state)),
    runs: [...new Set(becameSuspects.filter((state) => fromRun(head.repo, state)).map((state) => state.source))].map(name),
    uses: usesDiff(base, head, [...ids], name),
  };
}
