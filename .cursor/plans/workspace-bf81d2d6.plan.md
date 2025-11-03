<!-- bf81d2d6-0386-4030-8f88-6d16d0614b8e f7c629d4-79fc-4203-b6b2-c31f2a4c17d9 -->
# ワークスペース設定ファイル 実装計画 (.blog-lsp.toml / .blog-lsp.yml)

## 目的

- プロジェクトルートの `.blog-lsp.toml` / `.blog-lsp.yml` を読み込み、VS Code 設定とマージしてサーバー設定に反映。
- スタイルの詳細指定（複数行）を `stylePrompt` として受け取り、プロンプト生成に反映。
- 設定の優先順位に従い、変更時は自動リロード。

## 設定の優先順位

1. `.blog-lsp.toml`（ワークスペースルート）
2. `.blog-lsp.yml`（ワークスペースルート）
3. VS Code 設定 `blogLsp.stylePrompt`（新規）
4. VS Code 設定 `blogLsp.style`（enum：後方互換）
5. 既存デフォルト

## 設定ファイルのスキーマ（最小）

- style.prompt: 複数行のスタイルプロンプト（string）
- completion.maxTextSuggestions: number
- completion.maxHeadingSuggestions: number
- completion.triggerOnHeading: boolean

例（toml）:

```toml
[style]
prompt = """
技術ブログ記事のスタイルガイド…
"""

[completion]
maxTextSuggestions = 2
maxHeadingSuggestions = 5
triggerOnHeading = true
```

## 実装ポイント

- サーバー側に `WorkspaceConfigLoader` を追加し、ワークスペースルートから toml/yaml を探索・読み込み・パース。
- `ConfigurationManager` にワークスペース設定のマージ処理を組み込み（上記優先順位）。
- 共有型 `BlogLspConfig` に `stylePrompt?: string` を追加。`style` は後方互換で維持。
- `buildSystemPrompt` を拡張し、`stylePrompt` があればテンプレートに差し込み（なければ既存の enum スタイル文）。
- `completion` セクションは既存 `getCompletionSettings()` の返却値に上書き反映。
- 変更検知：
  - クライアントで `.blog-lsp.toml|yml` を `FileSystemWatcher` で監視、変更時に `onDidChangeConfiguration` をトリガー（または再起動）。
  - サーバーは `onDidChangeConfiguration` で再読み込みし、LLM プロバイダを必要に応じて再初期化。

## 変更箇所

- server
  - `server/src/config/loader.ts`（新規）：`WorkspaceConfigLoader` 実装（発見・パース・バリデーション・キャッシュ[mtime]）。
  - `server/src/config/manager.ts`：`getConfiguration()` と `getCompletionSettings()` にローダの統合、マージロジック追加。
  - `server/src/server.ts`：`workspaceFolders` からルートパスを `ConfigurationManager` に渡す仕組み追加。
  - 型：`server/src/config/types.ts` 必要に応じて補助型を追加。
- shared
  - `shared/src/index.ts`：`BlogLspConfig` に `stylePrompt?: string` を追加。
  - `shared/src/markdown/prompt-builder.ts` または `buildSystemPrompt()`：`stylePrompt` 対応。`system` テンプレートに `{{stylePrompt}}` を追加。
  - `shared/src/markdown/prompts/system.txt`：`stylePrompt` を安全に差し込むプレースホルダを追加（未設定時は空）。
- client
  - `client/src/extension.ts`：`workspace.createFileSystemWatcher('**/.blog-lsp.{toml,yml}')` を追加し、変更時に設定変更通知（`client.stop()/start()` か `onDidChangeConfiguration` を誘発）。
  - `package.json`：`contributes.configuration` に `blogLsp.stylePrompt`（string, multiline）を追加。

## マージアルゴリズム（概要）

- 読み取り結果を中間表現に正規化：
  - style.prompt → `stylePrompt`
  - completion.* → `CompletionSettings` 上書き
- サーバ側 VS Code 設定（含む secrets 展開）をベースに、次を順に適用：
  - VS Code `stylePrompt`
  - YAML/TOML の `stylePrompt`（上位優先）
  - `CompletionSettings` は YAML/TOML があればそれを優先。

## エラーハンドリング

- 不正ファイル・パース失敗はログ警告＋無視。
- 破損時は直前の有効設定を保持。

## テスト

- `server/src/config/manager.test.ts` に統合テスト追加：
  - TOML/YAML 読み込み、優先順位、上書き、無効ファイルのフォールバック。
- `shared/src/markdown/prompt-builder.test.ts`：`stylePrompt` 反映（system テンプレートに含まれること）。
- `client` はユニット困難なため、最小限のハンドラで E2E 手動手順を README に追記。

## ロールアウト手順

1. 共有型とテンプレートを先に拡張（ビルド可能に）。
2. サーバのローダとマージを実装し、初期化・更新フローに組み込み。
3. クライアントのファイル監視を追加。
4. テストを追加し、既存 59 テストが通ることを確認。

### To-dos

- [ ] Add stylePrompt to BlogLspConfig and update system template
- [ ] Teach buildSystemPrompt to use stylePrompt when provided
- [ ] Create WorkspaceConfigLoader to read TOML/YAML from workspace root
- [ ] Integrate loader into ConfigurationManager with precedence rules
- [ ] Pass workspace root to ConfigurationManager during initialize
- [ ] Add FileSystemWatcher for .blog-lsp.{toml,yml} and trigger reload
- [ ] Add blogLsp.stylePrompt to client package.json contributes.configuration
- [ ] Add tests for loader/manager precedence and failure cases
- [ ] Add tests for stylePrompt inclusion in system prompt