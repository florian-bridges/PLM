// TE-05: impact of a change between a base commit and a head commit or the working tree.
import { fromRun, linkStates, type LinkState } from './links.ts';
import { git, type Snapshot } from './version.ts';

export interface Impact { changed: string[]; propagated: string[]; suspects: LinkState[]; runs: string[] }

// TE-05.1: files changed from the base, including untracked files when the head is the working tree.
export function changedFiles(root: string, base: string, head?: string): string[] {
  const diff = git(root, ['diff', '--name-only', '--relative', base, ...(head ? [head] : [])]);
  const untracked = head ? '' : git(root, ['ls-files', '--others', '--exclude-standard']);
  return `${diff}\n${untracked}`.split('\n').filter(Boolean);
}

// TE-05.1
export function impact(base: Snapshot, head: Snapshot, files: string[]): Impact {
  const innermostOwner = ({ repo }: Snapshot, file: string) => [...repo.entries.values()]
    .filter((entry) => file === entry.path || file.startsWith(`${entry.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]?.id;
  const ownersOfChangedFiles = new Set(files.flatMap((file) => [innermostOwner(base, file), innermostOwner(head, file)]));
  const ids = new Set([...base.repo.entries.keys(), ...head.repo.entries.keys()]);
  const changedIds = [...ids].filter((id) => base.versions.get(id) !== head.versions.get(id));

  // TE-05.2
  const becameSuspect = (state: LinkState) => state.state === 'suspect' && state.link.version === base.versions.get(state.link.target);
  const becameSuspects = linkStates(head.repo, head.versions).filter(becameSuspect);

  return {
    changed: changedIds.filter((id) => ownersOfChangedFiles.has(id)),
    propagated: changedIds.filter((id) => !ownersOfChangedFiles.has(id)),
    suspects: becameSuspects.filter((state) => !fromRun(head.repo, state)),
    runs: [...new Set(becameSuspects.filter((state) => fromRun(head.repo, state)).map((state) => state.source))],
  };
}
