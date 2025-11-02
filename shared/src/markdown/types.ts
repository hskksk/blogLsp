/**
 * Markdown文脈抽出に関する型定義
 */

export interface MarkdownContext {
  /**
   * 現在の段落（カーソル位置を含む）
   */
  currentParagraph: string;
  
  /**
   * 前の段落（存在する場合）
   */
  previousParagraph?: string;
  
  /**
   * 次の段落（存在する場合）
   */
  nextParagraph?: string;
  
  /**
   * 直近の見出し（現在の位置より前の最も近い見出し）
   */
  nearestHeading?: {
    level: number;
    text: string;
    line: number;
  };
  
  /**
   * 見出しの階層構造（ルートから現在位置までの見出し）
   */
  headingHierarchy: Array<{
    level: number;
    text: string;
    line: number;
  }>;
  
  /**
   * ドキュメント全体のメタデータ
   */
  metadata: {
    lineCount: number;
    hasFrontMatter: boolean;
    frontMatter?: Record<string, unknown>;
  };
}

export interface ExtractionOptions {
  /**
   * プライバシースコープ
   */
  scope: 'selection' | 'paragraph' | 'document';
  
  /**
   * 選択範囲（scope が 'selection' の場合に使用）
   */
  selection?: {
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
  };
  
  /**
   * 現在のカーソル位置
   */
  position: {
    line: number;
    character: number;
  };
  
  /**
   * 前後の段落を含める数（デフォルト: 1）
   */
  contextParagraphs?: number;
  
  /**
   * 見出しを最大何階層まで含めるか（デフォルト: 全て）
   */
  maxHeadingDepth?: number;
}

export interface ExtractedText {
  /**
   * LLMに送信するテキスト
   */
  text: string;
  
  /**
   * 抽出された範囲の情報
   */
  range: {
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
  };
}

