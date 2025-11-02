/**
 * プロンプトテンプレートの読み込みとレンダリング
 */

import * as fs from 'fs';
import * as path from 'path';
import Mustache from 'mustache';

// テンプレートファイルのディレクトリパス
// 実行時とビルド後のパスを考慮
const getPromptsDir = (): string => {
  // __dirnameはビルド後のJSファイルの場所を指す
  // src/markdown/prompt-loader.ts → out/markdown/prompt-loader.js
  const currentDir = __dirname;
  
  // まず現在のディレクトリ（out/markdown または src/markdown）から prompts を探す
  let promptsDir = path.join(currentDir, 'prompts');
  
  if (fs.existsSync(promptsDir)) {
    return promptsDir;
  }
  
  // ビルド後の場合（out/markdown）、srcディレクトリから探す
  if (currentDir.includes('out')) {
    // out/markdown → src/markdown/prompts
    const srcBaseDir = currentDir.replace(/[/\\]out[/\\]markdown$/, '/src/markdown');
    promptsDir = path.join(srcBaseDir, 'prompts');
    if (fs.existsSync(promptsDir)) {
      return promptsDir;
    }
  }
  
  // 最後の手段: 相対パスで探す（プロジェクトルートから）
  // これはエラーを投げる前に試す
  return promptsDir;
};

// テンプレートをキャッシュ
const templateCache = new Map<string, string>();

/**
 * テンプレートファイルを読み込む
 */
function loadTemplate(name: string): string {
  if (templateCache.has(name)) {
    return templateCache.get(name)!;
  }

  const promptsDir = getPromptsDir();
  const templatePath = path.join(promptsDir, `${name}.txt`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  const template = fs.readFileSync(templatePath, 'utf-8');
  templateCache.set(name, template);
  return template;
}

/**
 * テンプレートをレンダリング
 * 
 * @param name テンプレート名（拡張子なし）
 * @param data テンプレートに渡すデータ
 * @returns レンダリングされたテンプレート文字列
 */
export function renderTemplate(
  name: string,
  data: Record<string, unknown>
): string {
  const template = loadTemplate(name);
  return Mustache.render(template, data);
}

