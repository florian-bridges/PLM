// VS-01–VS-06: VS Code glue.
import { join, relative } from 'node:path';
import * as vscode from 'vscode';
import { changeSince, confirm, linkStates, recordRun, type LinkState } from '../../src/links.ts';
import { childrenOf, entry, findRoot, innermostItem, loadRepo, newItem, writeYaml, type Entry, type Repo } from '../../src/repo.ts';
import { results } from '../../src/schemas.ts';
import { itemSchema, validate } from '../../src/validate.ts';
import { currentVersions } from '../../src/version.ts';
import { applyForm, formData, formFields, formHtml, completesId, hoverMarkdown, productTree, references, requirementsMarkdown } from './logic.ts';

export function activate(context: vscode.ExtensionContext) {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  const root = findRoot(folder.uri.fsPath);
  const open = () => loadRepo(root);
  const fileUri = (path: string) => vscode.Uri.file(join(root, path));
  // VS-01.2
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
  };

  // VS-03.1
  const showRequirements = async (found: Entry) => {
    const link = (target: Entry) => `command:vscode.open?${encodeURIComponent(JSON.stringify([fileUri(target.item.path)]))}`;
    const panel = vscode.window.createWebviewPanel('plm.requirements', `${found.item.data.title} requirements`, vscode.ViewColumn.Active, { enableCommandUris: ['vscode.open'] });
    panel.webview.html = await vscode.commands.executeCommand<string>('markdown.api.render', requirementsMarkdown(open(), found.id, link));
  };

  // VS-04.2
  const showChange = async (row: { state: LinkState }) => {
    const { commit, diff } = changeSince(open(), row.state.link);
    if (!commit) return vscode.window.showWarningMessage(`No commit has the confirmed version of ${row.state.link.target}`);
    return vscode.window.showTextDocument(await vscode.workspace.openTextDocument({ content: diff, language: 'diff' }));
  };
  const confirmItem = (row: { state: LinkState }) => {
    const repo = open();
    confirm(repo, currentVersions(repo), validate(repo), row.state.source);
    refresh();
  };

  // VS-01.2
  const editItem = (row?: Pick<Entry, 'id'>) => {
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

  // VS-01.5
  const createItem = async (at?: Entry | vscode.Uri) => {
    const type = await vscode.window.showQuickPick(Object.keys(open().settings.prefixes ?? {}));
    const title = type && await vscode.window.showInputBox({ prompt: 'Title' });
    if (!title) return;
    editItem({ id: newItem(open(), type, title, at instanceof vscode.Uri ? at.fsPath : join(root, at?.path ?? '')) });
    refresh();
  };

  // VS-06.1
  const recordTestRun = async () => {
    const repo = open();
    const pickItem = (placeHolder: string, type?: string) => vscode.window.showQuickPick([...repo.entries.values()]
      .filter((found) => !type || found.item.data.type === type).map((found) => ({ label: found.id, description: found.item.data.title })), { placeHolder });
    const testCase = await pickItem('Test case', 'test-case');
    const sut = testCase && await pickItem('System under test');
    const result = sut && await vscode.window.showQuickPick(results, { placeHolder: 'Result' });
    if (!result) return;
    const logs = await vscode.window.showOpenDialog({ canSelectMany: true, openLabel: 'Attach logs' }) ?? [];
    vscode.window.showInformationMessage(`Recorded ${recordRun(repo, testCase.label, sut.label, result, logs.map((log) => log.fsPath))}`);
  };

  // VS-01.6, VS-04.3
  const yaml = { pattern: '**/*.yaml' };
  const atId = <T>(use: (repo: Repo, found: Entry) => T) => (document: vscode.TextDocument, position: vscode.Position) => {
    const repo = open();
    const found = repo.entries.get(document.getText(document.getWordRangeAtPosition(position, /[\w-]+/)));
    return found && use(repo, found);
  };
  const location = (found: Entry) => new vscode.Location(fileUri(found.item.path), new vscode.Position(0, 0));

  // Core refusals become error messages.
  const register = <T extends unknown[]>(name: string, command: (...args: T) => unknown) => vscode.commands.registerCommand(name, async (...args: T) => {
    try { await command(...args); } catch (error) { vscode.window.showErrorMessage((error as Error).message); }
  });

  context.subscriptions.push(
    diagnostics,
    vscode.window.registerTreeDataProvider('plm.tree', tree),
    register('plm.editItem', editItem),
    register('plm.newItem', createItem),
    register('plm.showRequirements', showRequirements),
    register('plm.showChange', showChange),
    register('plm.confirm', confirmItem),
    register('plm.recordTestRun', recordTestRun),
    vscode.languages.registerCompletionItemProvider(yaml, { provideCompletionItems: (document, position) => completesId(document.lineAt(position).text.slice(0, position.character))
      ? [...open().entries.values()].map(({ id, item }) => ({ label: item.data.title, detail: id, insertText: id })) : [] }),
    vscode.languages.registerHoverProvider(yaml, { provideHover: atId((repo, found) => ({ contents: [Object.assign(
      new vscode.MarkdownString(hoverMarkdown(repo, linkStates(repo, currentVersions(repo)), found.id, activeItem(repo))), { isTrusted: { enabledCommands: ['plm.reviewLink'] } })] })) }),
    vscode.languages.registerDefinitionProvider(yaml, { provideDefinition: atId((repo, found) => location(found)) }),
    vscode.languages.registerReferenceProvider(yaml, { provideReferences: atId((repo, found) => references(repo, found.id).map(location)) }),
    vscode.workspace.onDidSaveTextDocument(refresh),
  );
  refreshDiagnostics();
}
