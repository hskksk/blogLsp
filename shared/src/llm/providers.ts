import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LlmProvider } from '../index';

export interface LangChainProviderConfig {
  model: string;
  apiKey?: string;
  apiBaseUrl?: string;
  temperature?: number; // gpt-5系以前で使用
  maxTokens?: number; // gpt-5系以前で使用（gpt-5系では使用しない）
  timeout?: number;
  reasoningEffort?: 'minimal' | 'low' | 'middle' | 'high'; // gpt-5系で使用
  verbosity?: 'low' | 'middle' | 'high'; // gpt-5系で使用
}

/**
 * モデル名からgpt-5系かどうかを判定
 */
export function isGpt5Series(modelName: string): boolean {
  // gpt-5, gpt-5o, gpt-5-mini など、gpt-5で始まるモデル名を判定
  return /^gpt-5/i.test(modelName.trim());
}

/**
 * LangChain.jsを使用したLLMプロバイダの基底クラス
 */
export abstract class LangChainLlmProvider implements LlmProvider {
  abstract name: string;
  abstract supportsStreaming: boolean;
  protected model: BaseChatModel;
  protected config: LangChainProviderConfig;

  constructor(config: LangChainProviderConfig) {
    this.config = config;
    this.model = this.createModel(config);
  }

  /**
   * 具体的なモデルインスタンスを作成
   */
  protected abstract createModel(config: LangChainProviderConfig): BaseChatModel;

  /**
   * 補完を生成
   */
  async generateCompletions(
    context: {
      prompt: string;
      language: 'ja' | 'en';
      maxTokens?: number; // オプショナル（gpt-5系では使用しない）
      temperature?: number; // オプショナル（gpt-5系では使用しない）
      numSuggestions: number;
    },
    signal?: AbortSignal
  ): Promise<string[]> {
    try {
      const results: string[] = [];
      
      // numSuggestions分の補完を生成
      for (let i = 0; i < context.numSuggestions; i++) {
        const messages = [new HumanMessage(context.prompt)];
        const response = await this.model.invoke(messages, {
          signal,
        });
        
        const content = typeof response.content === 'string' 
          ? response.content 
          : String(response.content);
        
        results.push(content);
      }

      return results;
    } catch (error) {
      if (signal?.aborted) {
        throw new Error('Request was aborted');
      }
      throw error;
    }
  }
}

/**
 * OpenAI互換プロバイダ実装
 */
export class OpenAILangChainProvider extends LangChainLlmProvider {
  name = 'openai';
  supportsStreaming = true;

  protected createModel(config: LangChainProviderConfig): BaseChatModel {
    const isGpt5 = isGpt5Series(config.model);
    
    // ChatOpenAIのコンストラクタパラメータを構築
    const modelConfig: any = {
      modelName: config.model,
    };

    // gpt-5系とそれ以前でパラメータを切り替え
    if (isGpt5) {
      // gpt-5系: reasoning_effortとverbosityを使用
      if (config.reasoningEffort) {
        modelConfig.reasoningEffort = config.reasoningEffort;
      }
      if (config.verbosity) {
        modelConfig.verbosity = config.verbosity;
      }
      // temperatureとmaxTokensはgpt-5系では使用しない
    } else {
      // gpt-5系以前: temperatureとmaxTokensを使用
      if (config.temperature !== undefined) {
        modelConfig.temperature = config.temperature;
      }
      if (config.maxTokens) {
        modelConfig.maxTokens = config.maxTokens;
      }
      // reasoning_effortとverbosityは使用しない
    }

    if (config.apiKey) {
      modelConfig.openAIApiKey = config.apiKey;
    }

    if (config.apiBaseUrl) {
      modelConfig.configuration = {
        baseURL: config.apiBaseUrl,
      };
    }

    // LangChain's ChatOpenAI requires an API key at construction time.
    // For localhost OpenAI-compatible endpoints that do not require a key,
    // provide a harmless placeholder when none is configured.
    if (!modelConfig.openAIApiKey && modelConfig.configuration?.baseURL) {
      const base: string = modelConfig.configuration.baseURL as string;
      if (/^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?\//i.test(base)) {
        modelConfig.openAIApiKey = 'unused-localhost-key';
      }
    }

    if (config.timeout) {
      modelConfig.timeout = config.timeout;
    }

    return new ChatOpenAI(modelConfig) as BaseChatModel;
  }
}

/**
 * Azure OpenAI互換プロバイダ実装
 */
export class AzureOpenAILangChainProvider extends LangChainLlmProvider {
  name = 'azure-openai';
  supportsStreaming = true;

  protected createModel(config: LangChainProviderConfig): BaseChatModel {
    const isGpt5 = isGpt5Series(config.model);
    
    const modelConfig: any = {
      modelName: config.model,
    };

    // gpt-5系とそれ以前でパラメータを切り替え
    if (isGpt5) {
      // gpt-5系: reasoning_effortとverbosityを使用
      if (config.reasoningEffort) {
        modelConfig.reasoningEffort = config.reasoningEffort;
      }
      if (config.verbosity) {
        modelConfig.verbosity = config.verbosity;
      }
      // temperatureとmaxTokensはgpt-5系では使用しない
    } else {
      // gpt-5系以前: temperatureとmaxTokensを使用
      if (config.temperature !== undefined) {
        modelConfig.temperature = config.temperature;
      }
      if (config.maxTokens) {
        modelConfig.maxTokens = config.maxTokens;
      }
      // reasoning_effortとverbosityは使用しない
    }

    if (config.apiKey) {
      modelConfig.azureOpenAIApiKey = config.apiKey;
    }

    // Azure OpenAIのエンドポイントから情報を抽出
    if (config.apiBaseUrl) {
      try {
        const url = new URL(config.apiBaseUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        // パスからインスタンス名とデプロイメント名を推測
        // 例: https://{instance}.openai.azure.com/openai/deployments/{deployment}/chat/completions
        if (pathParts.length >= 2 && pathParts[0] === 'openai' && pathParts[1] === 'deployments') {
          modelConfig.azureOpenAIApiDeploymentName = pathParts[2];
          modelConfig.azureOpenAIApiInstanceName = url.hostname.split('.')[0];
          modelConfig.azureOpenAIApiVersion = url.searchParams.get('api-version') || '2024-02-15-preview';
        }
      } catch (e) {
        // URL解析に失敗した場合はそのまま続行
      }
    }

    if (config.timeout) {
      modelConfig.timeout = config.timeout;
    }

    return new ChatOpenAI(modelConfig) as BaseChatModel;
  }
}

/**
 * Anthropicプロバイダ実装
 */
export class AnthropicLangChainProvider extends LangChainLlmProvider {
  name = 'anthropic';
  supportsStreaming = false;

  protected createModel(config: LangChainProviderConfig): BaseChatModel {
    const modelConfig: any = {
      model: config.model,
    };

    if (config.apiKey) {
      modelConfig.apiKey = config.apiKey;
    }

    if (config.apiBaseUrl) {
      modelConfig.baseURL = config.apiBaseUrl;
    }

    // temperature/maxTokens are supported by many Claude models
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
}