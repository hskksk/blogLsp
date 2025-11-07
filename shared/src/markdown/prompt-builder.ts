/**
 * Markdown文脈からLLM用のプロンプトを構築
 */

import type { BlogLspConfig } from '../index';
import { buildSystemPrompt } from '../index';
import { renderTemplate } from './prompt-loader';
import type { Position } from './context-extractor';
import { findNearestHeadingBefore, isHeadingAtPosition, extractHeadings } from './heading-extractor';
import { extractMarkdownContext } from './extractor';
import type { ExtractionOptions } from './types';
import { DocumentSymbol } from 'vscode-languageserver';

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
   * ドキュメント全体のテキスト
   */
  fullText: string;
  
  /**
   * カーソル位置
   */
  position: Position;
  
  /**
   * 設定
   */
  config: BlogLspConfig;
}

/**
 * 記事情報を抽出するヘルパー関数
 */
interface ArticleInfo {
  articleTitle: string;
  articleSectionStructure: string[];
  currentSectionHeading?: string;
  suggestSubSectionHeading?: boolean;
  suggestNextSectionHeading?: boolean;
}

/**
 * 見出し提案用の判定を行うヘルパー関数（テストしやすいように切り出し）
 */
export function analyzeHeadingSuggestion(
  text: string,
  position: Position
): {
  currentLineHeadingLevel?: number;
  nearestHeadingLevel?: number;
  suggestSubSectionHeading?: boolean;
  suggestNextSectionHeading?: boolean;
} {
  const currentLineHeading = isHeadingAtPosition(text, position);
  const nearestHeading = findNearestHeadingBefore(text, position);

  let suggestSubSectionHeading: boolean | undefined;
  let suggestNextSectionHeading: boolean | undefined;
  let currentLineHeadingLevel: number | undefined;
  let nearestHeadingLevel: number | undefined;

  if (currentLineHeading) {
    currentLineHeadingLevel = currentLineHeading.level;
    nearestHeadingLevel = nearestHeading?.level;

    if (nearestHeadingLevel !== undefined) {
      // 現在行の見出しレベルが直前の見出しより深い（値が大きい）場合
      suggestSubSectionHeading = currentLineHeadingLevel > nearestHeadingLevel;
      // 現在行の見出しレベルが直前の見出しと同じ場合
      suggestNextSectionHeading = currentLineHeadingLevel === nearestHeadingLevel;
    } else {
      // 直前の見出しがない場合は次セクションとして扱う
      suggestNextSectionHeading = true;
    }
  }

  return {
    currentLineHeadingLevel,
    nearestHeadingLevel,
    suggestSubSectionHeading,
    suggestNextSectionHeading,
  };
}

