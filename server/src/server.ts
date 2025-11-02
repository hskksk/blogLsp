import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  CompletionParams,
  InitializeParams,
  InitializeResult,
  DidChangeConfigurationNotification,
  DocumentSymbolParams,
  HoverParams,
  Hover,
  MarkupKind,
  CodeActionParams,
  CodeAction,
  Command,
  ExecuteCommandParams,
  WorkspaceEdit,
  TextEdit,
  Range as LspRange,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type {
  BlogLspConfig,
  LlmProvider,
} from '@bloglsp/shared';
import {
  createLlmProvider,
  buildCompletionPrompt,
  buildHeadingSuggestionPrompt,
  buildParagraphCompletionPrompt,
  extractContextLines,
  buildCompletionItems,
  buildHeadingCompletionItems,
  extractHeadings,
  findNearestHeadingBefore,
  isHeadingAtPosition,
  findNextHeading,
  type HeadingInfo,
} from '@bloglsp/shared';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let currentConfig: BlogLspConfig | null = null;
let llmProvider: LlmProvider | null = null;

/**
 * VS Code設定からBlogLspConfigを取得
 * 注意: シークレットストレージのAPIキーは初期化オプション経由でのみ取得可能
 */
async function getConfiguration(): Promise<BlogLspConfig | null> {
  if (!hasConfigurationCapability) {
    return null;
  }

  try {
    const config = await connection.workspace.getConfiguration('blogLsp');
    
    // 環境変数からAPIキーを取得（設定で${env:VAR_NAME}形式の場合）
    let apiKey = config.apiKey;
    if (apiKey && typeof apiKey === 'string' && apiKey.startsWith('${env:') && apiKey.endsWith('}')) {
      const envVarName = apiKey.slice(6, -1);
      apiKey = process.env[envVarName] || apiKey;
    }
    
    // シークレットストレージのAPIキーは初期化オプション経由で既に設定されているはず
    // ここでは設定ファイルからの値のみを取得（空の場合は既存のcurrentConfigを使用）

    const blogLspConfig: BlogLspConfig = {
      provider: config.provider || 'openai',
      model: config.model || 'gpt-4.1-nano',
      apiBaseUrl: config.apiBaseUrl,
      apiKey: currentConfig?.apiKey || apiKey, // 既存のAPIキーを保持
      maxTokens: config.maxTokens, // オプショナル（gpt-5系では使用しない）
      temperature: config.temperature, // オプショナル（gpt-5系では使用しない）
      numSuggestions: config.numSuggestions || 1,
      style: config.style || 'tech-blog',
      language: config.language || 'ja',
      privacy: {
        scope: config.privacy?.scope || 'paragraph',
      },
      enableStreaming: config.enableStreaming || false,
      timeoutMs: config.timeoutMs || 50000,
      reasoningEffort: config.reasoningEffort, // gpt-5系で使用
      verbosity: config.verbosity, // gpt-5系で使用
    };

    return blogLspConfig;
  } catch (error) {
    connection.console.error(`Failed to get configuration: ${error}`);
    return null;
  }
}

/**
 * 初期化オプションから設定を更新
 */
async function updateConfigurationFromInit(initConfig: any): Promise<void> {
  try {
    const blogLspConfig: BlogLspConfig = {
      provider: initConfig.provider || 'openai',
      model: initConfig.model || 'gpt-4.1-nano',
      apiBaseUrl: initConfig.apiBaseUrl,
      apiKey: initConfig.apiKey,
      maxTokens: initConfig.maxTokens, // オプショナル（gpt-5系では使用しない）
      temperature: initConfig.temperature, // オプショナル（gpt-5系では使用しない）
      numSuggestions: initConfig.numSuggestions || 2,
      style: initConfig.style || 'tech-blog',
      language: initConfig.language || 'ja',
      privacy: {
        scope: initConfig.privacy?.scope || 'paragraph',
      },
      enableStreaming: initConfig.enableStreaming || false,
      timeoutMs: initConfig.timeoutMs || 20000,
      reasoningEffort: initConfig.reasoningEffort, // gpt-5系で使用
      verbosity: initConfig.verbosity, // gpt-5系で使用
    };

    currentConfig = blogLspConfig;
    llmProvider = createLlmProvider(blogLspConfig);
    connection.console.log(`LLM provider initialized: ${llmProvider.name}`);
  } catch (error) {
    connection.console.error(`Failed to initialize LLM provider from init options: ${error}`);
  }
}

/**
 * 設定を更新し、LLMプロバイダを再初期化
 */
