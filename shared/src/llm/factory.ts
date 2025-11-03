import type { BlogLspConfig, LlmProvider } from '../index';
import {
  LangChainLlmProvider,
  OpenAILangChainProvider,
  AzureOpenAILangChainProvider,
  type LangChainProviderConfig,
} from './providers';
import { AnthropicLangChainProvider } from './providers/anthropic';

/**
 * LLMプロバイダファクトリー
 * 設定に基づいて適切なプロバイダインスタンスを作成
 */
export function createLlmProvider(config: BlogLspConfig): LlmProvider {
  const providerConfig: LangChainProviderConfig = {
    model: config.model,
    apiKey: config.apiKey,
    apiBaseUrl: config.apiBaseUrl,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    timeout: config.timeoutMs,
    reasoningEffort: config.reasoningEffort,
    verbosity: config.verbosity,
  };

  switch (config.provider.toLowerCase()) {
    case 'anthropic': {
      const withDefaultModel: LangChainProviderConfig = {
        ...providerConfig,
        model: providerConfig.model || 'claude-3-5-haiku-20241022',
      };
      return new AnthropicLangChainProvider(withDefaultModel);
    }
    case 'openai':
      return new OpenAILangChainProvider(providerConfig);

    // Explicit local/OpenAI-compatible aliases that reuse OpenAI provider with apiBaseUrl
    case 'openai-compatible':
    case 'local-openai':
    case 'local':
      return new OpenAILangChainProvider(providerConfig);

    case 'azure-openai':
    case 'azure':
      return new AzureOpenAILangChainProvider(providerConfig);

    default:
      // デフォルトはOpenAI互換として扱う（カスタムエンドポイントなど）
      return new OpenAILangChainProvider(providerConfig);
  }
}

/**
 * 利用可能なプロバイダのリストを取得
 */
export function getAvailableProviders(): string[] {
  return ['openai', 'openai-compatible', 'local-openai', 'local', 'azure-openai', 'anthropic'];
}

