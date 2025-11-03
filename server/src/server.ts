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

// Configuration Manager
const configManager = new ConfigurationManager(connection);

// Handlers
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

  // Debug: log initialization options
  connection.console.log(
    `Initialization options received: ${JSON.stringify(
      params.initializationOptions
        ? Object.keys(params.initializationOptions)
        : 'null/undefined'
    )}`
  );

  // Get configuration from initialization options (secrets are sent from client)
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
        // Apply configuration at initialization
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
      executeCommandProvider: {
        commands: [
          'blogLsp.completeSelection',
          'blogLsp.completeParagraph',
          'blogLsp.insertHeading',
        ],
      },
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

// Monitor configuration changes
connection.onDidChangeConfiguration(async () => {
  await configManager.updateConfiguration();
});

// Completion Handler
connection.onCompletion(async (params) => {
  return completionHandler.handleCompletion(params);
});

// Document Symbol Handler
connection.onDocumentSymbol(async (params) => {
  return documentSymbolHandler.handleDocumentSymbol(params);
});

// Hover Handler
connection.onHover(async (params) => {
  return hoverHandler.handleHover(params);
});

// Command Handler
connection.onExecuteCommand(async (params) => {
  return commandHandler.handleExecuteCommand(params);
});

// Code Action Handler
connection.onCodeAction(async (params) => {
  return codeActionHandler.handleCodeAction(params);
});

documents.listen(connection);
connection.listen();
