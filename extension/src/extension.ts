// VS-01, VS-02, VS-04: VS Code glue; the logic is in logic.ts and the core.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { changeSince, confirm, linkStates } from '../../src/links.ts';
import { findRoot, loadRepo } from '../../src/repo.ts';
import { validate } from '../../src/validate.ts';
import { currentVersions, git } from '../../src/version.ts';
import { activeItem, changedPaths, diagnosticsByFile, linkRows, productTree, type LinkRow, type TreeRow } from './logic.ts';

export function activate(context: vscode.ExtensionContext) {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  const root = findRoot(folder.uri.fsPath);
  const open = () => loadRepo(root);
  const fileUri = (path: string) => vscode.Uri.file(join(root, path));

  // VS-01.3
  const diagnostics = vscode.languages.createDiagnosticCollection('plm');
  const refreshDiagnostics = () => {
    diagnostics.clear();
    for (const [file, found] of diagnosticsByFile(validate(open()))) {
      diagnostics.set(fileUri(file), found.map(({ line, col, error, code, message }) => Object.assign(
        new vscode.Diagnostic(new vscode.Range(line, col, line, col), message, error ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning),
        { code, source: 'plm' })));
    }
  };

  // VS-02.1
  const icons: Record<string, string> = { assembly: 'layers', part: 'package' };
  const treeChanged = new vscode.EventEmitter<void>();
  const tree: vscode.TreeDataProvider<TreeRow> = {
    onDidChangeTreeData: treeChanged.event,
    getTreeItem: (row) => Object.assign(new vscode.TreeItem(row.label, row.hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None), {
      description: row.status, iconPath: new vscode.ThemeIcon(icons[row.type] ?? 'symbol-misc'),
      command: { title: 'Open', command: 'vscode.open', arguments: [fileUri(row.file)] },
    }),
    getChildren: (row) => productTree(open(), row?.id),
  };

  // VS-04.1
  const changed = new vscode.EventEmitter<void>();
  const links: vscode.TreeDataProvider<LinkRow> = {
    onDidChangeTreeData: changed.event,
    getTreeItem: (row) => Object.assign(new vscode.TreeItem(row.label), { description: row.state.state, contextValue: row.state.state }),
    getChildren: () => {
      const file = vscode.window.activeTextEditor?.document.uri.fsPath;
      const repo = open();
      const id = file && activeItem(repo, file);
      return id ? linkRows(linkStates(repo, currentVersions(repo)), id) : [];
    },
  };

  // VS-04.2: original files as of a commit, from `plm-git:/<path>?<commit>`.
  const gitFiles: vscode.TextDocumentContentProvider = {
    provideTextDocumentContent: (uri) => { try { return git(root, ['show', `${uri.query}:${uri.path.slice(1)}`]); } catch { return ''; } },
  };
  const showChange = (row: LinkRow) => {
    const { commit, diff } = changeSince(open(), row.state.link);
    if (!commit) return vscode.window.showWarningMessage(`No commit has the confirmed version of ${row.state.link.target}`);
    const gitUri = (path: string, ref: string) => vscode.Uri.from({ scheme: 'plm-git', path: `/${path}`, query: ref });
    const files = changedPaths(diff).map((path) => {
      const current = existsSync(join(root, path)) ? fileUri(path) : gitUri(path, '');
      return [fileUri(path), gitUri(path, commit), current];
    });
    return vscode.commands.executeCommand('vscode.changes', `${row.state.link.target} since ${commit}`, files);
  };
  const confirmItem = (row: LinkRow) => {
    try {
      const repo = open();
      confirm(repo, currentVersions(repo), validate(repo), row.state.source);
      changed.fire();
    } catch (error) {
      vscode.window.showErrorMessage(String((error as Error).message));
    }
  };

  context.subscriptions.push(
    diagnostics,
    vscode.window.registerTreeDataProvider('plm.tree', tree),
    vscode.window.registerTreeDataProvider('plm.links', links),
    vscode.workspace.registerTextDocumentContentProvider('plm-git', gitFiles),
    vscode.commands.registerCommand('plm.showChange', showChange),
    vscode.commands.registerCommand('plm.confirm', confirmItem),
    vscode.workspace.onDidSaveTextDocument(() => { refreshDiagnostics(); treeChanged.fire(); changed.fire(); }),
    vscode.window.onDidChangeActiveTextEditor(() => changed.fire()),
  );
  refreshDiagnostics();
}
