/**
 * Markdown文脈抽出の実装
 */

import type { MarkdownContext, ExtractionOptions, ExtractedText } from './types';

/**
 * テキストを行の配列に分割
 */
function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

/**
 * 行が空行かどうかを判定
 */
function isEmptyLine(line: string): boolean {
  return line.trim().length === 0;
}

/**
 * 行が見出しかどうかを判定し、レベルを返す（見出しでない場合は0）
 */
function parseHeading(line: string): { isHeading: boolean; level: number; text: string } {
  const trimmed = line.trim();
  
  // ATXスタイルの見出し: # ## ###
  const atxMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
  if (atxMatch) {
    return {
      isHeading: true,
      level: atxMatch[1].length,
      text: atxMatch[2].trim(),
    };
  }
  
  // Setextスタイルの見出し: === や --- (レベル1と2のみ)
  // これは前の行も確認する必要があるため、ここでは検出しない
  
  return { isHeading: false, level: 0, text: '' };
}

/**
 * 段落の境界を検出（空行で区切られる）
 */
function findParagraphBoundaries(lines: string[]): number[] {
  if (lines.length === 0) {
    return [0];
  }
  
  const boundaries: number[] = [0]; // 最初の行
  
  for (let i = 1; i < lines.length; i++) {
    // 空行の後、または見出しの後が段落の開始
    if (isEmptyLine(lines[i - 1])) {
      boundaries.push(i);
    } else {
      const heading = parseHeading(lines[i]);
      if (heading.isHeading) {
        // 見出しの前にも段落の終わりとして追加
        if (!boundaries.includes(i)) {
          boundaries.push(i);
        }
      }
    }
  }
  
  boundaries.push(lines.length); // 最後の行+1
  return boundaries;
}

/**
 * 指定された行範囲から段落を抽出
 */
function extractParagraph(lines: string[], startLine: number, endLine: number): string {
  const paragraphLines = lines.slice(startLine, endLine);
  return paragraphLines.join('\n').trim();
}

/**
 * 指定位置を含む段落の範囲を取得
 */
function getParagraphRange(lines: string[], lineIndex: number): { start: number; end: number } {
  if (lines.length === 0) {
    return { start: 0, end: 0 };
  }
  
  const clampedIndex = Math.max(0, Math.min(lineIndex, lines.length - 1));
  const boundaries = findParagraphBoundaries(lines);
  
  // lineIndexを含む段落の範囲を探す
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    
    if (clampedIndex >= start && clampedIndex < end) {
      // 見出しの場合は、見出し自体は含めない
      const heading = parseHeading(lines[clampedIndex]);
      if (heading.isHeading && clampedIndex === start) {
        // 見出し行自体の場合は、次の段落を探す
        if (i + 1 < boundaries.length - 1) {
          return { start: boundaries[i + 1], end: boundaries[i + 2] };
        }
        return { start: clampedIndex, end: clampedIndex + 1 };
      }
      return { start, end };
    }
  }
  
  // 見つからない場合（通常は発生しない）
  return { start: clampedIndex, end: clampedIndex + 1 };
}

/**
 * 見出しを抽出（指定位置より前の全ての見出し）
 */
function extractHeadings(lines: string[], beforeLine: number): Array<{ level: number; text: string; line: number }> {
  const headings: Array<{ level: number; text: string; line: number }> = [];
  
  for (let i = 0; i < beforeLine && i < lines.length; i++) {
    const heading = parseHeading(lines[i]);
    if (heading.isHeading) {
      headings.push({
        level: heading.level,
        text: heading.text,
        line: i,
      });
    }
  }
  
  return headings;
}

/**
 * 見出しの階層構造を構築（入れ子構造を考慮）
 */
function buildHeadingHierarchy(
  headings: Array<{ level: number; text: string; line: number }>
): Array<{ level: number; text: string; line: number }> {
  const hierarchy: Array<{ level: number; text: string; line: number }> = [];
  const stack: Array<{ level: number; text: string; line: number }> = [];
  
  for (const heading of headings) {
    // スタックから、現在の見出しより深いレベルの見出しを削除
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }
    
    stack.push(heading);
    // 現在の階層をコピー
    hierarchy.push(...stack.map(h => ({ ...h })));
  }
  
  return hierarchy;
}

/**
 * 最も近い見出しを取得（現在位置より前で最も近い見出し）
 */
function getNearestHeading(headings: Array<{ level: number; text: string; line: number }>): 
  { level: number; text: string; line: number } | undefined {
  if (headings.length === 0) {
    return undefined;
  }
  
  // 最後の見出しが最も近い
  return headings[headings.length - 1];
}

