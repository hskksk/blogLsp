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

/**
 * 見出し補完アイテムを構築
 * 見出しテキストに `# ` プレフィックスを追加してCompletionItemを作成
 */
export function buildHeadingCompletionItems(
  options: Omit<BuildCompletionItemsOptions, 'kind' | 'sortPrefix'>
): CompletionItem[] {
  const {
    completions,
    position,
    currentText,
  } = options;

  const completionItems: CompletionItem[] = [];

  // currentTextから既存の#を除去（見出しレベルのみ保持）
  const headingPrefix = currentText.match(/^#+\s*/)?.[0] || '';
  const textWithoutHeading = currentText.replace(/^#+\s*/, '');

  for (let index = 0; index < completions.length; index++) {
    let headingText = completions[index].trim();

    // 空の補完は除外
    if (!headingText) {
      continue;
    }

    // 補完の先頭から既存のテキスト（#を除いた部分）を除去
    if (textWithoutHeading && headingText.startsWith(textWithoutHeading)) {
      headingText = headingText.substring(textWithoutHeading.length).trim();
    }

    // 除去後に空になった場合は除外
    if (!headingText) {
      continue;
    }

    // 見出しプレフィックス（#）を含む完全な見出しテキストを作成
    const fullHeading = headingPrefix + headingText;

    // textEditを作成（カーソル位置から現在行の末尾まで置き換え）
    const textEdit: TextEdit = {
      range: {
        start: {
          line: position.line,
          character: 0, // 行の先頭から
        },
        end: position, // カーソル位置まで
      },
      newText: fullHeading,
    };

    // 補完アイテムを作成
    const item: CompletionItem = {
      label: fullHeading,
      detail: `Heading Suggestion ${index + 1}`,
      kind: CompletionItemKind.Class, // 見出しはClassアイコンを使用
      sortText: `100${index}`, // 見出しは文章補完より優先（100で始める）
      textEdit,
      insertTextFormat: InsertTextFormat.PlainText,
    };

    completionItems.push(item);
  }

  return completionItems;
}

