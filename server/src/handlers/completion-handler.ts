import { Connection, CompletionParams } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { extractContextLines } from '@blogLsp/shared';
import type { ConfigurationManager } from '../config/manager';
import { ensureConfiguration } from '../utils/error-handler';
import { CompletionService } from '../services/completion-service';

/**
 * ???????
 * ????????????????
 */
export class CompletionHandler {
  private completionService: CompletionService;

  constructor(
    private connection: Connection,
    private documents: TextDocuments<TextDocument>,
    private configManager: ConfigurationManager
  ) {
    this.completionService = new CompletionService(connection);
  }

  /**
   * ?????
   */
  async handleCompletion(params: CompletionParams) {
    try {
      // ???????????
      const config = this.configManager.getCurrentConfig();
      const provider = this.configManager.getLlmProvider();
      const configCheck = await ensureConfiguration(
        this.connection,
        config,
        provider,
        () => this.configManager.updateConfiguration()
      );

      if (!configCheck) {
        return [];
      }

      // ?????????
      const document = this.documents.get(params.textDocument.uri);
      if (!document) {
        this.connection.console.warn(
          `Document not found: ${params.textDocument.uri}`
        );
        return [];
      }

      const text = document.getText();
      const position = params.position;

      // ??????????
      const context = extractContextLines(text, position, 5, 5);

      if (!context.currentLine) {
        return [];
      }

      // ???????
      const completionSettings = await this.configManager.getCompletionSettings();

      // ????????????????
      const triggerCharacter = params.context?.triggerCharacter;
      const triggerKind = params.context?.triggerKind;

      // ?????????#???????????????#??????????
      // ??????????????????????????????
      const isHeadingCompletion =
        completionSettings.triggerOnHeading &&
        (triggerCharacter === '#' ||
          (triggerKind === 1 && context.currentText.trim().startsWith('#')));

      let completionItems;

      if (isHeadingCompletion) {
        completionItems = await this.completionService.generateHeadingCompletion(
          context,
          position,
          configCheck.config,
          configCheck.provider,
          completionSettings
        );
      } else {
        completionItems = await this.completionService.generateTextCompletion(
          context,
          position,
          configCheck.config,
          configCheck.provider,
          completionSettings
        );
      }

      return completionItems;
    } catch (error) {
      this.connection.console.error(`Error generating completions: ${error}`);
      return [];
    }
  }
}
