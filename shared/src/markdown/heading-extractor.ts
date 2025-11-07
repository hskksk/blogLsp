/**
 * Markdown見出しの抽出とDocumentSymbolへの変換
 */

import type {
  DocumentSymbol,
  Position,
  Range,
} from 'vscode-languageserver/node';
import { SymbolKind } from 'vscode-languageserver/node';

/**
 * 行が見出しかどうかを判定し、レベルとテキストを返す
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
  
  return { isHeading: false, level: 0, text: '' };
}

/**
 * 見出し情報（レベル、テキスト、行番号）
 */
export interface HeadingInfo {
  level: number;
  text: string;
  line: number;
}

/**
 * 指定された行が見出しかどうかを判定し、情報を返す
 */
function getHeadingInfo(line: string, lineIndex: number): HeadingInfo | null {
  const heading = parseHeading(line);
  if (heading.isHeading) {
    return {
      level: heading.level,
      text: heading.text,
      line: lineIndex,
    };
  }
  return null;
}

/**
 * カーソル位置から最も近い見出しを検出
 * カーソル位置より前の見出しを上方向に検索
 * 
 * @param text Markdownテキスト全体
 * @param position カーソル位置
 * @returns 見つかった見出し情報、見つからなければnull
 */
export function findNearestHeadingBefore(text: string, position: Position): HeadingInfo | null {
  const lines = text.split(/\r\n|\r|\n/);
  
  // カーソル位置より前の行を逆順で検索
  for (let i = position.line - 1; i >= 0; i--) {
    const headingInfo = getHeadingInfo(lines[i], i);
    if (headingInfo) {
      return headingInfo;
    }
  }
  
  return null;
}

/**
 * カーソル位置を含む行が見出しかどうかを判定
 */
export function isHeadingAtPosition(text: string, position: Position): HeadingInfo | null {
  const lines = text.split(/\r\n|\r|\n/);
  if (position.line >= 0 && position.line < lines.length) {
    return getHeadingInfo(lines[position.line], position.line);
  }
  return null;
}

/**
 * 指定された見出しの次の見出しを検索
 */
export function findNextHeading(text: string, afterLine: number): HeadingInfo | null {
  const lines = text.split(/\r\n|\r|\n/);
  
  for (let i = afterLine + 1; i < lines.length; i++) {
    const headingInfo = getHeadingInfo(lines[i], i);
    if (headingInfo) {
      return headingInfo;
    }
  }
  
  return null;
}

/**
 * Markdownテキストから見出しを抽出してDocumentSymbolの配列を返す
 * 
 * @param text Markdownテキスト全体
 * @returns 見出し階層を保持したDocumentSymbolの配列
 */
export function extractHeadings(text: string): DocumentSymbol[] {
  const lines = text.split(/\r\n|\r|\n/);
  const rootSymbols: DocumentSymbol[] = [];
  const stack: Array<{ symbol: DocumentSymbol; level: number }> = []; // 階層構造を管理するスタック

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const heading = parseHeading(line);
    
    if (!heading.isHeading) {
      continue;
    }

    const position: Position = {
      line: lineIndex,
      character: 0,
    };
    
    const endPosition: Position = {
      line: lineIndex,
      character: line.length,
    };

    const range: Range = {
      start: position,
      end: endPosition,
    };

    const symbol: DocumentSymbol = {
      name: heading.text,
      kind: SymbolKind.Class, // 見出しはClassアイコンを使用
      range,
      selectionRange: range,
    };

    // スタックから現在のレベル以上の（同じか大きい）レベルのシンボルを削除
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    // スタックの最後の要素が親となる
    if (stack.length > 0) {
      const parent = stack[stack.length - 1].symbol;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(symbol);
    } else {
      // ルートレベルのシンボル
      rootSymbols.push(symbol);
    }

    // 現在のシンボルをスタックに追加
    stack.push({ symbol, level: heading.level });
  }

  return rootSymbols;
}

