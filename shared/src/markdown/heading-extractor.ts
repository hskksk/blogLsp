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

