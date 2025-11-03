import { Connection } from 'vscode-languageserver/node';
import type { BlogLspConfig, LlmProvider } from '@blogLsp/shared';
import { createLlmProvider } from '@blogLsp/shared';
import type {
  ServerConfig,
  CompletionSettings,
  CommandSettings,
  InitConfigOptions,
} from './types';

/**
 * ???????
 * ????????????????
 */
export class ConfigurationManager {
  private connection: Connection;
  private hasConfigurationCapability: boolean = false;
  private currentConfig: ServerConfig | null = null;
  private llmProvider: LlmProvider | null = null;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * ???????????
   */
  setConfigurationCapability(hasCapability: boolean): void {
    this.hasConfigurationCapability = hasCapability;
  }

  /**
   * ???????????
   */
  hasCapability(): boolean {
    return this.hasConfigurationCapability;
  }

  /**
   * ????????
   */
  getCurrentConfig(): ServerConfig | null {
    return this.currentConfig;
  }

  /**
   * ???LLM????????
   */
  getLlmProvider(): LlmProvider | null {
    return this.llmProvider;
  }

  /**
   * VS Code????BlogLspConfig???
   * ??: ????????????API????????????????????
   */
  async getConfiguration(): Promise<ServerConfig | null> {
    if (!this.hasConfigurationCapability) {
      return null;
    }

    try {
      const config = await this.connection.workspace.getConfiguration('blogLsp');

      // ??????API?????????${env:VAR_NAME}??????
      let apiKey = config.apiKey;
      if (
        apiKey &&
        typeof apiKey === 'string' &&
        apiKey.startsWith('${env:') &&
        apiKey.endsWith('}')
      ) {
        const envVarName = apiKey.slice(6, -1);
        apiKey = process.env[envVarName] || apiKey;
      }

      // ????????????API?????????????????????????
      // ????????????????????????????currentConfig????
      const blogLspConfig: ServerConfig = {
        provider: config.provider || 'openai',
        model: config.model || 'gpt-4.1-nano',
        apiBaseUrl: config.apiBaseUrl,
        apiKey: this.currentConfig?.apiKey || apiKey, // ???API?????
        maxTokens: config.maxTokens, // ???????gpt-5?????????
        temperature: config.temperature, // ???????gpt-5?????????
        numSuggestions: config.numSuggestions || 1,
        style: config.style || 'tech-blog',
        language: config.language || 'ja',
        privacy: {
          scope: config.privacy?.scope || 'paragraph',
        },
        enableStreaming: config.enableStreaming || false,
        timeoutMs: config.timeoutMs || 50000,
        reasoningEffort: config.reasoningEffort, // gpt-5????
        verbosity: config.verbosity, // gpt-5????
      };

      return blogLspConfig;
    } catch (error) {
      this.connection.console.error(`Failed to get configuration: ${error}`);
      return null;
    }
  }

  /**
   * ???????????????
   */
  async updateConfigurationFromInit(initConfig: InitConfigOptions): Promise<void> {
    try {
      const blogLspConfig: ServerConfig = {
        provider: initConfig.provider || 'openai',
        model: initConfig.model || 'gpt-4.1-nano',
        apiBaseUrl: initConfig.apiBaseUrl,
        apiKey: initConfig.apiKey,
        maxTokens: initConfig.maxTokens, // ???????gpt-5?????????
        temperature: initConfig.temperature, // ???????gpt-5?????????
        numSuggestions: initConfig.numSuggestions || 2,
        style: initConfig.style || 'tech-blog',
        language: initConfig.language || 'ja',
        privacy: {
          scope: initConfig.privacy?.scope || 'paragraph',
        },
        enableStreaming: initConfig.enableStreaming || false,
        timeoutMs: initConfig.timeoutMs || 20000,
        reasoningEffort: initConfig.reasoningEffort, // gpt-5????
        verbosity: initConfig.verbosity, // gpt-5????
      };

      this.currentConfig = blogLspConfig;
      this.llmProvider = createLlmProvider(blogLspConfig);
      this.connection.console.log(`LLM provider initialized: ${this.llmProvider.name}`);
    } catch (error) {
      this.connection.console.error(
        `Failed to initialize LLM provider from init options: ${error}`
      );
    }
  }

  /**
   * ???????LLM??????????
   */
  async updateConfiguration(): Promise<void> {
    const newConfig = await this.getConfiguration();

    if (
      newConfig &&
      (!this.currentConfig ||
        JSON.stringify(this.currentConfig) !== JSON.stringify(newConfig))
    ) {
      this.currentConfig = newConfig;

      try {
        this.llmProvider = createLlmProvider(newConfig);
        this.connection.console.log(`LLM provider updated: ${this.llmProvider.name}`);
      } catch (error) {
        this.connection.console.error(`Failed to create LLM provider: ${error}`);
        this.llmProvider = null;
      }
    }
  }

  /**
   * ??????????
   */
  async getCompletionSettings(): Promise<CompletionSettings> {
    if (!this.hasConfigurationCapability) {
      return {
        triggerOnHeading: true,
        maxHeadingSuggestions: 3,
        maxTextSuggestions: 1,
      };
    }

    try {
      const config = await this.connection.workspace.getConfiguration('blogLsp');
      return {
        triggerOnHeading: config.completion?.triggerOnHeading ?? true,
        maxHeadingSuggestions: config.completion?.maxHeadingSuggestions ?? 3,
        maxTextSuggestions: config.completion?.maxTextSuggestions ?? 1,
      };
    } catch (error) {
      this.connection.console.error(`Failed to get completion settings: ${error}`);
      return {
        triggerOnHeading: true,
        maxHeadingSuggestions: 3,
        maxTextSuggestions: 1,
      };
    }
  }

  /**
   * ????????????
   */
  async getCommandSettings(): Promise<CommandSettings> {
    if (!this.hasConfigurationCapability) {
      return {
        enableHeadingGeneration: true,
        enableParagraphCompletion: true,
      };
    }

    try {
      const config = await this.connection.workspace.getConfiguration('blogLsp');
      return {
        enableHeadingGeneration: config.commands?.enableHeadingGeneration ?? true,
        enableParagraphCompletion: config.commands?.enableParagraphCompletion ?? true,
      };
    } catch (error) {
      this.connection.console.error(`Failed to get command settings: ${error}`);
      return {
        enableHeadingGeneration: true,
        enableParagraphCompletion: true,
      };
    }
  }
}
