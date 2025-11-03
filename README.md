## Blog Markdown Language Server

AI-assisted Language Server for Markdown blogging. Clean APIs, TypeScript-first, and easy to run locally or with OpenAI‑compatible providers. Inspired by the concise, user-friendly style of Hono's README [`honojs/hono`](https://github.com/honojs/hono).

### Quick Start

```bash
# Install deps (monorepo workspaces)
npm install

# Build all packages
npm run build

# (Optional) Run LLM test script against local/OpenAI-compatible endpoint
npm -w shared run test:llm
```

### Features

- **Markdown completions**: headings, paragraphs, and context-aware suggestions
- **Hover & symbols**: helpful hover info and document symbols for navigation
- **Code actions & commands**: quick-fixes and writer utilities
- **Local or cloud LLMs**: OpenAI-compatible (incl. Ollama `/v1`) via a single config
- **Monorepo**: clear separation of client, server, and shared logic

### Packages

- `client`: VS Code extension (Language Client)
- `server`: LSP server for Markdown completions and features
- `shared`: Shared types, LLM providers, and Markdown utilities

### Configuration

Use a local OpenAI-compatible server (e.g., Ollama) by setting provider and base URL. Works without an API key when pointing to localhost.

```bash
# Local Ollama OpenAI-compatible endpoint
export LLM_PROVIDER=openai-compatible
export LLM_MODEL="llama3.1:8b"
export LLM_API_BASE_URL="http://localhost:11434/v1"
# Optional: some servers require a dummy key
# export LLM_API_KEY=dummy

npm -w shared run test:llm
```

VS Code `settings.json` example:

```json
{
  "blogLsp.provider": "openai-compatible",
  "blogLsp.apiBaseUrl": "http://localhost:11434/v1",
  "blogLsp.model": "gpt-4o-mini",
  "blogLsp.apiKey": "${env:OPENAI_API_KEY}"
}
```

CLI one-liner for the test script:

```bash
LLM_PROVIDER=openai-compatible LLM_API_BASE_URL=http://localhost:11434/v1 npm -w shared run test:llm
```

### Examples

- Markdown: `examples/sample.md`
- Config template: `examples/.blog-lsp.sample.toml`

### Contributing

Issues and PRs are welcome. Please keep code readable and prefer TypeScript types over comments.

### License

MIT © Contributors