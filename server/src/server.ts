import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  InitializeParams,
  InitializeResult,
  DidChangeConfigurationNotification,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ConfigurationManager } from './config/manager';
import { CompletionHandler } from './handlers/completion-handler';
import { DocumentSymbolHandler } from './handlers/document-symbol-handler';
import { HoverHandler } from './handlers/hover-handler';
import { CommandHandler } from './handlers/command-handler';
import { CodeActionHandler } from './handlers/code-action-handler';
import type { InitConfigOptions } from './config/types';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// 設定管理マネージャー
const configManager = new ConfigurationManager(connection);

// ハンドラー
const completionHandler = new CompletionHandler(
  connection,
  documents,
  configManager
);
const documentSymbolHandler = new DocumentSymbolHandler(connection, documents);
const hoverHandler = new HoverHandler(connection, documents);
const commandHandler = new CommandHandler(
  connection,
  documents,
  configManager
);
const codeActionHandler = new CodeActionHandler(
  connection,
  documents,
  configManager
);

connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {
  const hasConfigurationCapability = !!(
    params.capabilities.workspace && params.capabilities.workspace.configuration
  );

  configManager.setConfigurationCapability(hasConfigurationCapability);

  // デバッグ: 初期化オプションをログ出力
  connection.console.log(
    `Initialization options received: ${JSON.stringify(
      params.initializationOptions
        ? Object.keys(params.initializationOptions)
        : 'null/undefined'
    )}`
  );

  // 初期化オプションから設定を取得（Client側からシークレットを含めて送られる）
  if (params.initializationOptions) {
    try {
      const initConfig = params.initializationOptions as InitConfigOptions;
      connection.console.log(
        `Initialization config keys: ${JSON.stringify(
          Object.keys(initConfig || {})
        )}`
      );
      connection.console.log(`Has API key: ${!!initConfig.apiKey}`);

      if (initConfig.apiKey) {
        // 初期化時に設定を適用
        await configManager.updateConfigurationFromInit(initConfig);
      } else {
        connection.console.warn('API key not found in initialization options');
      }
    } catch (error) {
      connection.console.error(
        `Failed to process initialization options: ${error}`
      );
    }
  } else {
    connection.console.warn('Initialization options is null or undefined');
  }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ['\n', '.', ' ', '#'],
        resolveProvider: false,
      },
      documentSymbolProvider: true,
      hoverProvider: true,
      codeActionProvider: {
        resolveProvider: false,
      },
      /*
      executeCommandProvider: {
        commands: [
          'blogLsp.completeSelection',
          'blogLsp.completeParagraph',
          'blogLsp.insertHeading',
        ],
      },
      */
    },
  };
  return result;
});

connection.onInitialized(async () => {
  if (configManager.hasCapability()) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
    await configManager.updateConfiguration();
  }
});

// 設定変更を監視
connection.onDidChangeConfiguration(async () => {
  await configManager.updateConfiguration();
});

// 補完ハンドラー
connection.onCompletion(async (params) => {
  return completionHandler.handleCompletion(params);
});

// ドキュメントシンボルハンドラー
connection.onDocumentSymbol(async (params) => {
  return documentSymbolHandler.handleDocumentSymbol(params);
});

// ホバーハンドラー
connection.onHover(async (params) => {
  return hoverHandler.handleHover(params);
});

// コマンドハンドラー
connection.onExecuteCommand(async (params) => {
  return commandHandler.handleExecuteCommand(params);
});

// コードアクションハンドラー
connection.onCodeAction(async (params) => {
  return codeActionHandler.handleCodeAction(params);
});

documents.listen(connection);
connection.listen();
