// VS-01, VS-02, VS-04: editor logic without the vscode API, so vitest can test it.
import { relative } from 'node:path';
import type { LinkState } from '../../src/links.ts';
import { childrenOf, innermostItem, type Repo } from '../../src/repo.ts';
import type { Finding } from '../../src/validate.ts';

export interface Diagnostic { line: number; col: number; error: boolean; code: string; message: string }

// VS-01.3: VS Code counts lines and columns from zero.
export function diagnosticsByFile(findings: Finding[]): Map<string, Diagnostic[]> {
  const byFile = new Map<string, Diagnostic[]>();
  for (const { file, line, col, severity, code, message } of findings) {
    byFile.set(file, [...(byFile.get(file) ?? []), { line: line - 1, col: col - 1, error: severity === 'error', code, message }]);
  }
  return byFile;
}

// VS-02.1
export interface TreeRow { id: string; label: string; type: string; status?: string; file: string; hasChildren: boolean }

export function productTree(repo: Repo, parent?: string): TreeRow[] {
  const topLevel = [...repo.entries.values()].filter((candidate) => !candidate.path.includes('/')).map((candidate) => candidate.id);
  return (parent ? childrenOf(repo.entries.get(parent)) : topLevel).flatMap((id) => {
    const found = repo.entries.get(id);
    if (!found) return [];
    const { title, type } = found.item.data;
    return [{ id, label: `${id} ${title}`, type, status: found.meta.data.status, file: found.item.path, hasChildren: childrenOf(found).length > 0 }];
  });
}

// VS-04.1
export const activeItem = (repo: Repo, file: string) => innermostItem(repo, relative(repo.root, file));

export interface LinkRow { label: string; state: LinkState }

export const linkRows = (states: LinkState[], id: string): LinkRow[] => states.flatMap((state) => {
  if (state.source === id) return [{ label: `→ ${state.link.type} ${state.link.target} (${state.targetTitle})`, state }];
  if (state.link.target === id) return [{ label: `← ${state.source} (${state.title}) ${state.link.type}`, state }];
  return [];
});

// VS-04.2
export const changedPaths = (diff: string) => [...diff.matchAll(/^diff --git a\/.* b\/(.*)$/gm)].map((match) => match[1]);
