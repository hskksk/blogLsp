"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
var path = require("path");
var node_1 = require("vscode-languageclient/node");
var client;
function activate(context) {
    var serverModule = context.asAbsolutePath(path.join('..', 'server', 'dist', 'server.js'));
    var serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: { module: serverModule, transport: node_1.TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6009'] } }
    };
    var clientOptions = {
        documentSelector: [{ language: 'markdown' }],
        synchronize: {
            configurationSection: 'blogLsp'
        }
    };
    client = new node_1.LanguageClient('blogLsp', 'Blog Markdown LSP', serverOptions, clientOptions);
    context.subscriptions.push(client);
    client.start();
}
function deactivate() {
    return client === null || client === void 0 ? void 0 : client.stop();
}