function extractArticleInfo(text: string, position: Position): ArticleInfo {
  const lines = text.split(/\r\n|\r|\n/);
  
  // フロントマターからタイトルを抽出
  let articleTitle = '';
  const extractOptions: ExtractionOptions = {
    scope: 'document',
    position,
  };
  const markdownContext = extractMarkdownContext(text, extractOptions);
  
  if (markdownContext.metadata.hasFrontMatter && markdownContext.metadata.frontMatter) {
    const title = markdownContext.metadata.frontMatter.title;
    if (typeof title === 'string') {
      articleTitle = title;
    }
  }
  
  // フロントマターにタイトルがない場合、最初のH1を取得
  if (!articleTitle) {
    const allHeadings = extractHeadings(text);
    // 最初のH1を探す
    function findFirstH1(symbols: typeof allHeadings): string | null {
      for (const symbol of symbols) {
        if (symbol.name) {
          // レベルを確認するために、元のテキストから見出しを探す
          const headingLine = lines[symbol.range.start.line];
          if (headingLine && headingLine.trim().startsWith('#')) {
            const level = headingLine.trim().match(/^(#+)/)?.[1].length || 0;
            if (level === 1) {
              return symbol.name;
            }
          }
        }
        if (symbol.children) {
          const found = findFirstH1(symbol.children);
          if (found) return found;
        }
      }
      return null;
    }
    const firstH1 = findFirstH1(allHeadings);
    if (firstH1) {
      articleTitle = firstH1;
    }
  }
  
  // 全見出しを抽出（H1/H2/H3のみ）
  const articleSectionStructure: string[] = [];
  function collectHeadings(symbols: DocumentSymbol[]) {
    for (const symbol of symbols) {
      if (symbol.name) {
        const headingLine = lines[symbol.range.start.line];
        if (headingLine) {
          const level = headingLine.trim().match(/^(#+)/)?.[1].length || 0;
          if (level >= 1 && level <= 3) {
            articleSectionStructure.push(symbol.name);
          }
        }
        if (symbol.children) {
          collectHeadings(symbol.children);
        }
      }
    }
  }
  collectHeadings(extractHeadings(text));
  
  // 現在セクションの見出しを取得
  const nearestHeading = findNearestHeadingBefore(text, position);
  const currentSectionHeading = nearestHeading?.text;
  
  // 見出し提案の種類を判定（切り出し関数を使用）
  const suggestion = analyzeHeadingSuggestion(text, position);
  const suggestSubSectionHeading = suggestion.suggestSubSectionHeading;
  const suggestNextSectionHeading = suggestion.suggestNextSectionHeading;
  
  return {
    articleTitle: articleTitle || '',
    articleSectionStructure,
    currentSectionHeading,
    suggestSubSectionHeading,
    suggestNextSectionHeading,
  };
}

/**
 * LLM用のプロンプトを構築
 */
export function buildCompletionPrompt(options: PromptBuildingOptions): string {
  const { currentText, linesBefore, linesAfter, fullText, position, config } = options;
  let systemPrompt = buildSystemPrompt(config.language, config.stylePrompt);

  // 記事情報を抽出
  const articleInfo = extractArticleInfo(fullText, position);

  // コンテキスト情報を構造化
  const contextData: Record<string, unknown> = {};
  
  if (linesBefore.length > 0) {
    contextData.linesBefore = linesBefore;
  }
  
  contextData.currentText = currentText;
  
  if (linesAfter.length > 0) {
    contextData.linesAfter = linesAfter;
  }
  
  contextData.articleTitle = articleInfo.articleTitle;
  if (articleInfo.currentSectionHeading) {
    contextData.currentSectionHeading = articleInfo.currentSectionHeading;
  }
  
  // テンプレートをレンダリング
  // contextJsonはオブジェクトとして渡し、各プロパティもルートレベルに展開
  // これにより、{{#contextJson}}...{{/contextJson}}と{{articleTitle}}の両方が使える
  return renderTemplate('completion', {
    systemPrompt,
    contextJson: contextData,
    contextJsonString: JSON.stringify(contextData, null, 2),
    // ルートレベルにも展開（Mustacheのドット記法はサポートされていないため）
    ...contextData,
  });
}

/**
 * 見出し生成用のプロンプトを構築
 */
export function buildHeadingSuggestionPrompt(options: {
  linesBefore: string[];
  currentLine: string;
  linesAfter: string[];
  fullText: string;
  position: Position;
  config: BlogLspConfig;
}): string {
  const { linesBefore, currentLine, linesAfter, fullText, position, config } = options;
  let systemPrompt = buildSystemPrompt(config.language, config.stylePrompt);
  
  // 記事情報を抽出
  const articleInfo = extractArticleInfo(fullText, position);
  
  // コンテキスト情報を構造化
  const contextData: Record<string, unknown> = {};
  
  if (linesBefore.length > 0) {
    contextData.linesBefore = linesBefore;
  }
  
  contextData.currentLine = currentLine;
  
  if (linesAfter.length > 0) {
    contextData.linesAfter = linesAfter;
  }
  
  contextData.articleTitle = articleInfo.articleTitle;
  contextData.articleSectionStructure = articleInfo.articleSectionStructure;
  if (articleInfo.currentSectionHeading) {
    contextData.currentSectionHeading = articleInfo.currentSectionHeading;
  }
  
  // テンプレートをレンダリング
  // contextJsonはオブジェクトとして渡し、各プロパティもルートレベルに展開
  const templateData: Record<string, unknown> = {
    systemPrompt,
    contextJson: contextData,
    contextJsonString: JSON.stringify(contextData, null, 2),
    numSuggestions: config.numSuggestions,
    language: config.language === 'ja' ? 'Japanese' : 'English',
    // ルートレベルにも展開
    ...contextData,
  };
  
  // 条件付きブロックのフラグを追加
  if (articleInfo.suggestSubSectionHeading !== undefined) {
    templateData.suggestSubSectionHeading = articleInfo.suggestSubSectionHeading;
  }
  if (articleInfo.suggestNextSectionHeading !== undefined) {
    templateData.suggestNextSectionHeading = articleInfo.suggestNextSectionHeading;
  }
  
  return renderTemplate('heading', templateData);
}

/**
 * 段落完成用のプロンプトを構築
 */
export function buildParagraphCompletionPrompt(options: PromptBuildingOptions): string {
  const { currentText, linesBefore, linesAfter, fullText, position, config } = options;
  let systemPrompt = buildSystemPrompt(config.language, config.stylePrompt);
  
  // 記事情報を抽出
  const articleInfo = extractArticleInfo(fullText, position);
  
  // コンテキスト情報を構造化
  const contextData: Record<string, unknown> = {};
  
  if (linesBefore.length > 0) {
    contextData.linesBefore = linesBefore;
  }
  
  contextData.currentText = currentText;
  
  if (linesAfter.length > 0) {
    contextData.linesAfter = linesAfter;
  }
  
  contextData.articleTitle = articleInfo.articleTitle;
  if (articleInfo.currentSectionHeading) {
    contextData.currentSectionHeading = articleInfo.currentSectionHeading;
  }
  
  // テンプレートをレンダリング
  // contextJsonはオブジェクトとして渡し、各プロパティもルートレベルに展開
  return renderTemplate('paragraph-completion', {
    systemPrompt,
    contextJson: contextData,
    contextJsonString: JSON.stringify(contextData, null, 2),
    ...contextData,
  });
}

