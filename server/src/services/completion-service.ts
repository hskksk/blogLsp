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
 * ??????
 * ????????????????
 */
export class CompletionService {
  constructor(private connection: Connection) {}

  /**
   * ????????
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
    // ?????????????
    const prompt = buildHeadingSuggestionPrompt({
      linesBefore: context.linesBefore,
      currentLine: context.currentLine,
      linesAfter: context.linesAfter,
      config,
    });

    this.connection.console.log(
      `Generating heading suggestions with prompt length: ${prompt.length}`
    );

    // LLM?????????
    const headings = await provider.generateCompletions({
      prompt,
      language: config.language,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      numSuggestions: completionSettings.maxHeadingSuggestions,
    });

    // ???CompletionItem???
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
   * ?????????
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
    // ???????????????
    const prompt = buildCompletionPrompt({
      currentText: context.currentText,
      linesBefore: context.linesBefore,
      linesAfter: context.linesAfter,
      config,
    });

    this.connection.console.log(
      `Generating text completions with prompt length: ${prompt.length}`
    );

    // LLM??????
    const completions = await provider.generateCompletions({
      prompt,
      language: config.language,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      numSuggestions: completionSettings.maxTextSuggestions,
    });

    // CompletionItem???
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
