import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6009'] } }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'markdown' }],
    synchronize: {
      configurationSection: 'blogLsp'
    }
  };

  client = new LanguageClient('blogLsp', 'Blog Markdown LSP', serverOptions, clientOptions);
  context.subscriptions.push(client);
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}

