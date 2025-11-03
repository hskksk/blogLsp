<!-- fdf9f295-3a31-4329-90e9-a2f463b93bd7 be36ce1f-f4f9-4471-9568-b93695a5de62 -->
# Enable OpenAI-compatible LLM Provider

## Scope

Add first-class support for OpenAI-compatible endpoints (OpenAI-style Chat Completions v1 with Bearer auth) selectable from both client and server.

## Key Changes

### 1) VS Code settings (client/package.json)

- Expand `blogLsp.provider` enum to include:
  - `openai-compatible`, `local-openai`, `local`
- Update descriptions to clarify when `apiBaseUrl` is required and when API key can be omitted (localhost or explicitly `openai-compatible`).
- Keep `apiKey` default as `${env:OPENAI_API_KEY}`; users can override or store via command.

Example snippet:

```json
{
  "blogLsp.provider": {
    "enum": ["openai", "openai-compatible", "local-openai", "local", "azure-openai"],
    "default": "openai",
    "description": "LLM provider. Use openai-compatible/local(-openai) with custom apiBaseUrl."
  }
}
```

### 2) Shared provider wiring (shared/src/llm)

- Verify `OpenAILangChainProvider` respects `apiBaseUrl`, `timeout`, and standard headers (`Authorization: Bearer <key>`, `Content-Type: application/json`). Adjust if needed.
- Ensure `createLlmProvider` routes `openai-compatible`, `local-openai`, `local` to `OpenAILangChainProvider` (already present) and keep default fallback to it.

### 3) Server config behavior (server/src/config)

- In `ConfigurationManager.getConfiguration`, keep reading `provider`, `apiBaseUrl`, and `apiKey` from settings/secret/env unchanged.
- Relax validation to allow missing `apiKey` when:
  - provider ∈ {`openai-compatible`, `local-openai`, `local`} OR
  - `apiBaseUrl` starts with `http://localhost`, `http://127.0.0.1`, or `http://0.0.0.0`.
- Emit a warning (not error) when key is missing under these conditions.
- Ensure all handlers obtain the LLM via `createLlmProvider` with the provided base URL.

### 4) Validation helper (server/src/utils/error-handler.ts)

- Update `checkConfiguration` to match the relaxed key requirement above and improve diagnostic message contents.

### 5) Tests and examples

- Extend `shared/src/llm/factory.test.ts` to assert that `openai-compatible` resolves to `OpenAILangChainProvider` and passes `apiBaseUrl` through.
- Extend `server/src/config/manager.test.ts` (or add) to cover API key optional scenarios for localhost and `openai-compatible`.
- Ensure `shared/src/scripts/test-llm.ts` docs mention `LLM_PROVIDER=openai-compatible` and `LLM_API_BASE_URL` usage.

### 6) Docs

- Root `README.md` quick-start:
  - Example VS Code settings.json:
```json
{
  "blogLsp.provider": "openai-compatible",
  "blogLsp.apiBaseUrl": "http://localhost:11434/v1",
  "blogLsp.model": "gpt-4o-mini",
  "blogLsp.apiKey": "${env:OPENAI_API_KEY}" // optional for localhost
}
```

  - CLI example: `LLM_PROVIDER=openai-compatible LLM_API_BASE_URL=http://localhost:11434/v1 npm -w shared run test:llm`

## Acceptance Criteria

- Provider can be set to `openai-compatible`/`local(-openai)` in VS Code settings UI.
- Requests go to the configured `apiBaseUrl` with OpenAI-style payload and headers.
- No hard error when API key is absent for localhost or `openai-compatible`; a warning is logged instead.
- Tests cover provider selection and key-optional paths.

### To-dos

- [ ] Expand provider enum and descriptions in client/package.json
- [ ] Confirm OpenAILangChainProvider honors apiBaseUrl/headers; adjust if needed
- [ ] Allow missing apiKey for openai-compatible/localhost; add warnings
- [ ] Adjust checkConfiguration diagnostics for key-optional rules
- [ ] Add factory tests for openai-compatible and base URL pass-through
- [ ] Add config manager tests for key-optional scenarios
- [ ] Update README with settings.json and CLI examples