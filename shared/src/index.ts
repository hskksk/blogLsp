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
  style: 'tech-blog' | 'casual' | 'formal';
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

export function buildSystemPrompt(style: BlogLspConfig['style'], language: BlogLspConfig['language']): string {
  const styleText = style === 'tech-blog' ? 'Concise, clear, developer-friendly tone.' : style === 'formal' ? 'Formal, precise tone.' : 'Casual, friendly tone.';
  const languageText = language === 'ja' ? 'Language: Japanese.' : 'Language: English.';
  
  return renderTemplate('system', {
    styleText,
    languageText,
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
export { buildCompletionPrompt, buildHeadingSuggestionPrompt } from './markdown/prompt-builder';
export { extractContextLines } from './markdown/context-extractor';
export { buildCompletionItems, buildHeadingCompletionItems } from './markdown/completion-item-builder';
export { extractHeadings } from './markdown/heading-extractor';
export type { MarkdownContext, ExtractionOptions, ExtractedText } from './markdown/types';
export type { ContextLines, Position } from './markdown/context-extractor';
export type { BuildCompletionItemsOptions } from './markdown/completion-item-builder';

