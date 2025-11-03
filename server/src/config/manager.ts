import { Connection } from 'vscode-languageserver/node';
import type { BlogLspConfig, LlmProvider } from '@blogLsp/shared';
import { createLlmProvider } from '@blogLsp/shared';
import type {
  ServerConfig,
  CompletionSettings,
  CommandSettings,
  InitConfigOptions,
} from './types';
import { WorkspaceConfigLoader } from './loader';

/**
 * Configuration Manager
 * Manages configuration retrieval, initialization, and updates
 */
export class ConfigurationManager {
  private connection: Connection;
  private hasConfigurationCapability: boolean = false;
  private currentConfig: ServerConfig | null = null;
  private llmProvider: LlmProvider | null = null;
  private workspaceRoot: string | null = null;
  private workspaceLoader: WorkspaceConfigLoader | null = null;

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
   * Set workspace root to enable loading .blog-lsp.{toml,yml}
   */
  setWorkspaceRoot(rootPath: string | undefined): void {
    if (rootPath && rootPath !== this.workspaceRoot) {
      this.workspaceRoot = rootPath;
      this.workspaceLoader = new WorkspaceConfigLoader(rootPath);
    }
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
        stylePrompt: config.stylePrompt, // optional; may be overridden by workspace file
        language: config.language || 'ja',
        privacy: {
          scope: config.privacy?.scope || 'paragraph',
        },
        enableStreaming: config.enableStreaming || false,
        timeoutMs: config.timeoutMs || 50000,
        reasoningEffort: config.reasoningEffort, // Used for gpt-5 series
        verbosity: config.verbosity, // Used for gpt-5 series
      };

      // Merge workspace file settings with precedence: TOML > YAML > VS Code
      if (this.workspaceLoader) {
        const ws = this.workspaceLoader.load();
        if (ws) {
          if (ws.stylePrompt) blogLspConfig.stylePrompt = ws.stylePrompt;
          if (ws.provider) blogLspConfig.provider = ws.provider;
          if (ws.model) blogLspConfig.model = ws.model;
          if (ws.apiBaseUrl) blogLspConfig.apiBaseUrl = ws.apiBaseUrl;
          if (typeof ws.maxTokens === 'number') blogLspConfig.maxTokens = ws.maxTokens;
          if (typeof ws.temperature === 'number') blogLspConfig.temperature = ws.temperature;
          if (typeof ws.numSuggestions === 'number') blogLspConfig.numSuggestions = ws.numSuggestions;
          if (ws.language) blogLspConfig.language = ws.language as BlogLspConfig['language'];
          if (ws.privacy?.scope) blogLspConfig.privacy.scope = ws.privacy.scope as BlogLspConfig['privacy']['scope'];
          if (typeof ws.enableStreaming === 'boolean') blogLspConfig.enableStreaming = ws.enableStreaming;
          if (typeof ws.timeoutMs === 'number') blogLspConfig.timeoutMs = ws.timeoutMs;
          if (ws.reasoningEffort) blogLspConfig.reasoningEffort = ws.reasoningEffort as NonNullable<BlogLspConfig['reasoningEffort']>;
          if (ws.verbosity) blogLspConfig.verbosity = ws.verbosity as NonNullable<BlogLspConfig['verbosity']>;
        }
      }

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
      let settings: CompletionSettings = {
        triggerOnHeading: config.completion?.triggerOnHeading ?? true,
        maxHeadingSuggestions: config.completion?.maxHeadingSuggestions ?? 3,
        maxTextSuggestions: config.completion?.maxTextSuggestions ?? 1,
      };
      // Workspace file overrides if present
      if (this.workspaceLoader) {
        const ws = this.workspaceLoader.load();
        if (ws?.completion) {
          settings = {
            triggerOnHeading:
              ws.completion.triggerOnHeading ?? settings.triggerOnHeading,
            maxHeadingSuggestions:
              ws.completion.maxHeadingSuggestions ?? settings.maxHeadingSuggestions,
            maxTextSuggestions:
              ws.completion.maxTextSuggestions ?? settings.maxTextSuggestions,
          };
        }
      }
      return settings;
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
      let settings: CommandSettings = {
        enableHeadingGeneration: config.commands?.enableHeadingGeneration ?? true,
        enableParagraphCompletion: config.commands?.enableParagraphCompletion ?? true,
      };
      if (this.workspaceLoader) {
        const ws = this.workspaceLoader.load();
        if (ws?.commands) {
          settings = {
            enableHeadingGeneration: ws.commands.enableHeadingGeneration ?? settings.enableHeadingGeneration,
            enableParagraphCompletion: ws.commands.enableParagraphCompletion ?? settings.enableParagraphCompletion,
          };
        }
      }
      return settings;
    } catch (error) {
      this.connection.console.error(`Failed to get command settings: ${error}`);
      return {
        enableHeadingGeneration: true,
        enableParagraphCompletion: true,
      };
    }
  }
}
