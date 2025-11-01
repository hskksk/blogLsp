export type PrivacyScope = 'selection' | 'paragraph' | 'document';

export interface BlogLspConfig {
  provider: string;
  model: string;
  apiBaseUrl?: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  numSuggestions: number;
  style: 'tech-blog' | 'casual' | 'formal';
  language: 'ja' | 'en';
  privacy: {
    scope: PrivacyScope;
  };
  enableStreaming: boolean;
  timeoutMs: number;
}

export interface LlmProvider {
  name: string;
  supportsStreaming: boolean;
  generateCompletions(
    context: {
      prompt: string;
      language: 'ja' | 'en';
      maxTokens: number;
      temperature: number;
      numSuggestions: number;
    },
    signal?: AbortSignal
  ): Promise<string[]>;
}

export function buildSystemPrompt(style: BlogLspConfig['style'], language: BlogLspConfig['language']): string {
  const base = 'You are an assistant for technical blog writing.';
  const styleText = style === 'tech-blog' ? 'Concise, clear, developer-friendly tone.' : style === 'formal' ? 'Formal, precise tone.' : 'Casual, friendly tone.';
  const langText = language === 'ja' ? 'Language: Japanese.' : 'Language: English.';
  return `${base} ${styleText} ${langText} Keep Markdown and code blocks untouched.`;
}

