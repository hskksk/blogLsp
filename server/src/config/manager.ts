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
 * Configuration Manager
 * Manages configuration retrieval, initialization, and updates
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
   * Set configuration capability
   */
  setConfigurationCapability(hasCapability: boolean): void {
    this.hasConfigurationCapability = hasCapability;
  }

  /**
   * Get configuration capability status
   */
  hasCapability(): boolean {
    return this.hasConfigurationCapability;
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): ServerConfig | null {
    return this.currentConfig;
  }

  /**
   * Get current LLM provider
   */
  getLlmProvider(): LlmProvider | null {
    return this.llmProvider;
  }

  /**
   * Get BlogLspConfig from VS Code settings
   * Note: API keys from secret storage can only be obtained via initialization options
   */
  async getConfiguration(): Promise<ServerConfig | null> {
    if (!this.hasConfigurationCapability) {
      return null;
    }

    try {
      const config = await this.connection.workspace.getConfiguration('blogLsp');

      // Get API key from environment variable if configured as ${env:VAR_NAME}
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

      // API key from secret storage should already be set via initialization options
      // Here we only get values from config file (use existing currentConfig if empty)
      const blogLspConfig: ServerConfig = {
        provider: config.provider || 'openai',
        model: config.model || 'gpt-4.1-nano',
        apiBaseUrl: config.apiBaseUrl,
        apiKey: this.currentConfig?.apiKey || apiKey, // Preserve existing API key
        maxTokens: config.maxTokens, // Optional (not used for gpt-5 series)
        temperature: config.temperature, // Optional (not used for gpt-5 series)
        numSuggestions: config.numSuggestions || 1,
        style: config.style || 'tech-blog',
        language: config.language || 'ja',
        privacy: {
          scope: config.privacy?.scope || 'paragraph',
        },
        enableStreaming: config.enableStreaming || false,
        timeoutMs: config.timeoutMs || 50000,
        reasoningEffort: config.reasoningEffort, // Used for gpt-5 series
        verbosity: config.verbosity, // Used for gpt-5 series
      };

      return blogLspConfig;
    } catch (error) {
      this.connection.console.error(`Failed to get configuration: ${error}`);
      return null;
    }
  }

  /**
   * Update configuration from initialization options
   */
  async updateConfigurationFromInit(initConfig: InitConfigOptions): Promise<void> {
    try {
      const blogLspConfig: ServerConfig = {
        provider: initConfig.provider || 'openai',
        model: initConfig.model || 'gpt-4.1-nano',
        apiBaseUrl: initConfig.apiBaseUrl,
        apiKey: initConfig.apiKey,
        maxTokens: initConfig.maxTokens, // Optional (not used for gpt-5 series)
        temperature: initConfig.temperature, // Optional (not used for gpt-5 series)
        numSuggestions: initConfig.numSuggestions || 2,
        style: initConfig.style || 'tech-blog',
        language: initConfig.language || 'ja',
        privacy: {
          scope: initConfig.privacy?.scope || 'paragraph',
        },
        enableStreaming: initConfig.enableStreaming || false,
        timeoutMs: initConfig.timeoutMs || 20000,
        reasoningEffort: initConfig.reasoningEffort, // Used for gpt-5 series
        verbosity: initConfig.verbosity, // Used for gpt-5 series
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
   * Update configuration and reinitialize LLM provider
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
   * Get completion settings
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
   * Get command settings
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
