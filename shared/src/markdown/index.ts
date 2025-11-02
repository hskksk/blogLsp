/**
 * Markdown文脈抽出モジュールのエクスポート
 */

export { extractMarkdownContext, extractTextByScope } from './extractor';
export { buildCompletionPrompt, buildHeadingSuggestionPrompt } from './prompt-builder';
export type { MarkdownContext, ExtractionOptions, ExtractedText } from './types';

