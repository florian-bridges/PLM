// TE-05
import { fromRun, linkStates } from './links.ts';
import { git, innermostItem, named, useEntries } from './repo.ts';
import { type Snapshot } from './version.ts';

// TE-05.1
export function changedFiles(root: string, base: string, head?: string) {
  return git(root, ['diff', '--name-only', '--relative', base, ...(head ? [head] : [])]).split('\n').filter(Boolean);
}

// TE-05.4
function usesDiff(base: Snapshot, head: Snapshot, id: string, name: (id: string) => any) {
  const keyed = (s: Snapshot) => new Map(useEntries(s.repo.entries.get(id)?.item.data).map((u, i, all) => [u.item + ' ' + all.slice(0, i).filter((o) => o.item === u.item).length, u])),
    b = keyed(base), h = keyed(head), fields = (u: any) => JSON.stringify([u.quantity ?? 1, u.ref, u.when]);
  return [...new Set([...b.keys(), ...h.keys()])].flatMap((key) => {
    const x = b.get(key), y = h.get(key), status = !x ? 'added' : !y ? 'removed' : fields(x) === fields(y) ? '' : 'changed';
    return status ? [{ ...name(id), uses: name((x ?? y).item), status }] : [];
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
    uses: [...ids].flatMap((id) => usesDiff(base, head, id, name)),
  };
}
