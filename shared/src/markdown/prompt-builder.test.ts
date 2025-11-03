import { describe, it } from 'mocha';
import * as assert from 'assert';
import { buildCompletionPrompt } from './prompt-builder';
import type { BlogLspConfig } from '../index';

function makeConfig(overrides: Partial<BlogLspConfig> = {}): BlogLspConfig {
  return {
    provider: 'openai',
    model: 'gpt-4.1-nano',
    numSuggestions: 1,
    language: 'en',
    privacy: { scope: 'paragraph' },
    enableStreaming: false,
    timeoutMs: 10000,
    ...overrides,
  } as BlogLspConfig;
}

describe('prompt-builder stylePrompt', () => {
  it('injects stylePrompt into system prompt when provided', () => {
    const config = makeConfig({ stylePrompt: 'CUSTOM STYLE LINE' });
    const prompt = buildCompletionPrompt({
      currentText: 'Hello',
      linesBefore: [],
      linesAfter: [],
      config,
    });

    assert.ok(prompt.includes('CUSTOM STYLE LINE'));
  });
});
