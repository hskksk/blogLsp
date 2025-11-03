## 目標

- **目的**: VS Code 用 Markdown 向け Language Server を実装し、設定ファイルで選択した LLM による文章（特にブログ記事）補完を提供する。
- **範囲**: LSP 準拠の補完（Completion）、ドキュメント内設定の読込、拡張設定 UI、LLM プロバイダ抽象化、プライバシー配慮、基本テスト。

## 提供機能

### ✅ 実装済み

- **文章補完**: カーソル位置の前後文脈を LLM に渡して自然な続きの文を提案
- **見出し補完**: `#` トリガー時に見出し案を生成
- **トーン/文体制御**: 設定でトーン（カジュアル/フォーマル/技術ブログ向け）を選択（enum形式）
  - 将来的には `.blog-lsp.toml` で複数行の自然言語スタイルプロンプトを記述可能に予定
- **候補の複数提示**: 1〜10 件（設定可能、デフォルト: 1件）
- **ユーザープロンプト補助**: ブログ記事のセクション構成提案（見出し案）
- **プライバシー制御**: 選択範囲のみ/段落単位/ドキュメント全体など送信範囲を選択
- **コマンド**: `completeSelection`, `completeParagraph`, `insertHeading`
- **LSP機能**: `completion`, `documentSymbol`, `hover`, `codeAction`

### ⚠️ 部分的実装

- **ストリーミング**: 設定項目は実装済みだが、実際のストリーミング処理は未実装（`supportsStreaming` フラグのみ）
  - 用途: 明示的なコマンド実行時（`completeSelection`, `completeParagraph`, `insertHeading`）に生成テキストを段階的に挿入して体感速度を向上
  - 自動補完（Ctrl+Space）では使用しない（完了を待って一度に表示する方が自然）
- **executeCommand**: 実装済みだが、サーバーの capability として登録されていない（コメントアウト）

### ❌ 未実装

- **ワークスペース設定ファイル**: `.blog-lsp.toml` または `.blog-lsp.yml` の読み込み機能
  - TOML/YAML形式で複数行のスタイルプロンプトを記述可能
  - リポジトリ管理に適した設定ファイル形式（Prettier/ESLintのパターンに準拠）
- **テレメトリ**: 成功/失敗カウントなどの収集機能
- **キャッシュ**: 同一文脈・同一設定の短期メモ化
- **追加プロバイダ**: Anthropic, Google, Local（OpenAI互換のみ実装済み）
- **E2Eテスト**: 手動E2Eテストは未整備

## アーキテクチャ

- **VS Code Extension (Client)**
  - `vscode-languageclient` を用いて LSP サーバと通信
  - 設定 UI（`package.json` の `contributes.configuration`）
  - コマンド:「LLM 補完を挿入」「見出し案を生成」「選択範囲だけで補完」

- **Language Server (Server)**
  - Node.js/TypeScript で実装（`vscode-languageserver/node`）
  - 対応 LSP 機能: `initialize`, `textDocument/didOpen|didChange`, `completion`（必要に応じて `completionItem/resolve`）, `executeCommand`
  - Markdown 文脈抽出: 現在の段落、前後の見出し、ファイルメタデータ
  - LLM プロバイダ抽象化レイヤ:
    - ✅ OpenAI（LangChain経由）
    - ✅ Azure OpenAI（LangChain経由）
    - ❌ Anthropic（未実装）
    - ❌ Google（未実装）
    - ❌ Local/OpenAI互換（未実装）

- **共通**
  - 設定読込: VS Code 設定 + 環境変数参照 (`${env:VAR_NAME}`) + VS Code シークレットストレージ ✅
  - ワークスペース設定ファイル（任意）: ❌ 未実装
    - `.blog-lsp.toml` (TOML形式) - 推奨、複数行文字列が書きやすい
    - `.blog-lsp.yml` (YAML形式) - 代替形式
    - スタイルプロンプトの記述に適している（Prettier/ESLintのパターンに準拠）
  - テレメトリ: ❌ 未実装（デフォルト無効。明示許可時のみ軽量収集の予定）

