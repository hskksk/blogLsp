<!-- 2bf8fc76-811c-49fe-8b9e-e5eda67e8790 29ebc66e-e5dc-46ea-981e-18efa45f8646 -->
# プロンプトビルダーに新しいテンプレートパラメータを追加

## 概要

プロンプトテンプレートに追加された以下のパラメータに値を渡せるように修正:

- `articleTitle`: 記事タイトル（フロントマターまたは最初のH1）
- `articleSectionStructure`: 全見出しの配列（H1/H2/H3）
- `currentSectionHeading`: 現在セクションの見出し
- `suggestSubSectionHeading` / `suggestNextSectionHeading`: 見出し提案の種類フラグ

## 実装内容

### 1. ヘルパー関数の追加（`prompt-builder.ts`）

- `extractArticleInfo(text: string, position: Position)` 関数を追加:
- フロントマターから `title` を抽出、なければ最初のH1を取得
- テキスト全体から全見出し（H1/H2/H3）を抽出して配列に
- カーソル位置から最も近い見出しを取得
- 見出し提案の種類を判定（サブセクションか次のセクションか）

### 2. `buildCompletionPrompt` の修正

- `contextData` に以下を追加:
- `articleTitle`: 抽出した記事タイトル
- `currentSectionHeading`: 現在セクションの見出しテキスト
- `contextJson` を JSON文字列ではなくオブジェクトとして渡す（`contextData` を直接渡す）

### 3. `buildParagraphCompletionPrompt` の修正

- `buildCompletionPrompt` と同様に `articleTitle` と `currentSectionHeading` を追加
- `contextJson` をオブジェクトとして渡す

### 4. `buildHeadingSuggestionPrompt` の修正

- `contextData` に以下を追加:
- `articleTitle`: 抽出した記事タイトル
- `articleSectionStructure`: 全見出しテキストの配列
- `currentSectionHeading`: 現在セクションの見出しテキスト（存在する場合）
- `contextJson` をオブジェクトとして渡す
- 条件付きブロックの判定（見出し階層の比較に基づく）:
- 現在行から見出しレベルを抽出（`#` の数、H1-H6に対応）
- カーソル位置より前の最も近い見出しのレベルを取得
- `suggestSubSectionHeading`: 現在行の見出しレベルが直前の見出しより深い（大きい値）場合に true
- 例: 直前が H1 (#)、現在行が H2 (##) → true
- 例: 直前が H2 (##)、現在行が H3 (###) → true
- `suggestNextSectionHeading`: 現在行の見出しレベルが直前の見出しと同じ深さの場合に true
- 例: 直前が H1 (#)、現在行が H1 (#) → true
- 例: 直前が H2 (##)、現在行が H2 (##) → true

### 5. 関数シグネチャの変更

- `PromptBuildingOptions` に `fullText: string` と `position: Position` を追加（または個別に渡す）
- `buildHeadingSuggestionPrompt` のオプションにも `fullText` と `position` を追加

### 6. 呼び出し側の修正

- `completion-service.ts`: `buildCompletionPrompt` と `buildHeadingSuggestionPrompt` の呼び出しに `fullText` と `position` を追加
- `command-service.ts`: 同様に各関数の呼び出しを修正

## 技術的考慮事項

- `extractMarkdownContext` や `extractHeadings` を活用して情報を抽出
- フロントマターの `title` フィールドは既存の `extractFrontMatter` 関数で取得可能
- 見出し抽出は `extractHeadings` または `heading-extractor.ts` の関数を使用
- Mustache テンプレートでは、オブジェクトを直接渡すことで `{{contextJson.articleTitle}}` のようなアクセスが可能