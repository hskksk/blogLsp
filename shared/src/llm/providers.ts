import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LlmProvider } from '../index';

export interface LangChainProviderConfig {
  model: string;
  apiKey?: string;
  apiBaseUrl?: string;
  temperature: number;
  maxTokens: number;
  timeout?: number;
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
      maxTokens: number;
      temperature: number;
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
    const modelConfig: {
      modelName: string;
      temperature: number;
      maxTokens?: number;
      openAIApiKey?: string;
      configuration?: {
        baseURL?: string;
      };
      timeout?: number;
    } = {
      modelName: config.model,
      temperature: config.temperature,
    };

    if (config.maxTokens) {
      modelConfig.maxTokens = config.maxTokens;
    }

    if (config.apiKey) {
      modelConfig.openAIApiKey = config.apiKey;
    }

    if (config.apiBaseUrl) {
      modelConfig.configuration = {
        baseURL: config.apiBaseUrl,
      };
    }

    if (config.timeout) {
      modelConfig.timeout = config.timeout;
    }

    return new ChatOpenAI(modelConfig);
  }
}

/**
 * Azure OpenAI互換プロバイダ実装
 */
export class AzureOpenAILangChainProvider extends LangChainLlmProvider {
  name = 'azure-openai';
  supportsStreaming = true;

  protected createModel(config: LangChainProviderConfig): BaseChatModel {
    const modelConfig: {
      modelName: string;
      temperature: number;
      maxTokens?: number;
      azureOpenAIApiKey?: string;
      azureOpenAIApiInstanceName?: string;
      azureOpenAIApiDeploymentName?: string;
      azureOpenAIApiVersion?: string;
      timeout?: number;
    } = {
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    };

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

    return new ChatOpenAI(modelConfig);
  }
}