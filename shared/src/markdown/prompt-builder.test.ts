import { describe, it } from 'mocha';
import * as assert from 'assert';
import { buildCompletionPrompt, analyzeHeadingSuggestion } from './prompt-builder';
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
      linesBefore: ['Hello'],
      linesAfter: ['Hello'],
      fullText: 'Hello',
      position: { line: 0, character: 0 },
      config,
    });

    assert.ok(prompt.includes('CUSTOM STYLE LINE'));
  });
});

describe('analyzeHeadingSuggestion', () => {
  it('returns undefined flags when the current line is not a heading', () => {
    const md = [
      '# Title',
      '',
      'Some paragraph text',
    ].join('\n');

    const result = analyzeHeadingSuggestion(md, { line: 2, character: 0 });
    // Not on heading line
    assert.strictEqual(result.suggestSubSectionHeading, undefined);
    assert.strictEqual(result.suggestNextSectionHeading, undefined);
  });

  it('on a heading line: compares with previous heading (deeper -> suggest subsection)', () => {
    const md = [
      '# Title',
      '',
      '## Intro',
    ].join('\n');

    // Cursor on the heading line itself
    const result = analyzeHeadingSuggestion(md, { line: 2, character: 0 });
    assert.strictEqual(result.suggestSubSectionHeading, true);
    assert.strictEqual(result.suggestNextSectionHeading, false);
  });

  it('on first heading with no previous heading -> suggests next section', () => {
    const md = [
      '## First Section',
      '',
      'content',
    ].join('\n');

    const result = analyzeHeadingSuggestion(md, { line: 0, character: 0 });
    assert.strictEqual(result.suggestSubSectionHeading, undefined);
    assert.strictEqual(result.suggestNextSectionHeading, true);
  });
});