## 設定項目

### ワークスペース設定ファイル（未実装）

プロジェクトルートに `.blog-lsp.toml` または `.blog-lsp.yml` を配置して、リポジトリ管理可能な設定を記述できます。

**`.blog-lsp.toml` の例**:

```toml
[style]
# 複数行のスタイルプロンプトを自然に記述可能
prompt = """
技術ブログ記事のスタイルガイド：

- 簡潔で明確な表現を心がける
- 開発者にとって読みやすい文章構成
- 専門用語を使用する場合は初出で説明を添える
- コード例を含める場合は適切な説明とコンテキストを提供
- 技術的な正確性を最優先する
"""

[completion]
maxTextSuggestions = 3
maxHeadingSuggestions = 5
triggerOnHeading = true
```

**`.blog-lsp.yml` の例**:

```yaml
style:
  prompt: |
    技術ブログ記事のスタイルガイド：
    
    - 簡潔で明確な表現を心がける
    - 開発者にとって読みやすい文章構成
    - 専門用語を使用する場合は初出で説明を添える

completion:
  maxTextSuggestions: 3
  maxHeadingSuggestions: 5
  triggerOnHeading: true
```

**設定の優先順位**:
1. `.blog-lsp.toml` (ワークスペースルート)
2. `.blog-lsp.yml` (ワークスペースルート)
3. VS Code設定 `blogLsp.stylePrompt`
4. VS Code設定 `blogLsp.style` (既存のenum、後方互換)
5. デフォルト値

✅ **実装済みの設定項目**:

```json
{
  "blogLsp.provider": "openai",                // ✅ 実装済み (openai, azure-openai)
  "blogLsp.model": "gpt-5-nano",               // ✅ 実装済み (デフォルト: gpt-5-nano)
  "blogLsp.apiBaseUrl": "https://api.openai.com/v1", // ✅ 実装済み
  "blogLsp.apiKey": "${env:OPENAI_API_KEY}",   // ✅ 実装済み (環境変数参照 + シークレットストレージ)
  "blogLsp.maxTokens": 128,                     // ✅ 実装済み (gpt-5系では未使用)
  "blogLsp.temperature": 0.7,                  // ✅ 実装済み (gpt-5系では未使用)
  "blogLsp.reasoningEffort": "minimal",        // ✅ 実装済み (gpt-5系で使用)
  "blogLsp.verbosity": "low",                  // ✅ 実装済み (gpt-5系で使用)
  "blogLsp.numSuggestions": 1,                 // ✅ 実装済み (1-5, デフォルト: 1)
  "blogLsp.style": "tech-blog",                // ✅ 実装済み (tech-blog, casual, formal)
                                                  // 将来的には .blog-lsp.toml で詳細なスタイルプロンプトを記述可能に
  "blogLsp.language": "ja",                    // ✅ 実装済み (ja, en)
  "blogLsp.privacy.scope": "paragraph",        // ✅ 実装済み (selection, paragraph, document)
  "blogLsp.enableStreaming": true,             // ⚠️ 設定のみ（実装未対応）
  "blogLsp.timeoutMs": 50000,                  // ✅ 実装済み
  "blogLsp.completion.triggerOnHeading": true, // ✅ 実装済み
  "blogLsp.completion.maxHeadingSuggestions": 3, // ✅ 実装済み
  "blogLsp.completion.maxTextSuggestions": 1,   // ✅ 実装済み
  "blogLsp.commands.enableHeadingGeneration": true, // ✅ 実装済み
  "blogLsp.commands.enableParagraphCompletion": true // ✅ 実装済み
}
```

## プロンプト設計

✅ **実装済み**:

