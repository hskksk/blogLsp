/**
 * Markdown文脈からLLM用のプロンプトを構築
 */

import type { BlogLspConfig } from '../index';
import { buildSystemPrompt } from '../index';
import { renderTemplate } from './prompt-loader';

export interface PromptBuildingOptions {
  /**
   * 現在のカーソル位置までのテキスト（補完を生成したい部分）
   */
  currentText: string;
  
  /**
   * カーソルの直前5行（存在する場合のみ）
   */
  linesBefore: string[];
  
  /**
   * カーソルの直後5行（存在する場合のみ）
   */
  linesAfter: string[];
  
  /**
   * 設定
   */
  config: BlogLspConfig;
}

/**
 * LLM用のプロンプトを構築
 */
export function buildCompletionPrompt(options: PromptBuildingOptions): string {
  const { currentText, linesBefore, linesAfter, config } = options;
  const systemPrompt = buildSystemPrompt(config.style, config.language);
  
  // コンテキスト情報をJSON形式で構造化
  const contextData: Record<string, unknown> = {};
  
  if (linesBefore.length > 0) {
    contextData.linesBefore = linesBefore;
  }
  
  contextData.currentText = currentText;
  
  if (linesAfter.length > 0) {
    contextData.linesAfter = linesAfter;
  }
  
  // テンプレートをレンダリング
  return renderTemplate('completion', {
    systemPrompt,
    contextJson: JSON.stringify(contextData, null, 2),
  });
}

/**
 * 見出し生成用のプロンプトを構築
 */
export function buildHeadingSuggestionPrompt(options: {
  linesBefore: string[];
  currentLine: string;
  linesAfter: string[];
  config: BlogLspConfig;
}): string {
  const { linesBefore, currentLine, linesAfter, config } = options;
  const systemPrompt = buildSystemPrompt(config.style, config.language);
  
  // コンテキスト情報をJSON形式で構造化
  const contextData: Record<string, unknown> = {};
  
  if (linesBefore.length > 0) {
    contextData.linesBefore = linesBefore;
  }
  
  contextData.currentLine = currentLine;
  
  if (linesAfter.length > 0) {
    contextData.linesAfter = linesAfter;
  }
  
  // テンプレートをレンダリング
  return renderTemplate('heading', {
    systemPrompt,
    contextJson: JSON.stringify(contextData, null, 2),
    numSuggestions: config.numSuggestions,
    language: config.language === 'ja' ? 'Japanese' : 'English',
  });
}

