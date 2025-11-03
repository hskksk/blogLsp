import { Connection, WorkspaceEdit, Range as LspRange } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { BlogLspConfig, LlmProvider } from '@blogLsp/shared';
import {
  buildCompletionPrompt,
  buildParagraphCompletionPrompt,
  buildHeadingSuggestionPrompt,
  extractContextLines,
} from '@blogLsp/shared';
import type { CompletionSettings } from '../config/types';

/**
 * Command Service
 * Separates business logic for command execution
 */
export class CommandService {
  constructor(
    private connection: Connection,
    private documents: TextDocuments<TextDocument>
  ) {}

  /**
   * Generate continuation of selected range
   */
  async completeSelection(
    uri: string,
    range: LspRange,
    selectedText: string,
    config: BlogLspConfig,
    provider: LlmProvider,
    completionSettings: CompletionSettings
  ): Promise<void> {
    const document = this.documents.get(uri);
    if (!document) {
      this.connection.window.showErrorMessage(`Document not found: ${uri}`);
      return;
    }

    const text = document.getText();
    const context = extractContextLines(text, range.start, 5, 5);

    const prompt = buildCompletionPrompt({
      currentText: selectedText || context.currentText,
      linesBefore: context.linesBefore,
      linesAfter: context.linesAfter,
      config,
    });

    const completions = await provider.generateCompletions({
      prompt,
      language: config.language,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      numSuggestions: completionSettings.maxTextSuggestions,
    });

    if (completions.length === 0 || !completions[0]) {
      this.connection.window.showInformationMessage('No completion generated');
      return;
    }

    let completion = completions[0];
    // Remove currentText from completion
    const textToComplete = selectedText || context.currentText;
    if (completion.startsWith(textToComplete)) {
      completion = completion.substring(textToComplete.length);
    }

    if (!completion.trimEnd()) {
      this.connection.window.showInformationMessage(
        'Generated completion is empty'
      );
      return;
    }

    const edit: WorkspaceEdit = {
      changes: {
        [uri]: [
          {
            range: {
              start: range.end,
              end: range.end,
            },
            newText: completion,
          },
        ],
      },
    };

    await this.connection.workspace.applyEdit(edit);
  }

  /**
   * Complete paragraph
   */
  async completeParagraph(
    uri: string,
    position: { line: number; character: number },
    config: BlogLspConfig,
    provider: LlmProvider,
    completionSettings: CompletionSettings
  ): Promise<void> {
    const document = this.documents.get(uri);
    if (!document) {
      this.connection.window.showErrorMessage(`Document not found: ${uri}`);
      return;
    }

    const text = document.getText();
    const pos = { line: position.line, character: position.character };
    const context = extractContextLines(text, pos, 5, 5);

    const prompt = buildParagraphCompletionPrompt({
      currentText: context.currentText,
      linesBefore: context.linesBefore,
      linesAfter: context.linesAfter,
      config,
    });

    const completions = await provider.generateCompletions({
      prompt,
      language: config.language,
      maxTokens: config.maxTokens ? config.maxTokens * 2 : undefined, // Generate longer text
      temperature: config.temperature,
      numSuggestions: completionSettings.maxTextSuggestions,
    });

    if (completions.length === 0 || !completions[0]) {
      this.connection.window.showInformationMessage('No completion generated');
      return;
    }

    let completion = completions[0];
    // Remove currentText from completion
    if (completion.startsWith(context.currentText)) {
      completion = completion.substring(context.currentText.length);
    }

    if (!completion.trimEnd()) {
      this.connection.window.showInformationMessage(
        'Generated completion is empty'
      );
      return;
    }

    const edit: WorkspaceEdit = {
      changes: {
        [uri]: [
          {
            range: {
              start: pos,
              end: pos,
            },
            newText: completion,
          },
        ],
      },
    };

    await this.connection.workspace.applyEdit(edit);
  }

  /**
   * Insert heading suggestion
   */
  async insertHeading(
    uri: string,
    position: { line: number; character: number },
    config: BlogLspConfig,
    provider: LlmProvider,
    completionSettings: CompletionSettings
  ): Promise<void> {
    const document = this.documents.get(uri);
    if (!document) {
      this.connection.window.showErrorMessage(`Document not found: ${uri}`);
      return;
    }

    const text = document.getText();
    const pos = { line: position.line, character: position.character };
    const context = extractContextLines(text, pos, 5, 5);

    const prompt = buildHeadingSuggestionPrompt({
      linesBefore: context.linesBefore,
      currentLine: context.currentLine,
      linesAfter: context.linesAfter,
      config,
    });

    const headings = await provider.generateCompletions({
      prompt,
      language: config.language,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      numSuggestions: completionSettings.maxHeadingSuggestions,
    });

    if (headings.length === 0 || !headings[0]) {
      this.connection.window.showInformationMessage(
        'No heading suggestion generated'
      );
      return;
    }

    let headingText = headings[0].trim();
    // Extract # from currentText
    const headingPrefix = context.currentText.match(/^#+\s*/)?.[0] || '# ';
    const fullHeading = headingPrefix + headingText;

    const edit: WorkspaceEdit = {
      changes: {
        [uri]: [
          {
            range: {
              start: { line: pos.line, character: 0 },
              end: pos,
            },
            newText: fullHeading,
          },
        ],
      },
    };

    await this.connection.workspace.applyEdit(edit);
  }
}
