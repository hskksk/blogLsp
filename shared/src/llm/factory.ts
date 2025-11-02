import type { BlogLspConfig, LlmProvider } from '../index';
import {
  LangChainLlmProvider,
  OpenAILangChainProvider,
  AzureOpenAILangChainProvider,
  type LangChainProviderConfig,
} from './providers';

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
    case 'openai':
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
  return ['openai', 'azure-openai'];
}

