import type { BlogLspConfig } from '@blogLsp/shared';

/**
 * ????????????????
 */
export interface ServerConfig extends BlogLspConfig {
  // ?????????????????????
}

/**
 * ???????
 */
export interface CompletionSettings {
  triggerOnHeading: boolean;
  maxHeadingSuggestions: number;
  maxTextSuggestions: number;
}

/**
 * ?????????
 */
export interface CommandSettings {
  enableHeadingGeneration: boolean;
  enableParagraphCompletion: boolean;
}

/**
 * ????????????
 */
export interface InitConfigOptions {
  provider?: string;
  model?: string;
  apiBaseUrl?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  numSuggestions?: number;
  style?: 'tech-blog' | 'casual' | 'formal';
  language?: 'ja' | 'en';
  privacy?: {
    scope?: 'selection' | 'paragraph' | 'document';
  };
  enableStreaming?: boolean;
  timeoutMs?: number;
  reasoningEffort?: 'minimal' | 'low' | 'middle' | 'high';
  verbosity?: 'low' | 'middle' | 'high';
}
