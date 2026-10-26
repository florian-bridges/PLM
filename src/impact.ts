// TE-05
import { fromRun, linkStates, type LinkState } from './links.ts';
import { innermostItem, named, type Named } from './repo.ts';
import { git, type Snapshot } from './version.ts';

export interface Impact { changed: Named[]; propagated: Named[]; suspects: LinkState[]; runs: Named[] }

// TE-05.1
export function changedFiles(root: string, base: string, head?: string): string[] {
  const diff = git(root, ['diff', '--name-only', '--relative', base, ...(head ? [head] : [])]),
    untracked = head ? '' : git(root, ['ls-files', '--others', '--exclude-standard']);
  return `${diff}\n${untracked}`.split('\n').filter(Boolean);
}

// TE-05.1, CL-05.3
export function impact(base: Snapshot, head: Snapshot, files: string[]): Impact {
  const ownersOfChangedFiles = new Set(files.flatMap((file) => [innermostItem(base.repo, file), innermostItem(head.repo, file)])),
    ids = new Set([...base.repo.entries.keys(), ...head.repo.entries.keys()]),
    changedIds = [...ids].filter((id) => base.versions.get(id) !== head.versions.get(id)),
    // TE-05.2
    becameSuspect = (state: LinkState) => state.state === 'suspect' && state.link.version === base.versions.get(state.link.target),
    becameSuspects = linkStates(head.repo, head.versions).filter(becameSuspect),
    name = (id: string) => named(head.repo.entries.has(id) ? head.repo : base.repo, id);
  return {
    changed: changedIds.filter((id) => ownersOfChangedFiles.has(id)).map(name),
    propagated: changedIds.filter((id) => !ownersOfChangedFiles.has(id)).map(name),
    suspects: becameSuspects.filter((state) => !fromRun(head.repo, state)),
    runs: [...new Set(becameSuspects.filter((state) => fromRun(head.repo, state)).map((state) => state.source))].map(name),
  };
}