async function updateConfiguration(): Promise<void> {
  const newConfig = await getConfiguration();
  
  if (newConfig && (!currentConfig || JSON.stringify(currentConfig) !== JSON.stringify(newConfig))) {
    currentConfig = newConfig;
    
    try {
      llmProvider = createLlmProvider(newConfig);
      connection.console.log(`LLM provider updated: ${llmProvider.name}`);
    } catch (error) {
      connection.console.error(`Failed to create LLM provider: ${error}`);
      llmProvider = null;
    }
  }
}

/**
 * 補完機能の設定を取得
 */
async function getCompletionSettings(): Promise<{
  triggerOnHeading: boolean;
  maxHeadingSuggestions: number;
  maxTextSuggestions: number;
}> {
  if (!hasConfigurationCapability) {
    return {
      triggerOnHeading: true,
      maxHeadingSuggestions: 3,
      maxTextSuggestions: 1,
    };
  }

  try {
    const config = await connection.workspace.getConfiguration('blogLsp');
    return {
      triggerOnHeading: config.completion?.triggerOnHeading ?? true,
      maxHeadingSuggestions: config.completion?.maxHeadingSuggestions ?? 3,
      maxTextSuggestions: config.completion?.maxTextSuggestions ?? 1,
    };
  } catch (error) {
    connection.console.error(`Failed to get completion settings: ${error}`);
    return {
      triggerOnHeading: true,
      maxHeadingSuggestions: 3,
      maxTextSuggestions: 1,
    };
  }
}

/**
 * コマンド機能の設定を取得
 */
async function getCommandSettings(): Promise<{
  enableHeadingGeneration: boolean;
  enableParagraphCompletion: boolean;
}> {
  if (!hasConfigurationCapability) {
    return {
      enableHeadingGeneration: true,
      enableParagraphCompletion: true,
    };
  }

  try {
    const config = await connection.workspace.getConfiguration('blogLsp');
    return {
      enableHeadingGeneration: config.commands?.enableHeadingGeneration ?? true,
      enableParagraphCompletion: config.commands?.enableParagraphCompletion ?? true,
    };
  } catch (error) {
    connection.console.error(`Failed to get command settings: ${error}`);
    return {
      enableHeadingGeneration: true,
      enableParagraphCompletion: true,
    };
  }
}

connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {
  hasConfigurationCapability = !!(
    params.capabilities.workspace && params.capabilities.workspace.configuration
  );

  // デバッグ: 初期化オプションをログ出力
  connection.console.log(`Initialization options received: ${JSON.stringify(params.initializationOptions ? Object.keys(params.initializationOptions) : 'null/undefined')}`);
  
  // 初期化オプションから設定を取得（Client側からシークレットを含めて送られる）
  if (params.initializationOptions) {
    try {
      const initConfig = params.initializationOptions as any;
      connection.console.log(`Initialization config keys: ${JSON.stringify(Object.keys(initConfig || {}))}`);
      connection.console.log(`Has API key: ${!!initConfig.apiKey}`);
      
      if (initConfig.apiKey) {
        // 初期化時に設定を適用
        await updateConfigurationFromInit(initConfig);
      } else {
        connection.console.warn('API key not found in initialization options');
      }
    } catch (error) {
      connection.console.error(`Failed to process initialization options: ${error}`);
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
          'bloglsp.completeSelection',
          'bloglsp.completeParagraph',
          'bloglsp.insertHeading',
        ],
      },
      */
    },
  };
  return result;
});

connection.onInitialized(async () => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
    await updateConfiguration();
  }
});

// 設定変更を監視
connection.onDidChangeConfiguration(async () => {
  await updateConfiguration();
});

/**
 * 補完を生成
 */