- **システム指示**: 役割（技術ブログ編集者）、文体（読みやすく、冗長さを避ける、事実ベース）
  - 実装場所: `shared/src/index.ts` の `buildSystemPrompt()`
- **コンテキスト**: 前後の段落、直近の見出し、ユーザー設定（言語/文体/長さ）
  - 実装場所: `shared/src/markdown/prompt-builder.ts`
- **プロンプトテンプレート**: Mustacheテンプレートを使用
  - `shared/src/markdown/prompts/system.txt`: システムプロンプト
  - `shared/src/markdown/prompts/completion.txt`: 通常補完用
  - `shared/src/markdown/prompts/heading.txt`: 見出し補完用
  - `shared/src/markdown/prompts/paragraph-completion.txt`: 段落補完用

### サンプル（要約版）

```text
You are an assistant for Japanese technical blog writing. Keep tone: tech-blog, concise, clear.
Language: ja. Maintain formatting, Markdown, and code blocks untouched.
Continue the paragraph naturally and propose 2 alternative continuations.
```

❌ **未実装**:
- **安全策**: 秘匿情報のマスキング、URL/コード変更の防止ガイドライン
- **スタイルプロンプトの詳細記述**: `.blog-lsp.toml` での複数行スタイルプロンプト記述機能

## 最低限の LSP インターフェイス

✅ **実装済み**:

- `CompletionRequest`
  - ✅ トリガ: `.`, `\n`, ` `, `#` をトリガー文字として登録
  - ✅ サーバ側で文脈抽出 → LLM 呼び出し → 候補生成
  - ✅ 候補は `CompletionItem[]` として返却
  - ✅ `textEdit` または `insertText` を使用

- `DocumentSymbol`: ✅ 見出し階層の抽出
- `Hover`: ✅ 実装済み
- `CodeAction`: ✅ コマンド実行用のクイックアクション

⚠️ **部分的実装**:
- `ExecuteCommand`: 実装済みだが、capability として登録されていない（コメントアウト状態）

## ディレクトリ構成

✅ **実装済みの構成**:

```text
root
├─ client/                    # ✅ VS Code 拡張 (Language Client)
├─ server/                     # ✅ LSP サーバ本体
├─ shared/                     # ✅ 型/設定/LLM 抽象化
│  └─ src/
│     ├─ llm/                 # LLM プロバイダ実装
│     └─ markdown/            # Markdown 文脈抽出・プロンプト生成
├─ examples/                  # ✅ サンプル Markdown
├─ design/                    # ✅ 設計ドキュメント
└─ scripts/                   # (使用されていない)
```

実際の構成は Monorepo ではなく、npm workspaces を使用。

## 実装マイルストーン

### ✅ 完了

1. **スキャフォールド**
   - ✅ npm workspaces を使用
   - ✅ `client` と `server` の基本動作

2. **LLM 抽象化**
   - ✅ OpenAI, Azure OpenAI 実装（LangChain経由）
   - ✅ インターフェイス: `generateCompletions(context, options)` 実装済み
   - ❌ ストリーミング `onToken`: 未実装（`supportsStreaming` フラグのみ）

3. **Markdown 文脈抽出**
   - ✅ 段落/見出し抽出
   - ✅ 送信範囲（paragraph/selection/document）の実装
   - ✅ 見出し階層の抽出

4. **設定/秘密情報**
   - ✅ VS Code 設定 + 環境変数参照 (`${env:VAR_NAME}`)
   - ✅ VS Code シークレットストレージ
   - ❌ ワークスペース設定ファイル: 未実装
     - `.blog-lsp.toml` (TOML形式) - 複数行のスタイルプロンプトを自然に記述可能
     - `.blog-lsp.yml` (YAML形式) - 代替形式
     - Prettier/ESLintのパターンに準拠した標準的な設定ファイル形式

5. **補完品質**
   - ✅ プロンプト最適化（Mustacheテンプレート）
   - ✅ 温度・最大トークン調整
   - ✅ 候補数とレイテンシのバランス

