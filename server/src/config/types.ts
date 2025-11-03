import type { BlogLspConfig } from '@blogLsp/shared';

/**
 * Extended configuration type for server-side use
 */
export interface ServerConfig extends BlogLspConfig {
  // Add server-specific configuration items as needed
}

/**
 * Completion feature settings
 */
export interface CompletionSettings {
  triggerOnHeading: boolean;
  maxHeadingSuggestions: number;
  maxTextSuggestions: number;
}

/**
 * Command feature settings
 */
export interface CommandSettings {
  enableHeadingGeneration: boolean;
  enableParagraphCompletion: boolean;
}

/**
 * Initialization options type definition
 */
export interface InitConfigOptions {
  provider?: string;
  model?: string;
  apiBaseUrl?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  numSuggestions?: number;
  language?: 'ja' | 'en';
  privacy?: {
    scope?: 'selection' | 'paragraph' | 'document';
  };
  enableStreaming?: boolean;
  timeoutMs?: number;
  reasoningEffort?: 'minimal' | 'low' | 'middle' | 'high';
  verbosity?: 'low' | 'middle' | 'high';
}