connection.onCompletion(async (params: CompletionParams) => {
  try {
    // 設定とプロバイダを確認
    if (!currentConfig || !llmProvider) {
      connection.console.warn('Configuration or LLM provider not available');
      await updateConfiguration();
      
      if (!currentConfig || !llmProvider) {
        return [];
      }
    }

    // ドキュメントを取得
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      connection.console.warn(`Document not found: ${params.textDocument.uri}`);
      return [];
    }

    const text = document.getText();
    const position = params.position;

    // コンテキスト行を抽出
    const context = extractContextLines(text, position, 5, 5);
    
    if (!context.currentLine) {
      return [];
    }

    // 補完設定を取得
    const completionSettings = await getCompletionSettings();

    // トリガー文字とトリガー種別を確認
    const triggerCharacter = params.context?.triggerCharacter;
    const triggerKind = params.context?.triggerKind;
    
    // 見出し補完の場合（#がトリガー文字、または現在行が#で始まっている場合）
    // ただし、設定で無効化されている場合は通常補完にフォールバック
    const isHeadingCompletion = completionSettings.triggerOnHeading &&
                                (triggerCharacter === '#' || 
                                 (triggerKind === 1 && context.currentText.trim().startsWith('#')));

    let prompt: string;
    let completionItems;

    if (isHeadingCompletion) {
      // 見出し補完プロンプトを使用
      prompt = buildHeadingSuggestionPrompt({
        linesBefore: context.linesBefore,
        currentLine: context.currentLine,
        linesAfter: context.linesAfter,
        config: currentConfig,
      });

      connection.console.log(`Generating heading suggestions with prompt length: ${prompt.length}`);

      // LLMで見出し候補を生成（独立したパラメータを使用）
      const headings = await llmProvider.generateCompletions(
        {
          prompt,
          language: currentConfig.language,
          maxTokens: currentConfig.maxTokens,
          temperature: currentConfig.temperature,
          numSuggestions: completionSettings.maxHeadingSuggestions,
        }
      );

      // 見出しCompletionItemに変換
      completionItems = buildHeadingCompletionItems({
        completions: headings,
        position,
        currentText: context.currentText,
      });

      connection.console.log(`Generated ${completionItems.length} heading suggestions`);
    } else {
      // 通常の文章補完プロンプトを使用
      // 改行後（\nがトリガー）の場合は段落開始を提案
      const isNewParagraph = triggerCharacter === '\n' || 
                            (triggerKind === 1 && context.currentLine.trim().length === 0);
      
      if (isNewParagraph) {
        // 新しい段落の開始を提案するプロンプト
        prompt = buildCompletionPrompt({
          currentText: context.currentText,
          linesBefore: context.linesBefore,
          linesAfter: context.linesAfter,
          config: currentConfig,
        });
        // プロンプトに段落開始であることを明示（既存のプロンプトで対応可能）
      } else {
        // 通常の文章補完
        prompt = buildCompletionPrompt({
          currentText: context.currentText,
          linesBefore: context.linesBefore,
          linesAfter: context.linesAfter,
          config: currentConfig,
        });
      }

      connection.console.log(`Generating text completions with prompt length: ${prompt.length}`);

      // LLMで補完を生成（独立したパラメータを使用）
      const completions = await llmProvider.generateCompletions(
        {
          prompt,
          language: currentConfig.language,
          maxTokens: currentConfig.maxTokens,
          temperature: currentConfig.temperature,
          numSuggestions: completionSettings.maxTextSuggestions,
        }
      );

      // CompletionItemに変換
      completionItems = buildCompletionItems({
        completions,
        position,
        currentText: context.currentText,
      });

      connection.console.log(`Generated ${completionItems.length} text completions`);
    }
    
    return completionItems;
  } catch (error) {
    connection.console.error(`Error generating completions: ${error}`);
    
    // エラー時は空の配列を返す
    return [];
  }
});

/**
 * ドキュメントシンボル（見出し階層）を返す
 */
connection.onDocumentSymbol(async (params: DocumentSymbolParams) => {
  try {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      connection.console.warn(`Document not found: ${params.textDocument.uri}`);
      return [];
    }

    const text = document.getText();
    const symbols = extractHeadings(text);

    connection.console.log(`Extracted ${symbols.length} heading symbols`);
    
    return symbols;
  } catch (error) {
    connection.console.error(`Error extracting document symbols: ${error}`);
    
    // エラー時は空の配列を返す
    return [];
  }
});

/**
 * ホバー情報を返す
 */
