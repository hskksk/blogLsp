import { Connection } from 'vscode-languageserver/node';
import type { BlogLspConfig, LlmProvider } from '@blogLsp/shared';
import {
  buildCompletionPrompt,
  buildHeadingSuggestionPrompt,
  extractContextLines,
  buildCompletionItems,
  buildHeadingCompletionItems,
} from '@blogLsp/shared';
import type { CompletionSettings } from '../config/types';
import type { Position } from '@blogLsp/shared';

/**
 * Completion Service
 * Separates business logic for completion generation
 */
export class CompletionService {
  constructor(private connection: Connection) {}

  /**
   * Generate heading completion
   */
  async generateHeadingCompletion(
    context: {
      currentText: string;
      linesBefore: string[];
      currentLine: string;
      linesAfter: string[];
    },
    position: Position,
    config: BlogLspConfig,
    provider: LlmProvider,
    completionSettings: CompletionSettings
  ) {
    // Use heading completion prompt
    const prompt = buildHeadingSuggestionPrompt({
      linesBefore: context.linesBefore,
      currentLine: context.currentLine,
      linesAfter: context.linesAfter,
      config,
    });

    this.connection.console.log(
      `Generating heading suggestions with prompt length: ${prompt.length}`
    );

    // Generate heading candidates with LLM
    const headings = await provider.generateCompletions({
      prompt,
      language: config.language,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      numSuggestions: completionSettings.maxHeadingSuggestions,
    });

    // Convert to heading CompletionItems
    const completionItems = buildHeadingCompletionItems({
      completions: headings,
      position,
      currentText: context.currentText,
    });

    this.connection.console.log(
      `Generated ${completionItems.length} heading suggestions`
    );

    return completionItems;
  }

  /**
   * Generate text completion
   */
  async generateTextCompletion(
    context: {
      currentText: string;
      linesBefore: string[];
      currentLine: string;
      linesAfter: string[];
    },
    position: Position,
    config: BlogLspConfig,
    provider: LlmProvider,
    completionSettings: CompletionSettings
  ) {
    // Use regular text completion prompt
    const prompt = buildCompletionPrompt({
      currentText: context.currentText,
      linesBefore: context.linesBefore,
      linesAfter: context.linesAfter,
      config,
    });

    this.connection.console.log(
      `Generating text completions with prompt length: ${prompt.length}`
    );

    // Generate completions with LLM
    const completions = await provider.generateCompletions({
      prompt,
      language: config.language,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      numSuggestions: completionSettings.maxTextSuggestions,
    });

    // Convert to CompletionItems
    const completionItems = buildCompletionItems({
      completions,
      position,
      currentText: context.currentText,
    });

    this.connection.console.log(
      `Generated ${completionItems.length} text completions`
    );

    return completionItems;
  }
}
