<!-- 1b8ac782-75c9-40ec-8392-710167ae988e afce43b5-fb4f-4210-8957-3eb8389d0f26 -->
# Local/OpenAI-Compatible LLM Provider Plan

### Scope

- Implement explicit provider id for local OpenAI-compatible endpoints (e.g., Ollama `/v1`)
- Non-streaming chat completions only (re-use existing `generateCompletions`)
- No function-calling/tools in this iteration

### Key Changes

- Add provider id `openai-compatible` (alias `local-openai`, `local`) that maps to existing `OpenAILangChainProvider` with `apiBaseUrl` support.
- Permit missing API key when using local providers (esp. localhost) in the test script; keep API key optional in core.
- Expose provider in `getAvailableProviders()`.
- Add unit tests for factory creation and minimal local config.
- Update usage docs and example env for local endpoints.

### Files To Update

- `shared/src/llm/factory.ts`
  - Extend switch to handle `openai-compatible` | `local-openai` | `local` → `OpenAILangChainProvider`.
  - Update `getAvailableProviders()` to include new ids.
- `shared/src/llm/factory.test.ts`
  - Add cases for new provider ids.
  - Verify defaulting behavior and case-insensitivity.
- `shared/src/scripts/test-llm.ts`
  - Relax API key requirement when `provider` is `openai-compatible`/`local*` or `apiBaseUrl` is localhost.
  - Add sample env variables in comments.
- `README.md` (root or `shared/` README)
  - Document how to run against local OpenAI-compatible server.

### Behavioral Notes

- Reuse `OpenAILangChainProvider` so temperature/maxTokens and gpt-5 options continue to work when supported by the local backend.
- Streaming remains disabled by config; future work can add `streaming` support if needed.

### Minimal Example Config

```json
{
  "provider": "openai-compatible",
  "model": "llama3.1:8b",
  "apiBaseUrl": "http://localhost:11434/v1",
  "numSuggestions": 1,
  "language": "ja"
}
```

### Risks / Edge Cases

- Some local servers require a dummy API key header; if needed, set `LLM_API_KEY=dummy`.
- Minor differences in OpenAI compatibility (e.g., tokens/temperature names) are handled by LangChain; if a backend diverges, we may need custom adapter later.

### To-dos

- [ ] Add openai-compatible/local provider ids in factory and provider list
- [ ] Add unit tests for openai-compatible/local in factory.test.ts
- [ ] Relax API key requirement in test-llm.ts for local usage
- [ ] Document local provider usage and env examples in README