connection.onHover(async (params: HoverParams): Promise<Hover | null> => {
  try {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      connection.console.warn(`Document not found: ${params.textDocument.uri}`);
      return null;
    }

    const text = document.getText();
    const position = params.position;

    // カーソル位置の行が見出しかどうかを確認
    const currentHeading = isHeadingAtPosition(text, position);
    
    if (currentHeading) {
      // 見出し上にホバーした場合: 次の見出し情報も表示
      const nextHeading = findNextHeading(text, currentHeading.line);
      
      const parts: string[] = [];
      parts.push(`**見出しレベル ${currentHeading.level}**`);
      parts.push('');
      parts.push(currentHeading.text);
      
      if (nextHeading) {
        parts.push('');
        parts.push('---');
        parts.push('');
        parts.push('**次の見出し**:');
        parts.push(`レベル ${nextHeading.level}: ${nextHeading.text}`);
      } else {
        parts.push('');
        parts.push('_（この見出し以降に次の見出しはありません）_');
      }
      
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: parts.join('\n'),
        },
      };
    } else {
      // 通常テキスト上: 現在のセクション情報を表示
      const nearestHeading = findNearestHeadingBefore(text, position);
      
      if (nearestHeading) {
        const parts: string[] = [];
        parts.push('**現在のセクション**');
        parts.push('');
        parts.push(`レベル ${nearestHeading.level}: ${nearestHeading.text}`);
        
        // 次の見出しも表示
        const nextHeading = findNextHeading(text, nearestHeading.line);
        if (nextHeading) {
          parts.push('');
          parts.push('---');
          parts.push('');
          parts.push('**次のセクション**:');
          parts.push(`レベル ${nextHeading.level}: ${nextHeading.text}`);
        }
        
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: parts.join('\n'),
          },
        };
      }
    }
    
    // 見出しが見つからない場合はnullを返す（ホバー情報を表示しない）
    return null;
  } catch (error) {
    connection.console.error(`Error generating hover information: ${error}`);
    
    // エラー時はnullを返す
    return null;
  }
});

/**
 * コマンド実行ハンドラー
 */
connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
  try {
    if (!currentConfig || !llmProvider) {
      connection.console.warn('Configuration or LLM provider not available');
      await updateConfiguration();
      
      if (!currentConfig || !llmProvider) {
        connection.window.showErrorMessage('Configuration or LLM provider not available');
        return;
      }
    }

    const command = params.command;
    const args = params.arguments || [];

    // コマンド設定と補完設定を取得
    const commandSettings = await getCommandSettings();
    const completionSettings = await getCompletionSettings();

    if (command === 'bloglsp.completeSelection') {
      // 選択範囲の続きを生成
      const uri = args[0] as string;
      const range = args[1] as LspRange;
      const selectedText = args[2] as string;

      const document = documents.get(uri);
      if (!document) {
        connection.window.showErrorMessage(`Document not found: ${uri}`);
        return;
      }

      const text = document.getText();
      const context = extractContextLines(text, range.start, 5, 5);

      const prompt = buildCompletionPrompt({
        currentText: selectedText || context.currentText,
        linesBefore: context.linesBefore,
        linesAfter: context.linesAfter,
        config: currentConfig,
      });

      const completions = await llmProvider.generateCompletions({
        prompt,
        language: currentConfig.language,
        maxTokens: currentConfig.maxTokens,
        temperature: currentConfig.temperature,
        numSuggestions: completionSettings.maxTextSuggestions,
      });

      if (completions.length === 0 || !completions[0]) {
        connection.window.showInformationMessage('No completion generated');
        return;
      }

      let completion = completions[0];
      // currentTextを除去
      const textToComplete = selectedText || context.currentText;
      if (completion.startsWith(textToComplete)) {
        completion = completion.substring(textToComplete.length);
      }

      if (!completion.trimEnd()) {
        connection.window.showInformationMessage('Generated completion is empty');
        return;
      }

      const edit: WorkspaceEdit = {
        changes: {
          [uri]: [
            {
              range: {
                start: range.end,
                end: range.end,
              },
              newText: completion,
            },
          ],
        },
      };

      await connection.workspace.applyEdit(edit);

    } else if (command === 'bloglsp.completeParagraph') {
      // 設定で無効化されている場合はエラー
      if (!commandSettings.enableParagraphCompletion) {
        connection.window.showWarningMessage('Paragraph completion is disabled in settings');
        return;
      }
      // 段落を完成させる
      const uri = args[0] as string;
      const position = args[1] as { line: number; character: number };

      const document = documents.get(uri);
      if (!document) {
        connection.window.showErrorMessage(`Document not found: ${uri}`);
        return;
      }

      const text = document.getText();
      const pos = { line: position.line, character: position.character };
      const context = extractContextLines(text, pos, 5, 5);

      const prompt = buildParagraphCompletionPrompt({
        currentText: context.currentText,
        linesBefore: context.linesBefore,
        linesAfter: context.linesAfter,
        config: currentConfig,
      });

      const completions = await llmProvider.generateCompletions({
        prompt,
        language: currentConfig.language,
        maxTokens: currentConfig.maxTokens ? currentConfig.maxTokens * 2 : undefined, // より長いテキストを生成
        temperature: currentConfig.temperature,
        numSuggestions: completionSettings.maxTextSuggestions,
      });

      if (completions.length === 0 || !completions[0]) {
        connection.window.showInformationMessage('No completion generated');
        return;
      }

      let completion = completions[0];
      // currentTextを除去
      if (completion.startsWith(context.currentText)) {
        completion = completion.substring(context.currentText.length);
      }

      if (!completion.trimEnd()) {
        connection.window.showInformationMessage('Generated completion is empty');
        return;
      }

      const edit: WorkspaceEdit = {
        changes: {
          [uri]: [
            {
              range: {
                start: pos,
                end: pos,
              },
              newText: completion,
            },
          ],
        },
      };

      await connection.workspace.applyEdit(edit);

    } else if (command === 'bloglsp.insertHeading') {
      // 設定で無効化されている場合はエラー
      if (!commandSettings.enableHeadingGeneration) {
        connection.window.showWarningMessage('Heading generation is disabled in settings');
        return;
      }
      // 見出し候補を挿入
      const uri = args[0] as string;
      const position = args[1] as { line: number; character: number };

      const document = documents.get(uri);
      if (!document) {
        connection.window.showErrorMessage(`Document not found: ${uri}`);
        return;
      }

      const text = document.getText();
      const pos = { line: position.line, character: position.character };
      const context = extractContextLines(text, pos, 5, 5);

      const prompt = buildHeadingSuggestionPrompt({
        linesBefore: context.linesBefore,
        currentLine: context.currentLine,
        linesAfter: context.linesAfter,
        config: currentConfig,
      });

      const headings = await llmProvider.generateCompletions({
        prompt,
        language: currentConfig.language,
        maxTokens: currentConfig.maxTokens,
        temperature: currentConfig.temperature,
        numSuggestions: completionSettings.maxHeadingSuggestions,
      });

      if (headings.length === 0 || !headings[0]) {
        connection.window.showInformationMessage('No heading suggestion generated');
        return;
      }

      let headingText = headings[0].trim();
      // currentTextから#を抽出
      const headingPrefix = context.currentText.match(/^#+\s*/)?.[0] || '# ';
      const fullHeading = headingPrefix + headingText;

      const edit: WorkspaceEdit = {
        changes: {
          [uri]: [
            {
              range: {
                start: { line: pos.line, character: 0 },
                end: pos,
              },
              newText: fullHeading,
            },
          ],
        },
      };

      await connection.workspace.applyEdit(edit);
    }
  } catch (error) {
    connection.console.error(`Error executing command: ${error}`);
    connection.window.showErrorMessage(`Error executing command: ${error}`);
  }
});

