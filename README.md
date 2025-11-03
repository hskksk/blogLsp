## Blog Markdown Language Server

- packages/client: VS Code extension (Language Client)
- packages/server: LSP server for Markdown completions
- packages/shared: Shared types and utilities

Build all:

```bash
npm run build
```

### Local/OpenAI-Compatible Providers

You can run against a local OpenAI-compatible server (e.g., Ollama `/v1`). Use the new provider ids `openai-compatible`, `local-openai`, or `local`, which reuse the OpenAI provider with `apiBaseUrl`.

Example environment for the test script:

```bash
# Local Ollama OpenAI-compatible endpoint
export LLM_PROVIDER=openai-compatible
export LLM_MODEL="llama3.1:8b"
export LLM_API_BASE_URL="http://localhost:11434/v1"

# Optional: some servers require a dummy key
# export LLM_API_KEY=dummy

npm -w shared run test:llm
```

Notes:
- API key is optional when using `openai-compatible`/`local*` providers or when `LLM_API_BASE_URL` points to localhost.
- Streaming is currently disabled in the test script.

