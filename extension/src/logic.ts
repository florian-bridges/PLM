// VS-02, VS-03, VS-04: editor logic without the vscode API, so vitest can test it.
import type { LinkState } from '../../src/links.ts';
import { childrenOf, entry, type Entry, type Repo } from '../../src/repo.ts';

// VS-02.1
export function productTree(repo: Repo, parent?: string): Entry[] {
  const ids = parent ? childrenOf(repo.entries.get(parent)) : [...repo.entries.values()].filter((found) => !found.path.includes('/')).map((found) => found.id);
  return ids.flatMap((id) => repo.entries.get(id) ?? []);
}

// VS-03.1
export function requirementsMarkdown(repo: Repo, id: string, link: (found: Entry) => string, number = '1'): string {
  const found = entry(repo, id);
  const { title, text } = found.item.data;
  const status = found.meta.data.status ? ` *${found.meta.data.status}*` : '';
  const section = `${'#'.repeat(Math.min(number.split('.').length, 6))} ${number} [${id}](${link(found)}) ${title}${status}\n\n${text ?? ''}\n\n`;
  return section + [...found.requirements, ...found.nested].map((child, index) => requirementsMarkdown(repo, child, link, `${number}.${index + 1}`)).join('');
}

// VS-04.1
export interface LinkRow { label: string; state: LinkState }

export const linkRows = (states: LinkState[], id: string): LinkRow[] => states.flatMap((state) => {
  if (state.source === id) return [{ label: `→ ${state.link.type} ${state.link.target} (${state.targetTitle})`, state }];
  if (state.link.target === id) return [{ label: `← ${state.source} (${state.title}) ${state.link.type}`, state }];
  return [];
});

// VS-04.2
export const changedPaths = (diff: string) => [...diff.matchAll(/^diff --git a\/.* b\/(.*)$/gm)].map((match) => match[1]);
