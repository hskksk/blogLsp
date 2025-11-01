# LLM Provider Test Script

LLMプロバイダをテストするためのスクリプトです。

## 使用方法

### 基本的な実行

```bash
# 環境変数を設定して実行
OPENAI_API_KEY=your-api-key npm run test:llm
```

### 環境変数オプション

以下の環境変数で設定をカスタマイズできます:

- `OPENAI_API_KEY` または `LLM_API_KEY`: APIキー（必須）
- `LLM_PROVIDER`: プロバイダ名（デフォルト: `openai`）
- `LLM_MODEL`: モデル名（デフォルト: `gpt-3.5-turbo`）
- `LLM_API_BASE_URL`: APIのベースURL（オプション）
- `LLM_MAX_TOKENS`: 最大トークン数（デフォルト: `256`）
- `LLM_TEMPERATURE`: 温度パラメータ（デフォルト: `0.7`）
- `LLM_NUM_SUGGESTIONS`: 候補数（デフォルト: `2`）
- `LLM_STYLE`: スタイル（`tech-blog` | `casual` | `formal`、デフォルト: `tech-blog`）
- `LLM_LANGUAGE`: 言語（`ja` | `en`、デフォルト: `ja`）
- `LLM_TIMEOUT_MS`: タイムアウト（ミリ秒、デフォルト: `20000`）

### 使用例

```bash
# デフォルト設定で実行
OPENAI_API_KEY=your-key npm run test:llm

# カスタム設定で実行
OPENAI_API_KEY=your-key \
  LLM_MODEL=gpt-4 \
  LLM_TEMPERATURE=0.9 \
  LLM_NUM_SUGGESTIONS=3 \
  LLM_STYLE=casual \
  npm run test:llm

# Azure OpenAIを使用
LLM_PROVIDER=azure-openai \
  LLM_API_KEY=your-azure-key \
  LLM_API_BASE_URL=https://your-instance.openai.azure.com \
  LLM_MODEL=gpt-4 \
  npm run test:llm
```

## 実行方法

### 方法1: tsxを使用（推奨）

```bash
npm run test:llm
```

この方法ではTypeScriptファイルを直接実行できます。事前にコンパイルする必要はありません。

### 方法2: コンパイル後に実行

```bash
npm run test:llm:build
```

この方法では、まずTypeScriptをコンパイルしてから実行します。

