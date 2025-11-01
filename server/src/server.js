"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_1 = require("vscode-languageserver/node");
var vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
var connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
var documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
var hasConfigurationCapability = false;
connection.onInitialize(function (params) {
    hasConfigurationCapability = !!(params.capabilities.workspace && params.capabilities.workspace.configuration);
    var result = {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
            completionProvider: {
                triggerCharacters: ['\n', '.', ' ']
            }
        }
    };
    return result;
});
connection.onInitialized(function () {
    if (hasConfigurationCapability) {
        connection.client.register(node_1.DidChangeConfigurationNotification.type, undefined);
    }
});
connection.onCompletion(function (_params) {
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