/**
 * コードアクションハンドラー
 */
connection.onCodeAction(async (params: CodeActionParams) => {
  try {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    // コマンド設定を取得
    const commandSettings = await getCommandSettings();

    const actions: CodeAction[] = [];
    const range = params.range;

    // 選択範囲がある場合
    if (range.start.line !== range.end.line || range.start.character !== range.end.character) {
      const selectedText = document.getText(range);
      
      // 「続きを生成」アクション
      actions.push({
        title: '続きを生成',
        kind: 'source.fixAll',
        command: {
          command: 'bloglsp.completeSelection',
          title: '続きを生成',
          arguments: [params.textDocument.uri, range, selectedText],
        },
      });
    } else {
      // カーソル位置のみの場合
      const position = range.start;
      const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: Number.MAX_SAFE_INTEGER },
      });

      // 段落完成アクション（空行でない場合、設定で有効化されている場合のみ）
      if (line.trim().length > 0 && commandSettings.enableParagraphCompletion) {
        actions.push({
          title: '段落を完成',
          kind: 'source.fixAll',
          command: {
            command: 'bloglsp.completeParagraph',
            title: '段落を完成',
            arguments: [params.textDocument.uri, position],
          },
        });
      }

      // 見出し候補を挿入（現在行が#で始まる、または空行の場合、設定で有効化されている場合のみ）
      if ((line.trim().startsWith('#') || line.trim().length === 0) && commandSettings.enableHeadingGeneration) {
        actions.push({
          title: '見出し候補を挿入',
          kind: 'source.fixAll',
          command: {
            command: 'bloglsp.insertHeading',
            title: '見出し候補を挿入',
            arguments: [params.textDocument.uri, position],
          },
        });
      }
    }

    return actions;
  } catch (error) {
    connection.console.error(`Error generating code actions: ${error}`);
    return [];
  }
});

documents.listen(connection);
connection.listen();