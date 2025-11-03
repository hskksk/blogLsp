import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LlmProvider } from '../../index';
import type { LangChainProviderConfig } from '../providers';

/**
 * Anthropic provider using LangChain ChatAnthropic
 */
export class AnthropicLangChainProvider implements LlmProvider {
  name = 'anthropic';
  supportsStreaming = false;

  private model: BaseChatModel;
  private config: LangChainProviderConfig;

  constructor(config: LangChainProviderConfig) {
    this.config = config;
    this.model = this.createModel(config);
  }

  protected createModel(config: LangChainProviderConfig): BaseChatModel {
    const modelConfig: any = {
      model: config.model || 'claude-3-5-haiku-20241022',
    };

    if (config.apiKey) {
      modelConfig.apiKey = config.apiKey;
    }

    if (config.apiBaseUrl) {
      // ChatAnthropic expects baseUrl
      modelConfig.baseUrl = config.apiBaseUrl;
    }

    // temperature / maxTokens are supported for Anthropic text models
    if (config.temperature !== undefined) {
      modelConfig.temperature = config.temperature;
    }
    if (config.maxTokens) {
      modelConfig.maxTokens = config.maxTokens;
    }

    if (config.timeout) {
      modelConfig.timeout = config.timeout;
    }

    return new ChatAnthropic(modelConfig) as unknown as BaseChatModel;
  }

  async generateCompletions(
    context: {
      prompt: string;
      language: 'ja' | 'en';
      maxTokens?: number;
      temperature?: number;
      numSuggestions: number;
    },
    signal?: AbortSignal
  ): Promise<string[]> {
    try {
      const results: string[] = [];

      for (let i = 0; i < context.numSuggestions; i++) {
        const messages = [new HumanMessage(context.prompt)];
        const response = await this.model.invoke(messages, { signal });
        const content = typeof (response as any).content === 'string'
          ? (response as any).content
          : String((response as any).content);
        results.push(content);
      }

      return results;
    } catch (error) {
      if (signal?.aborted) {
        throw new Error('Request was aborted');
      }
      throw error as Error;
    }
  }
}
