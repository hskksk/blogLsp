/**
 * マークダウン文脈から前後N行を抽出
 */

export interface ContextLines {
  /**
   * カーソル位置までのテキスト（現在行の開始からカーソル位置まで）
   */
  currentText: string;
  
  /**
   * カーソルの直前N行
   */
  linesBefore: string[];
  
  /**
   * カーソルの直後N行
   */
  linesAfter: string[];
  
  /**
   * 現在行のテキスト（カーソル位置を含む行全体）
   */
  currentLine: string;
}

export interface Position {
  line: number;
  character: number;
}

/**
 * テキストから前後N行のコンテキストを抽出
 * 
 * @param text ドキュメント全体のテキスト
 * @param position カーソル位置
 * @param beforeLines 取得する前の行数（デフォルト: 5）
 * @param afterLines 取得する後の行数（デフォルト: 5）
 * @returns コンテキスト情報
 */
export function extractContextLines(
  text: string,
  position: Position,
  beforeLines: number = 5,
  afterLines: number = 5
): ContextLines {
  const lines = text.split(/\r\n|\r|\n/);
  const currentLine = lines[position.line] || '';
  
  // 現在位置までのテキストを取得
  const currentText = currentLine.substring(0, position.character);
  
  // カーソルの直前N行を取得
  const linesBefore: string[] = [];
  const startLine = Math.max(0, position.line - beforeLines);
  for (let i = startLine; i < position.line; i++) {
    linesBefore.push(lines[i]);
  }
  
  // カーソルの直後N行を取得
  const linesAfter: string[] = [];
  const endLine = Math.min(lines.length, position.line + afterLines + 1);
  for (let i = position.line + 1; i < endLine; i++) {
    linesAfter.push(lines[i]);
  }
  
  return {
    currentText,
    linesBefore,
    linesAfter,
    currentLine,
  };
}