6. **キャンセル**
   - ✅ `AbortSignal` によるキャンセル対応
   - ✅ タイムアウト設定

7. **テスト/検証**
   - ✅ 単体テスト（プロンプト生成/文脈抽出/LLM ファクトリー/設定管理）
     - テストフレームワーク: Mocha（計画では vitest だが実際は Mocha）
   - ❌ E2Eテスト: 未実装

8. **ドキュメント/配布**
   - ⚠️ README: 一部実装
   - ❌ 設定ガイド: 未整備
   - ❌ プライバシーポリシー: 未整備
   - ❌ VS Code Marketplace 用メタデータ: 未整備

### ⚠️ 部分的実装

- **ストリーミング**: 設定はあるが実際のストリーミング処理は未実装

### ❌ 未実装

- **追加プロバイダ**: Anthropic, Google, Local
- **ワークスペース設定ファイル**: `blog-lsp.config.json` の読み込み
- **テレメトリ**: 成功/失敗カウントなどの収集
- **キャッシュ**: 同一文脈・同一設定の短期メモ化
- **安全策**: 秘匿情報のマスキング
- **E2Eテスト**: 手動E2Eテストの整備

## 技術選定

✅ **実装済みの技術スタック**:

- **言語**: ✅ TypeScript
- **LSP**: ✅ `vscode-languageserver`, `vscode-languageclient`
- **HTTP**: ✅ LangChain.js 経由（内部で `fetch` 使用）
- **ビルド**: ✅ TypeScript コンパイラ (`tsc`)、npm workspaces
- **テスト**: ✅ Mocha（計画では `vitest` だが実際は Mocha + ts-node）
- **LLM統合**: ✅ LangChain.js (`@langchain/core`, `@langchain/openai`)
- **テンプレート**: ✅ Mustache (`mustache`)

## 主要 API（サーバ側, 抜粋）

```ts
interface LlmProvider {
  name: string;
  supportsStreaming: boolean;
  generateCompletions(
    context: {
      prompt: string;
      language: 'ja' | 'en';
      maxTokens: number;
      temperature: number;
      numSuggestions: number;
    },
    signal?: AbortSignal
  ): Promise<string[]>;
}
```

## プライバシーとセキュリティ

✅ **実装済み**:

- ✅ プライバシースコープ設定: `selection`, `paragraph`, `document`
  - デフォルト: `paragraph`（計画では "選択範囲のみ" だが、実際は "paragraph"）
- ✅ API キー管理:
  - 環境変数参照 (`${env:VAR_NAME}`) ✅
  - VS Code シークレットストレージ ✅
  - 設定ファイルに直接保存しない ✅

❌ **未実装**:

- ❌ 機微語のマスキング機能
- ❌ コードブロック保護の明示的な実装（プロンプトに指示は含まれているが、実装レベルの保護はなし）

## パフォーマンス/レイテンシ

✅ **実装済み**:

- ✅ 送信トークン数を抑制（前後5行のみ抽出、段落単位）
- ✅ タイムアウト設定 (`timeoutMs`)

❌ **未実装**:

- ❌ ストリーミング（コマンド実行時の体感速度向上のための逐次挿入）
  - 明示的なコマンド実行時（段落補完、選択範囲補完など）に生成テキストを段階的にエディタに挿入
  - 自動補完（Ctrl+Space）では使用しない（完了を待って候補を一度に表示する方が適切）
- ❌ キャッシュ（同一文脈・同一設定の短期メモ化）

## リスクと対応

- ネットワーク不安定: タイムアウト/リトライ/フォールバック
- モデル差異: 抽象化で差分吸収、互換 API から着手
- 品質ばらつき: プロンプト/温度/候補数の調整 UI

## 実装状況サマリー

### ✅ 完了項目（主要機能）

