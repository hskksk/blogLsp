import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  CompletionItem,
  InitializeParams,
  InitializeResult,
  DidChangeConfigurationNotification
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  hasConfigurationCapability = !!(params.capabilities.workspace && params.capabilities.workspace.configuration);

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ['\n', '.', ' ']
      }
    }
  };
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
});

connection.onCompletion((_params): CompletionItem[] => {
  return [
    {
      label: 'Hello from Blog LSP',
      detail: 'Sample completion',
      insertText: '（ここに LLM 補完が入ります）'
    }
  ];
});

documents.listen(connection);
connection.listen();

