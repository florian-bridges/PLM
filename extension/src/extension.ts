// VS-01–VS-06: VS Code glue.
import { join, relative } from 'node:path';
import * as vscode from 'vscode';
import { changeSince, confirm, coverage, linkStates, recordRun, suspects } from '../../src/links.ts';
import { childrenOf, entry, findRoot, innermostItem, linksOf, loadRepo, newItem, targetId, writeYaml, type Entry, type Repo } from '../../src/repo.ts';
import { results } from '../../src/schemas.ts';
import { itemSchema, validate } from '../../src/validate.ts';
import { currentVersions } from '../../src/version.ts';
import * as logic from './logic.ts';

export function activate(context: vscode.ExtensionContext) {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  const root = findRoot(folder.uri.fsPath);
  const open = () => loadRepo(root);
  const fileUri = (path: string) => vscode.Uri.file(join(root, path));
  const statesOf = (repo: Repo) => linkStates(repo, currentVersions(repo));
  // VS-01.2, VS-04.3
  const activeItem = (repo: Repo, file = vscode.window.activeTextEditor?.document.uri.fsPath) => file && innermostItem(repo, relative(root, file));

  const diagnostics = vscode.languages.createDiagnosticCollection('plm');

  // VS-02.1
  const icons: Record<string, string> = { assembly: 'layers', part: 'package' };
  const treeChanged = new vscode.EventEmitter<void>();
  const tree: vscode.TreeDataProvider<Entry> = {
    onDidChangeTreeData: treeChanged.event,
    getTreeItem: (found) => Object.assign(new vscode.TreeItem(`${found.id} ${found.item.data.title}`, vscode.TreeItemCollapsibleState[childrenOf(found).length ? 'Collapsed' : 'None']), {
      description: found.meta.data.status, iconPath: new vscode.ThemeIcon(icons[found.item.data.type] ?? 'symbol-misc'),
      command: { title: 'Open', command: 'vscode.open', arguments: [fileUri(found.item.path)] },
    }),
    getChildren: (row) => logic.productTree(open(), row?.id),
  };

  // VS-01.3
  const refresh = () => {
    diagnostics.clear();
    for (const [file, found] of Map.groupBy(validate(open()), (finding) => finding.file)) {
      diagnostics.set(fileUri(file), found.map(({ line, col, severity, code, message }) => Object.assign(
        new vscode.Diagnostic(new vscode.Range(line - 1, col - 1, line - 1, col - 1), message, severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning),
        { code, source: 'plm' })));
    }
    treeChanged.fire();
  };

  // VS-03.1, VS-03.4
  const showRequirements = async (found: Entry) => {
    const repo = open(), states = statesOf(repo);
    const link = (target: Entry) => `command:vscode.open?${encodeURIComponent(JSON.stringify([fileUri(target.item.path)]))}`;
    const panel = vscode.window.createWebviewPanel('plm.requirements', `${found.item.data.title} requirements`, vscode.ViewColumn.Active, { enableCommandUris: ['vscode.open', 'plm.reviewLink'] });
    panel.webview.html = await vscode.commands.executeCommand<string>('markdown.api.render', logic.requirementsMarkdown(repo, found.id, link, states, coverage(repo, states, found.id), suspects(repo, states, found.id)));
  };

  // VS-04.2
  const reviewLink = (source: string, target: string) => {
    const repo = open();
    const link = linksOf(entry(repo, source)).find((found) => found.target === target)!;
    const { commit, diff } = link.version ? changeSince(repo, link) : { commit: '', diff: String(entry(repo, targetId(target)).item.doc) };
    const change = link.version && !commit ? 'No commit has the confirmed version' : diff || 'No change';
    const panel = vscode.window.createWebviewPanel('plm.review', target, vscode.ViewColumn.Active, { enableScripts: true });
    panel.webview.html = logic.reviewHtml(repo, source, link, change, validate(repo));
    panel.webview.onDidReceiveMessage(reporting((confirmed: number) => {
      const now = open();
      if (confirmed) confirm(now, currentVersions(now), validate(now), source, target);
      refresh();
      panel.dispose();
    }));
  };

  // VS-01.2
  const editItem = (row?: Pick<Entry, 'id'>) => {
    const repo = open();
    const id = row?.id ?? activeItem(repo);
    if (!id) return;
    const found = entry(repo, id);
    const check = itemSchema(root, found.item.data.type);
    if (!check) throw new Error(`Unknown item type ${found.item.data.type}`);
    const fields = logic.formFields(check.schema as never);
    const panel = vscode.window.createWebviewPanel('plm.form', id, vscode.ViewColumn.Active, { enableScripts: true });
    panel.webview.html = logic.formHtml(`${id} ${found.item.data.title}`, fields, { ...found.item.data, ...found.meta.data });
    panel.webview.onDidReceiveMessage(({ save, values }) => {
      const [item, meta] = [found.item.doc.clone(), found.meta.doc.clone()];
      logic.applyForm(item, meta, fields, values);
      check(item.toJS());
      panel.webview.postMessage((check.errors ?? []).map((error) => `${error.instancePath.slice(1) || 'item'} ${error.message}`).join('\n'));
      if (!save) return;
      writeYaml(root, { path: found.item.path, doc: item });
      writeYaml(root, { path: found.meta.path, doc: meta });
      refresh();
    });
  };

  // VS-01.5
  const createItem = async (at?: Entry) => {
    const type = await vscode.window.showQuickPick(Object.keys(open().settings.prefixes ?? {}).filter((type) => type !== 'test-run'));
    const title = type && await vscode.window.showInputBox({ prompt: 'Title' });
    if (!title) return;
    editItem({ id: newItem(open(), type, title, join(root, at?.path ?? '')) });
    refresh();
  };

  // VS-06.1
  const recordTestRun = async () => {
    const repo = open();
    const items = (type?: string) => [...repo.entries.values()]
      .filter((found) => !type || found.item.data.type === type).map((found) => ({ label: found.id, description: found.item.data.title }));
    const testCases = (await vscode.window.showQuickPick(items('test-case'), { placeHolder: 'Test cases', canPickMany: true }))?.map((picked) => picked.label);
    if (!testCases?.length) return;
    const sut = await vscode.window.showQuickPick(items(), { placeHolder: 'System under test' });
    if (!sut) return;
    const picked: string[] = [];
    for (const testCase of testCases) {
      const result = await vscode.window.showQuickPick(results, { placeHolder: `Result of ${testCase}` });
      if (!result) return;
      picked.push(result);
    }
    const logs = await vscode.window.showOpenDialog({ canSelectMany: true, openLabel: 'Attach logs' }) ?? [];
    vscode.window.showInformationMessage(`Recorded ${recordRun(repo, testCases, sut.label, picked, logs.map((log) => log.fsPath))}`);
  };

  // VS-04.3
  const yaml = { pattern: '**/*.yaml' };
  const atId = <T>(use: (found: Entry, repo: Repo, document: vscode.TextDocument) => T) => (document: vscode.TextDocument, position: vscode.Position) => {
    const repo = open();
    const found = repo.entries.get(document.getText(document.getWordRangeAtPosition(position, /[\w-]+/)));
    return found && use(found, repo, document);
  };

  // Core refusals become error messages.
  const reporting = (command: Function) => async (...args: unknown[]) => {
    try { await command(...args); } catch (error) { vscode.window.showErrorMessage((error as Error).message); }
  };
  const register = (name: string, command: Function) => vscode.commands.registerCommand(name, reporting(command));

  context.subscriptions.push(
    diagnostics,
    vscode.window.registerTreeDataProvider('plm.tree', tree),
    register('plm.editItem', editItem),
    register('plm.newItem', createItem),
    register('plm.showRequirements', showRequirements),
    register('plm.reviewLink', reviewLink),
    register('plm.recordTestRun', recordTestRun),
    vscode.languages.registerHoverProvider(yaml, { provideHover: atId((found, repo, document) => ({ contents: [Object.assign(
      new vscode.MarkdownString(logic.hoverMarkdown(repo, statesOf(repo), found.id, activeItem(repo, document.uri.fsPath))), { isTrusted: { enabledCommands: ['plm.reviewLink'] } })] })) }),
    vscode.languages.registerDefinitionProvider(yaml, { provideDefinition: atId((found) => new vscode.Location(fileUri(found.item.path), new vscode.Position(0, 0))) }),
    vscode.workspace.onDidSaveTextDocument(refresh),
  );
  refresh();
}
