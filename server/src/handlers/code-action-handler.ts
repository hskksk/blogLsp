import { Connection, CodeActionParams, CodeAction } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { ConfigurationManager } from '../config/manager';

/**
 * ?????????????
 * ??????????????
 */
export class CodeActionHandler {
  constructor(
    private connection: Connection,
    private documents: TextDocuments<TextDocument>,
    private configManager: ConfigurationManager
  ) {}

  /**
   * ?????????????
   */
  async handleCodeAction(params: CodeActionParams): Promise<CodeAction[]> {
    try {
      const document = this.documents.get(params.textDocument.uri);
      if (!document) {
        return [];
      }

      // ?????????
      const commandSettings = await this.configManager.getCommandSettings();

      const actions: CodeAction[] = [];
      const range = params.range;

      // ?????????
      if (
        range.start.line !== range.end.line ||
        range.start.character !== range.end.character
      ) {
        const selectedText = document.getText(range);

        // ????????????
        actions.push({
          title: '?????',
          kind: 'source.fixAll',
          command: {
            command: 'blogLsp.completeSelection',
            title: '?????',
            arguments: [params.textDocument.uri, range, selectedText],
          },
        });
      } else {
        // ???????????
        const position = range.start;
        const line = document.getText({
          start: { line: position.line, character: 0 },
          end: { line: position.line, character: Number.MAX_SAFE_INTEGER },
        });

        // ??????????????????????????????????
        if (
          line.trim().length > 0 &&
          commandSettings.enableParagraphCompletion
        ) {
          actions.push({
            title: '?????',
            kind: 'source.fixAll',
            command: {
              command: 'blogLsp.completeParagraph',
              title: '?????',
              arguments: [params.textDocument.uri, position],
            },
          });
        }

        // ?????????????#??????????????????????????????
        if (
          (line.trim().startsWith('#') || line.trim().length === 0) &&
          commandSettings.enableHeadingGeneration
        ) {
          actions.push({
            title: '????????',
            kind: 'source.fixAll',
            command: {
              command: 'blogLsp.insertHeading',
              title: '????????',
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
