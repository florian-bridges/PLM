// VS-01–VS-06: VS Code glue; the logic is in logic.ts and the core.
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as vscode from 'vscode';
import { addLink, changeSince, confirm, linkStates, recordRun } from '../../src/links.ts';
import { childrenOf, entry, findRoot, innermostItem, loadRepo, writeYaml, type Entry, type Repo } from '../../src/repo.ts';
import { allows, linkRules, results } from '../../src/schemas.ts';
import { search } from '../../src/search.ts';
import { itemSchema, validate } from '../../src/validate.ts';
import { currentVersions, git } from '../../src/version.ts';
import { applyForm, changedPaths, formData, formFields, formHtml, linkRows, productTree, requirementsMarkdown, type LinkRow } from './logic.ts';

export function activate(context: vscode.ExtensionContext) {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  const root = findRoot(folder.uri.fsPath);
  const open = () => loadRepo(root);
  const fileUri = (path: string) => vscode.Uri.file(join(root, path));
  // VS-01.4, VS-04.1
  const activeItem = (repo: Repo) => {
    const file = vscode.window.activeTextEditor?.document.uri.fsPath;
    return file && innermostItem(repo, relative(root, file));
  };

  // VS-01.3
  const diagnostics = vscode.languages.createDiagnosticCollection('plm');
  const refreshDiagnostics = () => {
    diagnostics.clear();
    for (const [file, found] of Map.groupBy(validate(open()), (finding) => finding.file)) {
      diagnostics.set(fileUri(file), found.map(({ line, col, severity, code, message }) => Object.assign(
        new vscode.Diagnostic(new vscode.Range(line - 1, col - 1, line - 1, col - 1), message, severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning),
        { code, source: 'plm' })));
    }
  };

  // VS-02.1
  const icons: Record<string, string> = { assembly: 'layers', part: 'package' };
  const treeChanged = new vscode.EventEmitter<void>();
  const linksChanged = new vscode.EventEmitter<void>();
  const tree: vscode.TreeDataProvider<Entry> = {
    onDidChangeTreeData: treeChanged.event,
    getTreeItem: (found) => Object.assign(new vscode.TreeItem(`${found.id} ${found.item.data.title}`, vscode.TreeItemCollapsibleState[childrenOf(found).length ? 'Collapsed' : 'None']), {
      description: found.meta.data.status, iconPath: new vscode.ThemeIcon(icons[found.item.data.type] ?? 'symbol-misc'),
      command: { title: 'Open', command: 'vscode.open', arguments: [fileUri(found.item.path)] },
    }),
    getChildren: (row) => productTree(open(), row?.id),
  };

  const refresh = () => {
    refreshDiagnostics();
    treeChanged.fire();
    linksChanged.fire();
  };

  // VS-03.1
  const showRequirements = async (found: Entry) => {
    const link = (target: Entry) => `command:vscode.open?${encodeURIComponent(JSON.stringify([fileUri(target.item.path)]))}`;
    const panel = vscode.window.createWebviewPanel('plm.requirements', `${found.item.data.title} requirements`, vscode.ViewColumn.Active, { enableCommandUris: ['vscode.open'] });
    panel.webview.html = await vscode.commands.executeCommand<string>('markdown.api.render', requirementsMarkdown(open(), found.id, link));
  };

  // VS-04.1
  const links: vscode.TreeDataProvider<LinkRow> = {
    onDidChangeTreeData: linksChanged.event,
    getTreeItem: (row) => Object.assign(new vscode.TreeItem(row.label), { description: row.state.state, contextValue: row.state.state }),
    getChildren: () => {
      const repo = open();
      const id = activeItem(repo);
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
    const repo = open();
    confirm(repo, currentVersions(repo), validate(repo), row.state.source);
    refresh();
  };

  // VS-01.2
  const editItem = (row?: Entry) => {
    const repo = open();
    const id = row?.id ?? activeItem(repo);
    if (!id) return;
    const found = entry(repo, id);
    const check = itemSchema(root, found.item.data.type);
    if (!check) throw new Error(`Unknown item type ${found.item.data.type}`);
    const fields = formFields(check.schema as Parameters<typeof formFields>[0]);
    const panel = vscode.window.createWebviewPanel('plm.form', id, vscode.ViewColumn.Active, { enableScripts: true });
    panel.webview.html = formHtml(`${id} ${found.item.data.title}`, fields, { ...found.item.data, ...found.meta.data });
    panel.webview.onDidReceiveMessage(({ save, values }) => {
      const [item, meta] = [found.item.doc.clone(), found.meta.doc.clone()];
      applyForm(item, meta, fields, formData(fields, values));
      check(item.toJS());
      panel.webview.postMessage((check.errors ?? []).map((error) => `${error.instancePath.slice(1) || 'item'} ${error.message}`).join('\n'));
      if (!save) return;
      writeYaml(root, { path: found.item.path, doc: item });
      writeYaml(root, { path: found.meta.path, doc: meta });
      refresh();
    });
  };

  // VS-01.4: the quick pick shows the core search results unfiltered.
  const addLinkToActive = async () => {
    const repo = open();
    const source = activeItem(repo);
    if (!source) return;
    const sourceType = entry(repo, source).item.data.type;
    const type = await vscode.window.showQuickPick(Object.keys(linkRules).filter((rule) => allows(linkRules[rule][0], sourceType)), { placeHolder: 'Link type' });
    if (!type) return;
    const [targetType] = linkRules[type][1];
    const picker = vscode.window.createQuickPick();
    const update = () => {
      const query = `${picker.value} ${targetType === '*' ? '' : `type:${targetType}`}`;
      picker.items = search(repo, query).map(({ id, title }) => ({ label: id, description: title, alwaysShow: true }));
    };
    picker.placeholder = 'Search target';
    picker.onDidChangeValue(update);
    picker.onDidAccept(() => {
      addLink(repo, source, type, picker.selectedItems[0].label);
      picker.dispose();
      refresh();
    });
    update();
    picker.show();
  };

  // VS-06.1
  const recordTestRun = async () => {
    const repo = open();
    const pickItem = (types: (type: string) => boolean, placeHolder: string) => vscode.window.showQuickPick([...repo.entries.values()]
      .filter((found) => types(found.item.data.type)).map((found) => ({ label: found.id, description: found.item.data.title })), { placeHolder });
    const testCase = await pickItem((type) => type === 'test-case', 'Test case');
    const sut = testCase && await pickItem((type) => !['test-case', 'test-run'].includes(type), 'System under test');
    const result = sut && await vscode.window.showQuickPick(results, { placeHolder: 'Result' });
    if (!result) return;
    const logs = await vscode.window.showOpenDialog({ canSelectMany: true, openLabel: 'Attach logs' }) ?? [];
    vscode.window.showInformationMessage(`Recorded ${recordRun(repo, testCase.label, sut.label, result, logs.map((log) => log.fsPath))}`);
  };

  // Core refusals, such as uncommitted changes, become error messages.
  const register = <T extends unknown[]>(name: string, command: (...args: T) => unknown) => vscode.commands.registerCommand(name, async (...args: T) => {
    try { await command(...args); } catch (error) { vscode.window.showErrorMessage((error as Error).message); }
  });

  context.subscriptions.push(
    diagnostics,
    vscode.window.registerTreeDataProvider('plm.tree', tree),
    vscode.window.registerTreeDataProvider('plm.links', links),
    vscode.workspace.registerTextDocumentContentProvider('plm-git', gitFiles),
    register('plm.editItem', editItem),
    register('plm.addLink', addLinkToActive),
    register('plm.showRequirements', showRequirements),
    register('plm.showChange', showChange),
    register('plm.confirm', confirmItem),
    register('plm.recordTestRun', recordTestRun),
    vscode.workspace.onDidSaveTextDocument(refresh),
    vscode.window.onDidChangeActiveTextEditor(() => linksChanged.fire()),
  );
  refreshDiagnostics();
}
