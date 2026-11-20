// TE-05
import { fromRun, linkStates } from './links.ts';
import { git, innermostItem, named } from './repo.ts';
import { type Snapshot } from './version.ts';

// TE-05.1
export function changedFiles(root: string, base: string, head?: string) {
  return git(root, ['diff', '--name-only', '--relative', base, ...(head ? [head] : [])]).split('\n').filter(Boolean);
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
  };
}
