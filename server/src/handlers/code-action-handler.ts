import { Connection, CodeActionParams, CodeAction } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { ConfigurationManager } from '../config/manager';

/**
 * Code Action Handler
 * Generates code actions
 */
export class CodeActionHandler {
  constructor(
    private connection: Connection,
    private documents: TextDocuments<TextDocument>,
    private configManager: ConfigurationManager
  ) {}

  /**
   * Code Action Handler
   */
  async handleCodeAction(params: CodeActionParams): Promise<CodeAction[]> {
    try {
      const document = this.documents.get(params.textDocument.uri);
      if (!document) {
        return [];
      }

      // Get command settings
      const commandSettings = await this.configManager.getCommandSettings();

      const actions: CodeAction[] = [];
      const range = params.range;

      // If there is a selection range
      if (
        range.start.line !== range.end.line ||
        range.start.character !== range.end.character
      ) {
        const selectedText = document.getText(range);

        // "Generate continuation" action
        actions.push({
          title: 'Generate continuation',
          kind: 'source.fixAll',
          command: {
            command: 'blogLsp.completeSelection',
            title: 'Generate continuation',
            arguments: [params.textDocument.uri, range, selectedText],
          },
        });
      } else {
        // Cursor position only
        const position = range.start;
        const line = document.getText({
          start: { line: position.line, character: 0 },
          end: { line: position.line, character: Number.MAX_SAFE_INTEGER },
        });

        // Paragraph completion action (only if line is not empty and enabled in settings)
        if (
          line.trim().length > 0 &&
          commandSettings.enableParagraphCompletion
        ) {
          actions.push({
            title: 'Complete paragraph',
            kind: 'source.fixAll',
            command: {
              command: 'blogLsp.completeParagraph',
              title: 'Complete paragraph',
              arguments: [params.textDocument.uri, position],
            },
          });
        }

        // Insert heading suggestion (only if current line starts with # or is empty, and enabled in settings)
        if (
          (line.trim().startsWith('#') || line.trim().length === 0) &&
          commandSettings.enableHeadingGeneration
        ) {
          actions.push({
            title: 'Insert heading suggestion',
            kind: 'source.fixAll',
            command: {
              command: 'blogLsp.insertHeading',
              title: 'Insert heading suggestion',
              arguments: [params.textDocument.uri, position],
            },
          });
        }
      }

      return actions;
    } catch (error) {
      this.connection.console.error(`Error generating code actions: ${error}`);
      return [];
    }
  }
}
