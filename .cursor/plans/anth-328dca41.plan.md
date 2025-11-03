<!-- 328dca41-36e4-4a26-821b-34911de73abb 5b4e9da5-f89a-4e02-a05b-3453441834ef -->
# Anthropic Provider Integration Plan (LangChain)

## Scope

- Add Anthropic provider using `@langchain/anthropic` under existing LLM abstraction.
- Default model: `claude-3-5-haiku-20241022`.
- Wire config across server/client, update factory, add unit tests, and docs.

## Key Files

- `shared/src/llm/`
  - `providers/anthropic.ts` (new)
  - `provider-factory.ts` (edit)
  - `types.ts` if needed (edit)
- `server/src/config.ts` (edit): validate provider/model/apiKey
- `client/package.json` (edit): contributes.configuration
- `README.md` and/or `design/LANGUAGE_SERVER_PLAN.md` (edit)
- Tests: `shared/test/llm/anthropic.spec.ts` (new)

## Implementation Steps

1. Create provider

   - File: `shared/src/llm/providers/anthropic.ts`
   - Use LangChain `ChatAnthropic` from `@langchain/anthropic`.
   - Map existing interface `LlmProvider.generateCompletions(context)` → call `ChatAnthropic.invoke()` with a single prompt string; return `string[]` suggestions (multi-call or batch via `Promise.all`).
   - Respect `numSuggestions`, `temperature`, `maxTokens`, `timeoutMs` (if in context or global config).
   - Derive API key from resolved config/secret storage (existing mechanism) via factory injection.
   - Set `supportsStreaming = false` (keeps parity with current system behavior; streaming flagged but not implemented).

2. Extend provider factory

   - File: `shared/src/llm/provider-factory.ts`
   - Add case `provider === 'anthropic'` → new `AnthropicProvider` instance.
   - Validate required fields (apiKey, model). Apply default model `claude-3-5-haiku-20241022` if missing.

3. Configuration surface

   - File: `client/package.json`
     - Add enum option `anthropic` to `blogLsp.provider`.
     - Add `blogLsp.anthropic.apiKey` (secret), `blogLsp.anthropic.apiBaseUrl` (optional, default `https://api.anthropic.com`), `blogLsp.model` accepts Anthropic models.
     - Update descriptions and markdown tips.
   - File: `server/src/config.ts`
     - Resolve provider-specific keys: if `provider === 'anthropic'`, read from `${env:ANTHROPIC_API_KEY}` fallback and VS Code secret storage if supported.
     - Set defaults and validation errors with actionable messages.

4. Prompt compatibility

   - Reuse existing prompt-builder and templates; ensure the single-completion prompt is passed as-is to Anthropic; remove any OpenAI-specific fields.

5. Error handling and timeouts

   - Wrap calls with `AbortSignal` and `timeoutMs` (existing mechanism). Map common Anthropic errors (401, 429, 5xx) to friendly messages.

6. Tests

   - File: `shared/test/llm/anthropic.spec.ts`
     - Unit tests: parameter mapping, suggestion count, error propagation, default model.
     - Mock `ChatAnthropic` via jest/mocha stubs.
   - Update any factory tests to include `anthropic` path.

7. Documentation

   - `README.md`: setup instructions, env var `ANTHROPIC_API_KEY`, provider selection examples.
   - `design/LANGUAGE_SERVER_PLAN.md`: move Anthropic from ❌ to ✅ in Provider matrix.

## Essential Snippets (illustrative)

- Provider wiring in factory:
```ts
// shared/src/llm/provider-factory.ts
if (config.provider === 'anthropic') {
  const model = config.model ?? 'claude-3-5-haiku-20241022';
  return new AnthropicProvider({ model, apiKey: resolvedApiKey, baseURL: config.apiBaseUrl });
}
```

- Provider skeleton:
```ts
// shared/src/llm/providers/anthropic.ts
import { ChatAnthropic } from '@langchain/anthropic';
export class AnthropicProvider implements LlmProvider { /* ... */ }
```


## Rollout

- Ship minor version bump.
- Verify manual E2E with example Markdown and `blogLsp.provider: anthropic`.
- Fallback guidance if API key missing.

### To-dos

- [ ] Create `shared/src/llm/providers/anthropic.ts` using ChatAnthropic
- [ ] Wire provider in `shared/src/llm/provider-factory.ts` with defaults
- [ ] Extend config resolution for Anthropic in `server/src/config.ts`
- [ ] Expose provider/options in `client/package.json` contributes.configuration
- [ ] Add unit tests for provider and factory path
- [ ] Update README and design plan for Anthropic usage
- [ ] Manual E2E check in VS Code with Anthropic