import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

/**
 * シークレットストレージからAPIキーを取得して設定にマージ
 */
async function getConfigurationWithSecrets(context: vscode.ExtensionContext): Promise<any> {
  const config = vscode.workspace.getConfiguration('blogLsp');
  const secretStorage = context.secrets;

  // シークレットストレージからAPIキーを取得
  const secretApiKey = await secretStorage.get('blogLsp.apiKey');
  
  // 設定を取得して、シークレットがあればそれを使用
  const configObject: any = {};
  
  // 全ての設定をコピー
  const keys = ['provider', 'model', 'apiBaseUrl', 'apiKey', 'maxTokens', 'temperature', 
                'reasoningEffort', 'verbosity', 'numSuggestions', 'style', 'language', 'privacy', 
                'enableStreaming', 'timeoutMs'];
  
  for (const key of keys) {
    if (key === 'privacy') {
      configObject[key] = {
        scope: config.get('privacy.scope', 'paragraph')
      };
    } else {
      configObject[key] = config.get(key);
    }
  }
  
  // シークレットストレージにAPIキーがある場合はそれを使用、なければ設定値を使用
  if (secretApiKey) {
    configObject.apiKey = secretApiKey;
  } else if (configObject.apiKey && typeof configObject.apiKey === 'string' && configObject.apiKey.startsWith('${env:')) {
    // 環境変数の場合はそのまま
    const envVarName = configObject.apiKey.slice(6, -1);
    configObject.apiKey = process.env[envVarName] || configObject.apiKey;
  }
  
  return configObject;
}

/**
 * APIキーを設定する
 */
async function setApiKey(context: vscode.ExtensionContext): Promise<void> {
  const apiKey = await vscode.window.showInputBox({
    prompt: 'Enter your API key for the LLM provider',
    password: true,
    ignoreFocusOut: true,
    placeHolder: 'sk-...',
  });
  
  if (apiKey) {
    await context.secrets.store('blogLsp.apiKey', apiKey);
    vscode.window.showInformationMessage('API key saved securely');
    
    // 設定を再読み込み（Server側に通知）
    if (client) {
      // 設定変更イベントをトリガー
      await vscode.workspace.getConfiguration('blogLsp').update('apiKey', '', vscode.ConfigurationTarget.Global);
    }
  }
}

/**
 * APIキーを削除する
 */
async function deleteApiKey(context: vscode.ExtensionContext): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    'Are you sure you want to delete the stored API key?',
    { modal: true },
    'Delete'
  );
  
  if (confirm === 'Delete') {
    await context.secrets.delete('blogLsp.apiKey');
    vscode.window.showInformationMessage('API key deleted');
  }
}

/**
 * 初回起動時またはAPIキー未設定時に通知
 */
async function checkApiKey(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration('blogLsp');
  const secretStorage = context.secrets;
  
  const secretApiKey = await secretStorage.get('blogLsp.apiKey');
  const configApiKey = config.get<string>('apiKey');
  
  // APIキーが設定されていない場合
  if (!secretApiKey && (!configApiKey || configApiKey === '${env:OPENAI_API_KEY}')) {
    const action = await vscode.window.showInformationMessage(
      'Blog LSP: API key is not configured. Please set your API key to enable LLM completions.',
      'Set API Key',
      'Later'
    );
    
    if (action === 'Set API Key') {
      await setApiKey(context);
    }
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6009'] } }
  };

  // 初期化オプションを事前に解決（vscode-languageclientは解決済みの値またはプロミスを受け取る）
  // 重要: プロミスを直接渡すのではなく、awaitで解決してから渡すか、プロミス自体を渡す
  // ただし、LanguageClientのstart()が呼ばれる前に解決される必要がある
  const initOptions = await getConfigurationWithSecrets(context);
  
  // デバッグ用: 実際の値を確認
  console.log('[Client] Initialization options prepared:', Object.keys(initOptions || {}));
  console.log('[Client] Has API key:', !!(initOptions && (initOptions as any).apiKey));
  
  // 設定同期時にシークレットをマージ
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'markdown' }],
    synchronize: {
      configurationSection: 'blogLsp',
    },
    initializationOptions: initOptions,
    // 開発モードでのみデバッグミドルウェアを有効化
    ...(process.env.NODE_ENV === 'development' || process.env.BLOGLSP_DEBUG === 'true' ? {
      middleware: {
        provideCompletionItem: async (document, position, context, token, next) => {
          const startTime = Date.now();
          console.log('[Client] Completion request started at:', startTime);
          
          let result;
          try {
            result = await next(document, position, context, token);
            const duration = Date.now() - startTime;
            console.log(`[Client] Completion response received after ${duration}ms`);
          } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[Client] Completion request failed after ${duration}ms:`, error);
            throw error;
          }
          
          console.log('[Client] Raw result:', {
            type: typeof result,
            constructor: result?.constructor?.name,
            isNull: result === null,
            isUndefined: result === undefined,
            json: JSON.stringify(result, null, 2),
          });
          
          if (Array.isArray(result)) {
            result.forEach((item, index) => {
              console.log(`[Client] Completion item ${index + 1}:`, {
                label: item.label,
                kind: item.kind,
                hasTextEdit: !!item.textEdit,
              });
              
              // エラー検出
              if (!item.textEdit && !item.insertText) {
                console.warn(`[Client] WARNING: Completion item ${index + 1} has neither insertText nor textEdit!`);
              }
            });
          } else if (result && 'items' in result) {
            console.log('[Client] CompletionList received:', {
              isIncomplete: result.isIncomplete,
              itemCount: result.items.length,
            });
          } else if (result == null) {
            console.warn('[Client] WARNING: Server returned null/undefined instead of completion items');
            return [];
          }
          
          return result;
        },
      },
    } : {}),
  };

  client = new LanguageClient('blogLsp', 'Blog Markdown LSP', serverOptions, clientOptions);
  context.subscriptions.push(client);
  
  // コマンドを登録
  const setApiKeyCommand = vscode.commands.registerCommand(
    'blogLsp.setApiKey',
    async () => {
      await setApiKey(context);
      // 設定変更を通知（サーバーを再起動）
      if (client && client.isRunning()) {
        await client.stop();
        await client.start();
      }
    }
  );

  const deleteApiKeyCommand = vscode.commands.registerCommand(
    'blogLsp.deleteApiKey',
    async () => {
      await deleteApiKey(context);
      // 設定変更を通知（サーバーを再起動）
      if (client && client.isRunning()) {
        await client.stop();
        await client.start();
      }
    }
  );

  context.subscriptions.push(setApiKeyCommand, deleteApiKeyCommand);
  
  // 設定変更を監視して、サーバー側に通知
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('blogLsp')) {
        // サーバー側で設定変更を処理（onDidChangeConfigurationで処理される）
        if (client && client.isRunning()) {
          // 設定変更イベントは自動的にLanguageClientによって処理される
        }
      }
    })
  );
  
  // 初回起動時のAPIキーチェック
  await checkApiKey(context);
  
  await client.start();
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}