/**
 * フロントマターを抽出
 */
function extractFrontMatter(text: string): { hasFrontMatter: boolean; frontMatter?: Record<string, unknown> } {
  const lines = splitLines(text);
  
  if (lines.length === 0 || !lines[0].startsWith('---')) {
    return { hasFrontMatter: false };
  }
  
  // YAMLフロントマターを探す
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith('---')) {
      endIndex = i;
      break;
    }
  }
  
  if (endIndex === -1) {
    return { hasFrontMatter: false };
  }
  
  // フロントマターの内容を抽出（簡単な実装、完全なYAMLパーサーではない）
  const frontMatterLines = lines.slice(1, endIndex);
  const frontMatter: Record<string, unknown> = {};
  
  for (const line of frontMatterLines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      frontMatter[key] = value;
    }
  }
  
  return {
    hasFrontMatter: true,
    frontMatter,
  };
}

/**
 * Markdown文脈を抽出
 */
export function extractMarkdownContext(text: string, options: ExtractionOptions): MarkdownContext {
  const lines = splitLines(text);
  const { position, contextParagraphs = 1 } = options;
  
  // 現在の段落を取得
  const currentParagraphRange = getParagraphRange(lines, position.line);
  const currentParagraph = extractParagraph(lines, currentParagraphRange.start, currentParagraphRange.end);
  
  // 前後の段落を取得
  let previousParagraph: string | undefined;
  let nextParagraph: string | undefined;
  
  if (currentParagraphRange.start > 0) {
    const prevRange = getParagraphRange(lines, currentParagraphRange.start - 1);
    if (prevRange.end <= currentParagraphRange.start) {
      previousParagraph = extractParagraph(lines, prevRange.start, prevRange.end);
    }
  }
  
  if (currentParagraphRange.end < lines.length) {
    const nextRange = getParagraphRange(lines, currentParagraphRange.end);
    if (nextRange.start >= currentParagraphRange.end) {
      nextParagraph = extractParagraph(lines, nextRange.start, nextRange.end);
    }
  }
  
  // 見出しを抽出
  const allHeadings = extractHeadings(lines, position.line);
  const nearestHeading = getNearestHeading(allHeadings);
  const headingHierarchy = buildHeadingHierarchy(allHeadings);
  
  // フロントマターを抽出
  const frontMatter = extractFrontMatter(text);
  
  return {
    currentParagraph,
    previousParagraph,
    nextParagraph,
    nearestHeading,
    headingHierarchy,
    metadata: {
      lineCount: lines.length,
      hasFrontMatter: frontMatter.hasFrontMatter,
      frontMatter: frontMatter.frontMatter,
    },
  };
}

/**
 * プライバシースコープに基づいてテキストを抽出
 */
export function extractTextByScope(
  text: string,
  options: ExtractionOptions
): ExtractedText {
  const lines = splitLines(text);
  const { scope, position, selection } = options;
  
  let startLine: number;
  let startCharacter: number;
  let endLine: number;
  let endCharacter: number;
  let extractedText: string;
  
  switch (scope) {
    case 'selection':
      if (!selection) {
        throw new Error('Selection scope requires selection range');
      }
      startLine = selection.startLine;
      startCharacter = selection.startCharacter;
      endLine = selection.endLine;
      endCharacter = selection.endCharacter;
      
      if (startLine === endLine) {
        extractedText = lines[startLine].substring(startCharacter, endCharacter);
      } else {
        const selectedLines = [
          lines[startLine].substring(startCharacter),
          ...lines.slice(startLine + 1, endLine),
          lines[endLine].substring(0, endCharacter),
        ];
        extractedText = selectedLines.join('\n');
      }
      break;
      
    case 'paragraph': {
      const paragraphRange = getParagraphRange(lines, position.line);
      startLine = paragraphRange.start;
      startCharacter = 0;
      endLine = paragraphRange.end - 1; // endはexclusiveなので-1
      endCharacter = lines[endLine].length;
      extractedText = extractParagraph(lines, paragraphRange.start, paragraphRange.end);
      break;
    }
    
    case 'document':
      startLine = 0;
      startCharacter = 0;
      endLine = lines.length - 1;
      endCharacter = lines[endLine].length;
      extractedText = text;
      break;
    
    default:
      throw new Error(`Unknown scope: ${scope}`);
  }
  
  return {
    text: extractedText,
    range: {
      startLine,
      startCharacter,
      endLine,
      endCharacter,
    },
  };
}

