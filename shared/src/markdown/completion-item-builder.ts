/**
 * 補完テキストからCompletionItemへの変換
 */

import type {
  CompletionItem,
  Position,
  TextEdit,
} from 'vscode-languageserver/node';
import { CompletionItemKind, InsertTextFormat } from 'vscode-languageserver/node';

export interface BuildCompletionItemsOptions {
  /**
   * LLMから生成された補完テキストの配列
   */
  completions: string[];
  
  /**
   * カーソル位置
   */
  position: Position;
  
  /**
   * 現在位置までのテキスト（補完の先頭から除去する必要がある場合）
   */
  currentText: string;
  
  /**
   * 補完アイテムの種類（デフォルト: CompletionItemKind.Text）
   */
  kind?: CompletionItemKind;
  
  /**
   * ソート順序のプレフィックス（デフォルト: '000'）
   */
  sortPrefix?: string;
}

/**
 * LLMの補完テキストをCompletionItemに変換
 * 
 * @param options 変換オプション
 * @returns CompletionItemの配列
 */
export function buildCompletionItems(
  options: BuildCompletionItemsOptions
): CompletionItem[] {
  const {
    completions,
    position,
    currentText,
    kind = CompletionItemKind.Text,
    sortPrefix = '000',
  } = options;

  const completionItems: CompletionItem[] = [];

  for (let index = 0; index < completions.length; index++) {
    const completion = completions[index];

    // 空の補完は除外（末尾のみトリムして空白のみかチェック）
    if (!completion.trimEnd()) {
      continue;
    }

    // 補完の先頭にcurrentTextが含まれている場合、それを除去
    let editText = completion;
    if (currentText && completion.startsWith(currentText)) {
      editText = editText.substring(currentText.length);
    }

    // 除去後に空になった場合は除外
    if (!editText.trimEnd()) {
      continue;
    }

    // textEditを作成
    const textEdit: TextEdit = {
      range: {
        start: position,
        end: position,
      },
      newText: editText,
    };

    // 補完アイテムを作成
    const item: CompletionItem = {
      label: completion.substring(0, 50) + (completion.length > 50 ? '...' : ''),
      detail: `LLM Suggestion ${index + 1}: ${completion.substring(0, 100)}${completion.length > 100 ? '...' : ''}`,
      kind,
      sortText: `${sortPrefix}${index}`, // ソート順序（数値文字列でソート）
      textEdit,
      insertTextFormat: InsertTextFormat.PlainText,
    };

    completionItems.push(item);
  }

  return completionItems;
}