1. **コア機能**
   - ✅ 文章補完（通常補完・見出し補完）
   - ✅ 複数候補の生成
   - ✅ トーン/文体制御
   - ✅ プライバシースコープ制御

2. **LLM統合**
   - ✅ OpenAI プロバイダ
   - ✅ Azure OpenAI プロバイダ
   - ✅ LangChain.js による抽象化

3. **設定管理**
   - ✅ VS Code 設定UI
   - ✅ 環境変数参照
   - ✅ シークレットストレージ

4. **LSP機能**
   - ✅ Completion
   - ✅ DocumentSymbol
   - ✅ Hover
   - ✅ CodeAction

5. **テスト**
   - ✅ 単体テスト（59テスト通過）

### ⚠️ 部分的実装

- ストリーミング（設定のみ、実装なし）
  - 明示的なコマンド実行時のみに使用（自動補完では使用しない）
- ExecuteCommand（実装済みだが未登録）

### ❌ 未実装・今後の課題

1. **機能拡張**（優先順位順）
   - ワークスペース設定ファイル (`.blog-lsp.toml` または `.blog-lsp.yml`) - **最優先**
     - 複数行のスタイルプロンプトを自然言語で記述可能
     - リポジトリ管理に適した形式（Prettier/ESLintのパターンに準拠）
     - 優先順位: `.blog-lsp.toml` > `.blog-lsp.yml` > VS Code設定 > デフォルト
     - 変更検知とホットリロード: 設定ファイル保存時に即時反映（FS watch または `workspace/didChangeWatchedFiles`）
   - 追加プロバイダ（Anthropic, Local/OpenAI互換） - **優先度：高**
     - Anthropic: Claude API対応
     - Local/OpenAI互換: ローカルLLMやOpenAI互換API対応（例：Ollama、vLLM等）
   - Googleプロバイダ - 優先度：中
   - ストリーミング実装（コマンド実行時のみ、優先度：低）

2. **最適化**
   - キャッシュ機能
   - テレメトリ

3. **セキュリティ**
   - 機微情報マスキング

4. **テスト・ドキュメント**
   - E2Eテスト
   - 設定ガイド
   - プライバシーポリシー

5. **プロンプト品質**
   - システムプロンプトの強化（スタイル/トーン以外の基本指示を拡充）
     - 幻覚抑止（不明点は曖昧さを維持/提案に留める）
     - 事実ベース・根拠優先の指示
     - コード/フォーマットの非破壊性の明確化（Markdown/コードブロック保持）
     - 日本語技術文書の簡潔性・用語初出説明の徹底

## 次のアクション（優先順位順）

1. ❌ **ワークスペース設定ファイル**（最優先）: `.blog-lsp.toml` または `.blog-lsp.yml` の読み込み機能
   - TOML/YAMLパーサーの導入
   - 複数行のスタイルプロンプトを読み取り、プロンプト生成に組み込む
   - 優先順位: `.blog-lsp.toml` > `.blog-lsp.yml` > VS Code設定 `blogLsp.stylePrompt` > VS Code設定 `blogLsp.style` (enum) > デフォルト
   - 後方互換性を保つ（既存の `blogLsp.style` enum 設定も動作）

2. ❌ **LLMプロバイダ拡張**（優先度：高）:
   - **Anthropic**: Claude API対応
   - **Local/OpenAI互換**: ローカルLLMやOpenAI互換API対応（例：Ollama、vLLM等）

3. ⚠️ **executeCommandProvider の有効化**: サーバー側で capability として登録

4. ❌ **E2Eテスト**: 実際の使用シナリオでの検証

5. ❌ **ドキュメント整備**: 設定ガイド、README 拡充

6. ❌ **ストリーミング実装**（優先度：低）: コマンド実行時（`completeSelection`, `completeParagraph`, `insertHeading`）に生成テキストを段階的に挿入して体感速度を向上。自動補完では使用しない


