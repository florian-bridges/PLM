// VS-01–VS-06: editor logic without the vscode API, for tests.
import { dirname } from 'node:path';
import type { LinkState } from '../../src/links.ts';
import { entry, innermostItem, list, parentOf, targetId, useEntries, type Entry, type Link, type Repo } from '../../src/repo.ts';
import { itemSchema } from '../../src/validate.ts';
import type { Finding } from '../../src/validate.ts';

export { productTree } from '../../src/repo.ts';

// VS-01.2
export const schemaIdFor = (repo: Repo, file: string) => {
  const id = innermostItem(repo, file);
  return id && repo.entries.get(id)!.item.path === file ? id : undefined;
};
export const schemaOf = (repo: Repo, id: string) => JSON.stringify(itemSchema(repo, repo.entries.get(id)!.item.data.type)?.schema);

// VS-01.3
export const diagnosticsOf = (findings: Finding[]) => Map.groupBy(findings, (finding) => finding.file);

// VS-01.5
export const itemTypes = (repo: Repo) => Object.keys(repo.types).filter((type) => type !== 'meta');

// VS-02.3
export const withQuantities = (parent: Entry | undefined, children: Entry[]) => {
  const uses = useEntries(parent?.item.data);
  return children.map((found) => Object.assign(found, { quantity: uses.find((u) => u.item === found.id)?.quantity }));
};

// VS-02.4
export const configLabel = (text: string) => `$(settings-gear) ${text || 'config'}`;

// VS-02.6
export const breadcrumbChain = (repo: Repo, id?: string): string[] => {
  const chain: string[] = [];
  for (; id; id = parentOf(repo, id)) chain.unshift(id);
  return chain;
};

// VS-03.5
export const docLink = (path = '') => `/${encodeURI(path)}`;

// VS-04.3
export function hoverMarkdown(repo: Repo, states: LinkState[], id: string, source?: string) {
  const { item, meta } = entry(repo, id);
  const link = states.find((state) => state.source === source && state.link.target === id);
  return `**${item.data.title}**\n\n${[item.data.type, meta.data.status].filter(Boolean).join(', ')}${link ? `\n\n${link.state} [Review link](command:plm.reviewLink?${encodeURIComponent(JSON.stringify([link.source, link.link.target]))})` : ''}`;
}

// VS-04.4
export function suspectLines(found: Entry, states: LinkState[]) {
  return list<Link>(found.item.data.links).flatMap((listed, index) => {
    const state = states.find((s) => s.source === found.id && s.link.type === listed.type && s.link.target === listed.target && s.state !== 'current');
    if (!state) return [];
    const node: any = found.item.doc.getIn(['links', index], true);
    return [{ line: found.item.lines.linePos(node.range[0]).line, state }];
  });
}

// VS-04.5
export const incoming = (states: LinkState[], id: string) => states.filter((s) => targetId(s.link.target) === id).map((s) => s.source);
export const outgoing = (states: LinkState[], id: string) => states.filter((s) => s.source === id).map((s) => targetId(s.link.target));

// VS-04.6
export const hasSuspect = (states: LinkState[], id: string) => states.some((s) => s.source === id && s.state !== 'current');

// VS-06.2
export const testCasesByOwner = (repo: Repo) =>
  Map.groupBy([...repo.entries.values()].filter((found) => found.item.data.type === 'test-case'), (found) => innermostItem(repo, dirname(found.path)));
