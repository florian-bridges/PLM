// VS-01–VS-06: VS Code glue.
import { join, relative } from 'node:path';
import * as vscode from 'vscode';
import { changeSince, confirm, coverage, link, linkStates, recordRun, suspects } from '../../src/links.ts';
import { childrenOf, entry, findRoot, innermostItem, linksOf, loadRepo, newItem, setConfig, targetId, type Entry, type Repo } from '../../src/repo.ts';
import { results } from '../../src/schemas.ts';
import { validate } from '../../src/validate.ts';
import { currentVersions } from '../../src/version.ts';
import * as logic from './logic.ts';

export function activate(context: vscode.ExtensionContext) {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  const root = findRoot(folder.uri.fsPath);
  const open = () => loadRepo(root);
  const fileUri = (path: string) => vscode.Uri.file(join(root, path));
  const statesOf = (repo: Repo) => linkStates(repo, currentVersions(repo));
  // VS-04.3
  const activeItem = (repo: Repo, file = vscode.window.activeTextEditor?.document.uri.fsPath) => file && innermostItem(repo, relative(root, file));

  const diagnostics = vscode.languages.createDiagnosticCollection('plm');
  const decorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();

  // VS-02.1, VS-02.3
  const icons: Record<string, string> = { assembly: 'layers', part: 'package' };
  const treeChanged = new vscode.EventEmitter<void>();
  const tree: vscode.TreeDataProvider<Entry & { quantity?: number }> = {
    onDidChangeTreeData: treeChanged.event,
    getTreeItem: (found) => Object.assign(new vscode.TreeItem(`${found.id} ${found.item.data.title}${found.quantity ? ` ×${found.quantity}` : ''}`, vscode.TreeItemCollapsibleState[childrenOf(found).length ? 'Collapsed' : 'None']), {
      description: found.meta.data.status, iconPath: new vscode.ThemeIcon(icons[found.item.data.type] ?? 'symbol-misc'),
      command: { title: 'Open', command: 'vscode.open', arguments: [fileUri(found.item.path)] },
    }),
    getChildren: (row) => logic.withQuantities(row, logic.productTree(open(), row?.id)),
  };

  // VS-01.3
  const refresh = () => {
    diagnostics.clear();
    for (const [file, found] of logic.diagnosticsOf(validate(open()))) {
      diagnostics.set(fileUri(file), found.map(({ line, col, severity, code, message }) => Object.assign(
        new vscode.Diagnostic(new vscode.Range(line - 1, col - 1, line - 1, col - 1), message, severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning),
        { code, source: 'plm' })));
    }
    treeChanged.fire();
    decorations.fire(undefined);
  };

  // VS-03.1, VS-03.4
  const showRequirements = async (found: Entry) => {
    const repo = open(), states = statesOf(repo);
    const toFile = (target: Entry) => `command:vscode.open?${encodeURIComponent(JSON.stringify([fileUri(target.item.path)]))}`;
    const panel = vscode.window.createWebviewPanel('plm.requirements', `${found.item.data.title} requirements`, vscode.ViewColumn.Active, { enableCommandUris: ['vscode.open', 'plm.reviewLink'] });
    panel.webview.html = await vscode.commands.executeCommand<string>('markdown.api.render', logic.requirementsMarkdown(repo, found.id, toFile, states, coverage(repo, states, found.id), suspects(repo, states, found.id)));
  };

  // VS-04.3, VS-04.4
  const reviewLink = async (source: string, target: string) => {
    const repo = open(), current = linksOf(entry(repo, source)).find((l) => l.target === target)!;
    const picked = await vscode.window.showQuickPick(['Diff', 'Confirm', 'Remove']);
    if (picked === 'Diff') {
      const { diff } = current.version ? changeSince(repo, current) : { diff: String(entry(repo, targetId(target)).item.doc) };
      const doc = await vscode.workspace.openTextDocument({ content: diff || 'No change', language: 'diff' });
      return void vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
    }
    if (picked === 'Confirm') confirm(repo, currentVersions(repo), validate(repo), source, target);
    else if (picked === 'Remove') link(repo, source, current.type, target, true);
    if (picked) refresh();
  };

  // VS-01.2
  vscode.extensions.getExtension('redhat.vscode-yaml')?.activate().then((api: any) => api.registerContributor('plm',
    (uri: string) => { const id = logic.schemaIdFor(open(), relative(root, vscode.Uri.parse(uri).fsPath)); return id && `plm://${id}`; },
    (uri: string) => logic.schemaOf(open(), uri.slice(6))));

  // VS-01.5
  const createItem = async (at?: Entry) => {
    const type = await vscode.window.showQuickPick(logic.itemTypes(open()));
    const title = type && await vscode.window.showInputBox({ prompt: 'Title' });
    if (!title) return;
    const { path } = newItem(open(), type, title, join(root, at?.path ?? ''));
    vscode.commands.executeCommand('vscode.open', fileUri(path));
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
    vscode.window.showInformationMessage(`Recorded ${recordRun(repo, testCases, [sut.label], picked, logs.map((log) => log.fsPath))}`);
  };

  // VS-02.4
  const configBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  configBar.command = 'plm.pickConfig';
  let configText = '';
  const showConfig = () => { configBar.text = logic.configLabel(configText); configBar.show(); };
  const pickConfig = async () => {
    const picked = await vscode.window.showInputBox({ prompt: 'config (CO-01.6)', value: configText });
    if (picked === undefined) return;
    setConfig(open(), configText = picked);
    showConfig();
    refresh();
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
    diagnostics, configBar,
    vscode.window.registerTreeDataProvider('plm.tree', tree),
    register('plm.newItem', createItem),
    register('plm.showRequirements', showRequirements),
    register('plm.reviewLink', reviewLink),
    register('plm.recordTestRun', recordTestRun),
    register('plm.pickConfig', pickConfig),
    // VS-02.6
    vscode.languages.registerDocumentSymbolProvider(yaml, { provideDocumentSymbols: (document) => {
      const repo = open(), range = new vscode.Range(0, 0, document.lineCount, 0);
      return logic.breadcrumbChain(repo, innermostItem(repo, relative(root, document.uri.fsPath))).reduceRight((children, id) =>
        [Object.assign(new vscode.DocumentSymbol(entry(repo, id).item.data.title, id, vscode.SymbolKind.Object, range, range), { children })], [] as vscode.DocumentSymbol[]);
    } }),
    // VS-04.4
    vscode.languages.registerCodeLensProvider(yaml, { provideCodeLenses: (document) => {
      const repo = open(), file = relative(root, document.uri.fsPath), id = innermostItem(repo, file), found = id && entry(repo, id);
      return found && found.item.path === file ? logic.suspectLines(found, statesOf(repo)).map(({ line, state }) =>
        new vscode.CodeLens(document.lineAt(line - 1).range, { title: 'Review link', command: 'plm.reviewLink', arguments: [state.source, state.link.target] })) : [];
    } }),
    // VS-04.6
    vscode.window.registerFileDecorationProvider({ onDidChangeFileDecorations: decorations.event, provideFileDecoration: (uri) => {
      const repo = open(), id = innermostItem(repo, relative(root, uri.fsPath));
      return id && logic.hasSuspect(statesOf(repo), id) ? { badge: '!', color: new vscode.ThemeColor('errorForeground') } : undefined;
    } }),
    vscode.languages.registerHoverProvider(yaml, { provideHover: atId((found, repo, document) => ({ contents: [Object.assign(
      new vscode.MarkdownString(logic.hoverMarkdown(repo, statesOf(repo), found.id, activeItem(repo, document.uri.fsPath))), { isTrusted: { enabledCommands: ['plm.reviewLink'] } })] })) }),
    vscode.languages.registerDefinitionProvider(yaml, { provideDefinition: atId((found) => new vscode.Location(fileUri(found.item.path), new vscode.Position(0, 0))) }),
    vscode.workspace.onDidSaveTextDocument(refresh),
  );
  showConfig();
  refresh();
}
