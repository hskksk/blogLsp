/**
 * Markdown文脈からLLM用のプロンプトを構築
 */

import type { BlogLspConfig } from '../index';
import { buildSystemPrompt } from '../index';

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
  
  const parts: string[] = [];
  
  // システムプロンプト
  parts.push(systemPrompt);
  parts.push('');
  
  // コンテキスト情報をJSON形式で構造化
  const contextData: Record<string, unknown> = {};
  
  if (linesBefore.length > 0) {
    contextData.linesBefore = linesBefore;
  }
  
  contextData.currentText = currentText;
  
  if (linesAfter.length > 0) {
    contextData.linesAfter = linesAfter;
  }
  
  // JSON形式でコンテキスト情報を追加
  parts.push('Context information (JSON):');
  parts.push('');
  parts.push('JSON Structure:');
  parts.push('- linesBefore (array, optional): Up to 5 lines before the cursor position');
  parts.push('- currentText (string, required): Text from the start of current line to cursor position');
  parts.push('- linesAfter (array, optional): Up to 5 lines after the cursor position');
  parts.push('');
  parts.push('JSON Data:');
  parts.push(JSON.stringify(contextData, null, 2));
  parts.push('');
  
  // 指示
  parts.push('Continue writing from the currentText, but do not repeat the currentText itself in the output. Generate only the continuation.');
  parts.push('Each continuation should be concise, about 1-2 sentences long.');
  parts.push('Maintain the same tone and style.');
  
  return parts.join('\n');
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
  
  const parts: string[] = [];
  
  parts.push(systemPrompt);
  parts.push('');
  
  // コンテキスト情報をJSON形式で構造化
  const contextData: Record<string, unknown> = {};
  
  if (linesBefore.length > 0) {
    contextData.linesBefore = linesBefore;
  }
  
  contextData.currentLine = currentLine;
  
  if (linesAfter.length > 0) {
    contextData.linesAfter = linesAfter;
  }
  
  // JSON形式でコンテキスト情報を追加
  parts.push('Context information (JSON):');
  parts.push('');
  parts.push('JSON Structure:');
  parts.push('- linesBefore (array, optional): Up to 5 lines before the cursor position');
  parts.push('- currentLine (string, required): Current line text');
  parts.push('- linesAfter (array, optional): Up to 5 lines after the cursor position');
  parts.push('');
  parts.push('JSON Data:');
  parts.push(JSON.stringify(contextData, null, 2));
  parts.push('');
  
  // 指示
  parts.push('Suggest appropriate headings for the content in the context above.');
  parts.push(`Suggest ${config.numSuggestions} appropriate headings in ${config.language === 'ja' ? 'Japanese' : 'English'}.`);
  parts.push('Return only the heading text, one per line, without the # markdown syntax.');
  
  return parts.join('\n');
}

