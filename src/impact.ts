// TE-05: impact of a change between a base commit and a head commit or the working tree.
import { linkStates, type LinkState } from './links.ts';
import { selection } from './repo.ts';
import { git, type Snapshot } from './version.ts';

export interface Impact { changed: string[]; propagated: string[]; suspects: LinkState[]; runs: string[]; configurations: string[] }

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
  const suspects = linkStates(head.repo, head.versions).filter(becameSuspect);
  const isRun = (id: string) => head.repo.entries.get(id)?.item.data.type === 'test-run';

  const changed = changedIds.filter((id) => ownersOfChangedFiles.has(id));
  const selects = (root?: string) => (root && head.repo.entries.has(root) ? selection(head.repo, root) : []);
  const affected = [...head.repo.configurations].filter(([, file]) => files.includes(file.path) || selects(file.data.root).some((id) => changed.includes(id)));

  return {
    changed,
    propagated: changedIds.filter((id) => !ownersOfChangedFiles.has(id)),
    suspects,
    runs: [...new Set(suspects.map((state) => state.source))].filter(isRun),
    configurations: affected.map(([name]) => name),
  };
}
