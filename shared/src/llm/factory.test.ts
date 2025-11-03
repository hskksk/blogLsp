import { describe, it } from 'mocha';
import * as assert from 'assert';
import { createLlmProvider, getAvailableProviders } from './factory';
import type { BlogLspConfig } from '../index';



describe('factory.ts', () => {
  describe('createLlmProvider', () => {
    it('should create OpenAI provider for openai', () => {
      const config: BlogLspConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        numSuggestions: 1,
        style: 'tech-blog',
        language: 'ja',
        privacy: { scope: 'paragraph' },
        enableStreaming: false,
        timeoutMs: 5000,
      };

      const provider = createLlmProvider(config);

      assert.ok(provider);
      assert.equal(provider.name, 'openai');
      assert.ok(provider.supportsStreaming !== undefined);
    });

    it('should create Azure OpenAI provider for azure-openai', () => {
      const config: BlogLspConfig = {
        provider: 'azure-openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        apiBaseUrl: 'https://test.openai.azure.com',
        numSuggestions: 1,
        style: 'tech-blog',
        language: 'ja',
        privacy: { scope: 'paragraph' },
        enableStreaming: false,
        timeoutMs: 5000,
      };

      const provider = createLlmProvider(config);

      assert.ok(provider);
      assert.equal(provider.name, 'azure-openai');
      assert.ok(provider.supportsStreaming !== undefined);
    });

    it('should create Azure OpenAI provider for azure alias', () => {
      const config: BlogLspConfig = {
        provider: 'azure',
        model: 'gpt-4',
        apiKey: 'test-key',
        apiBaseUrl: 'https://test.openai.azure.com',
        numSuggestions: 1,
        style: 'tech-blog',
        language: 'ja',
        privacy: { scope: 'paragraph' },
        enableStreaming: false,
        timeoutMs: 5000,
      };

      const provider = createLlmProvider(config);

      assert.ok(provider);
      assert.equal(provider.name, 'azure-openai');
    });

    it('should default to OpenAI for unknown providers', () => {
      const config: BlogLspConfig = {
        provider: 'unknown-provider',
        model: 'gpt-4',
        apiKey: 'test-key',
        numSuggestions: 1,
        style: 'tech-blog',
        language: 'ja',
        privacy: { scope: 'paragraph' },
        enableStreaming: false,
        timeoutMs: 5000,
      };

      const provider = createLlmProvider(config);

      assert.ok(provider);
      assert.equal(provider.name, 'OpenAI');
    });

    it('should handle case-insensitive provider names', () => {
      const config: BlogLspConfig = {
        provider: 'OPENAI',
        model: 'gpt-4',
        apiKey: 'test-key',
        numSuggestions: 1,
        style: 'tech-blog',
        language: 'ja',
        privacy: { scope: 'paragraph' },
        enableStreaming: false,
        timeoutMs: 5000,
      };

      const provider = createLlmProvider(config);

      assert.ok(provider);
      assert.equal(provider.name, 'OpenAI');
    });

    it('should pass configuration to provider', () => {
      const config: BlogLspConfig = {
        provider: 'openai',
        model: 'custom-model',
        apiKey: 'custom-key',
        apiBaseUrl: 'https://custom.url',
        maxTokens: 256,
        temperature: 0.7,
        numSuggestions: 3,
        style: 'formal',
        language: 'en',
        privacy: { scope: 'document' },
        enableStreaming: true,
        timeoutMs: 10000,
        reasoningEffort: 'high',
        verbosity: 'middle',
      };

      const provider = createLlmProvider(config);

      assert.ok(provider);
      assert.ok(provider);
      assert.equal(provider.name, 'openai');
    });

    it('should handle minimal configuration', () => {
      const config: BlogLspConfig = {
        provider: 'openai',
        model: 'gpt-4',
        numSuggestions: 1,
        style: 'tech-blog',
        language: 'ja',
        privacy: { scope: 'paragraph' },
        enableStreaming: false,
        timeoutMs: 5000,
      };

      const provider = createLlmProvider(config);

      assert.ok(provider);
      assert.equal(provider.name, 'OpenAI');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = getAvailableProviders();

      assert.ok(Array.isArray(providers));
      assert.ok(providers.length > 0);
      assert.ok(providers.includes('openai'));
      assert.ok(providers.includes('azure-openai'));
    });

    it('should return consistent provider list', () => {
      const providers1 = getAvailableProviders();
      const providers2 = getAvailableProviders();

      assert.deepStrictEqual(providers1, providers2);
    });
  });
});
