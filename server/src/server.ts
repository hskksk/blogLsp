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
  extractContextLines,
  buildCompletionItems,
  buildHeadingCompletionItems,
  extractHeadings,
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

    // トリガー文字とトリガー種別を確認
    const triggerCharacter = params.context?.triggerCharacter;
    const triggerKind = params.context?.triggerKind;
    
    // 見出し補完の場合（#がトリガー文字、または現在行が#で始まっている場合）
    const isHeadingCompletion = triggerCharacter === '#' || 
                                (triggerKind === 1 && context.currentText.trim().startsWith('#'));

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

      // LLMで見出し候補を生成
      const headings = await llmProvider.generateCompletions(
        {
          prompt,
          language: currentConfig.language,
          maxTokens: currentConfig.maxTokens,
          temperature: currentConfig.temperature,
          numSuggestions: currentConfig.numSuggestions,
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

      // LLMで補完を生成
      const completions = await llmProvider.generateCompletions(
        {
          prompt,
          language: currentConfig.language,
          maxTokens: currentConfig.maxTokens,
          temperature: currentConfig.temperature,
          numSuggestions: currentConfig.numSuggestions,
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

documents.listen(connection);
connection.listen();