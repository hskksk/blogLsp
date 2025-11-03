import { renderTemplate } from './markdown/prompt-loader';

export type PrivacyScope = 'selection' | 'paragraph' | 'document';

export interface BlogLspConfig {
  provider: string;
  model: string;
  apiBaseUrl?: string;
  apiKey?: string;
  maxTokens?: number; // gpt-5系以前で使用（gpt-5系では使用しない）
  temperature?: number; // gpt-5系以前で使用（gpt-5系では使用しない）
  numSuggestions: number;
  /**
   * 任意の複数行スタイルプロンプト。
   * 指定がある場合は既存のスタイル文を上書きする。
   */
  stylePrompt?: string;
  language: 'ja' | 'en';
  privacy: {
    scope: PrivacyScope;
  };
  enableStreaming: boolean;
  timeoutMs: number;
  reasoningEffort?: 'minimal' | 'low' | 'middle' | 'high'; // gpt-5系で使用
  verbosity?: 'low' | 'middle' | 'high'; // gpt-5系で使用
}

export interface LlmProvider {
  name: string;
  supportsStreaming: boolean;
  generateCompletions(
    context: {
      prompt: string;
      language: 'ja' | 'en';
      maxTokens?: number; // オプショナル（gpt-5系では使用しない）
      temperature?: number; // オプショナル（gpt-5系では使用しない）
      numSuggestions: number;
    },
    signal?: AbortSignal
  ): Promise<string[]>;
}

export function buildSystemPrompt(
  language: BlogLspConfig['language'],
  stylePrompt?: BlogLspConfig['stylePrompt']
): string {
  const languageText = language === 'ja' ? 'Language: Japanese.' : 'Language: English.';

  return renderTemplate('system', {
    languageText,
    stylePrompt,
    hasStylePrompt: Boolean(stylePrompt && stylePrompt.trim().length > 0),
  }).trim();
}

// LLM Provider exports
export { createLlmProvider, getAvailableProviders } from './llm/factory';
export type { LangChainProviderConfig } from './llm/providers';
export {
  LangChainLlmProvider,
  OpenAILangChainProvider,
  AzureOpenAILangChainProvider,
  isGpt5Series,
} from './llm/providers';

// Markdown extraction exports
export { extractMarkdownContext, extractTextByScope } from './markdown/extractor';
export { buildCompletionPrompt, buildHeadingSuggestionPrompt, buildParagraphCompletionPrompt } from './markdown/prompt-builder';
export { extractContextLines } from './markdown/context-extractor';
export { buildCompletionItems, buildHeadingCompletionItems } from './markdown/completion-item-builder';
export { 
  extractHeadings,
  findNearestHeadingBefore,
  isHeadingAtPosition,
  findNextHeading,
} from './markdown/heading-extractor';
export type { HeadingInfo } from './markdown/heading-extractor';
export type { MarkdownContext, ExtractionOptions, ExtractedText } from './markdown/types';
export type { ContextLines, Position } from './markdown/context-extractor';
export type { BuildCompletionItemsOptions } from './markdown/completion-item-builder';

