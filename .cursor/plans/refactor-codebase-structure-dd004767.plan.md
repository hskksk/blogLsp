<!-- dd004767-28e3-4987-97f8-8d3b58593e76 974e0ea9-7eec-48ad-b428-4b94d333b734 -->
# LSPイベント別補完機能の実装計画

## 現在の実装状況

現在は以下のイベントのみ実装済み：

- `textDocument/completion`: 文章補完（実装済み）

## 実装すべきLSPイベントと補完機能

### 1. textDocument/completion（拡張）

**状態**: 実装済み（基本機能）

**拡張内容**:

- トリガー文字に応じた補完タイプの切り替え
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - 通常の文字入力: 文章補完（現在の実装）
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `#`入力時: 見出し候補を優先表示
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - 改行後: 新しい段落の開始を提案

**実装方法**:

- `CompletionParams.context.triggerKind`を確認
- `triggerCharacter`が`#`の場合、見出し生成プロンプトを使用
- 既存の`buildCompletionPrompt`を拡張または新しい関数を追加

### 2. textDocument/documentSymbol（新規）

**目的**: 見出し階層をアウトラインビューに表示

**補完内容**:

- Markdownの見出し（`# ## ###`など）をシンボルとして抽出
- 階層構造を保持してアウトラインビューに表示

**実装方法**:

- `shared/src/markdown/heading-extractor.ts`を新規作成
- `onDocumentSymbol`ハンドラーを実装
- `extractMarkdownContext`を活用して見出し階層を抽出

### 3. textDocument/hover（新規）

**目的**: カーソル位置の見出し情報やコンテキストを表示

**補完内容**:

- 見出し上にホバー時: その見出しセクションの要約や次の見出しを表示
- 通常テキスト上: 現在のセクション情報を表示

**実装方法**:

- `onHover`ハンドラーを実装
- カーソル位置から見出しを検出し、関連情報を返す

### 4. workspace/executeCommand（新規）

**目的**: カスタムコマンドによる補完生成

**補完内容**:

- `blogLsp.generateHeading`: 見出し案を生成して挿入
- `blogLsp.completeSelection`: 選択範囲の続きを生成
- `blogLsp.completeParagraph`: 現在の段落を完成させる

**実装方法**:

- `onExecuteCommand`ハンドラーを実装
- コマンドごとに適切なプロンプトを生成
- 生成結果を`workspace/applyEdit`で挿入

### 5. textDocument/codeAction（新規）

**目的**: クイックアクションによる補完挿入

**補完内容**:

- 選択範囲に対して「続きを生成」アクション
- 段落途中で「段落を完成」アクション
- 見出し候補を挿入するアクション

**実装方法**:

- `onCodeAction`ハンドラーを実装
- 選択範囲やカーソル位置に応じたアクションを提供
- アクション実行時は`workspace/executeCommand`を呼び出す

### 6. textDocument/rangeFormatting（オプション）

**目的**: 生成されたテキストのフォーマット調整

**補完内容**:

- LLMで生成したテキストのフォーマットを整える
- Markdownのスタイルを統一

## 実装タスクの詳細

### Task 1: 見出し抽出機能の実装

- `shared/src/markdown/heading-extractor.ts`を作成
- `extractHeadings(text: string): DocumentSymbol[]`を実装
- 見出しのレベル、テキスト、行番号を抽出

### Task 2: documentSymbolイベントの実装

- `server/src/server.ts`に`onDocumentSymbol`ハンドラーを追加
- `InitializeResult.capabilities`に`documentSymbolProvider: true`を追加

### Task 3: hoverイベントの実装

- `server/src/server.ts`に`onHover`ハンドラーを追加
- カーソル位置から見出し情報を取得して表示

### Task 4: executeCommandイベントの実装

- `server/src/server.ts`に`onExecuteCommand`ハンドラーを追加
- 3つのコマンド（generateHeading, completeSelection, completeParagraph）を実装
- `connection.workspace.applyEdit`を使用してテキストを挿入

### Task 5: codeActionイベントの実装

- `server/src/server.ts`に`onCodeAction`ハンドラーを追加
- 選択範囲とカーソル位置に応じたアクションを生成

### Task 6: completionイベントの拡張

- `buildCompletionPrompt`を拡張してトリガー文字に応じた処理を追加
- または`buildHeadingCompletionPrompt`を新規作成

### Task 7: クライアント側のコマンド登録

- `client/src/extension.ts`にVS Codeコマンドを登録
- コマンドパレットからアクセス可能にする

## プロンプト設計の拡張

### 見出し生成用プロンプト（既存の`buildHeadingSuggestionPrompt`を活用）

- 現在のコンテキストから適切な見出しを提案
- JSON形式で構造化された情報を渡す

### 段落補完用プロンプト（新規）

- 選択範囲や段落の途中から続きを生成
- より長いテキストの生成が可能

## ファイル構成の変更

```
shared/src/markdown/
  - context-extractor.ts (既存)
  - completion-item-builder.ts (既存)
  - prompt-builder.ts (既存、拡張)
  - heading-extractor.ts (新規)
  - paragraph-completer.ts (新規、オプション)

server/src/
  - server.ts (既存、拡張)
  - handlers/
    - document-symbol-handler.ts (新規)
    - hover-handler.ts (新規)
    - command-handler.ts (新規)
    - code-action-handler.ts (新規)

client/src/
  - extension.ts (既存、コマンド登録を追加)
```

## 実装順序

1. **Phase 1**: 見出し関連機能（documentSymbol, hover）
2. **Phase 2**: コマンド機能（executeCommand, クライアントコマンド登録）
3. **Phase 3**: コードアクション機能（codeAction）
4. **Phase 4**: 補完機能の拡張（トリガー文字対応）

## 設定項目の追加（オプション）

```json
{
  "blogLsp.completion.triggerOnHeading": true,
  "blogLsp.completion.maxHeadingSuggestions": 3,
  "blogLsp.commands.enableHeadingGeneration": true,
  "blogLsp.commands.enableParagraphCompletion": true
}
```

### To-dos

- [ ] shared/src/markdown/context-extractor.ts を新規作成し、前後N行を取得する関数を実装
- [ ] shared/src/markdown/completion-item-builder.ts を新規作成し、補完アイテム変換ロジックを実装
- [ ] server/src/server.ts の onCompletion ハンドラーをリファクタリングして新規ヘルパー関数を使用
- [ ] client/src/extension.ts のデバッグミドルウェアを条件付きにする
- [ ] shared/src/index.ts を更新して新規関数をエクスポート