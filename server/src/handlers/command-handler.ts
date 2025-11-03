import {
  Connection,
  ExecuteCommandParams,
  Range as LspRange,
} from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { ConfigurationManager } from '../config/manager';
import { ensureConfiguration } from '../utils/error-handler';
import { CommandService } from '../services/command-service';

/**
 * Command Handler
 * Separates each command processing as methods
 */
export class CommandHandler {
  private commandService: CommandService;

  constructor(
    private connection: Connection,
    private documents: TextDocuments<TextDocument>,
    private configManager: ConfigurationManager
  ) {
    this.commandService = new CommandService(connection, documents);
  }

  /**
   * Command execution handler
   */
  async handleExecuteCommand(params: ExecuteCommandParams) {
    try {
      const config = this.configManager.getCurrentConfig();
      const provider = this.configManager.getLlmProvider();
      const configCheck = await ensureConfiguration(
        this.connection,
        config,
        provider,
        () => this.configManager.updateConfiguration()
      );

      if (!configCheck) {
        return;
      }

      const command = params.command;
      const args = params.arguments || [];

      // Get command settings and completion settings
      const commandSettings = await this.configManager.getCommandSettings();
      const completionSettings = await this.configManager.getCompletionSettings();

      if (command === 'blogLsp.completeSelection') {
        // Generate continuation of selected range
        const uri = args[0] as string;
        const range = args[1] as LspRange;
        const selectedText = args[2] as string;

        await this.commandService.completeSelection(
          uri,
          range,
          selectedText,
          configCheck.config,
          configCheck.provider,
          completionSettings
        );
      } else if (command === 'blogLsp.completeParagraph') {
        if (!commandSettings.enableParagraphCompletion) {
          this.connection.window.showWarningMessage(
            'Paragraph completion is disabled in settings'
          );
          return;
        }
        // Complete paragraph
        const uri = args[0] as string;
        const position = args[1] as { line: number; character: number };

        await this.commandService.completeParagraph(
          uri,
          position,
          configCheck.config,
          configCheck.provider,
          completionSettings
        );
      } else if (command === 'blogLsp.insertHeading') {
        if (!commandSettings.enableHeadingGeneration) {
          this.connection.window.showWarningMessage(
            'Heading generation is disabled in settings'
          );
          return;
        }
        // Insert heading suggestion
        const uri = args[0] as string;
        const position = args[1] as { line: number; character: number };

        await this.commandService.insertHeading(
          uri,
          position,
          configCheck.config,
          configCheck.provider,
          completionSettings
        );
      }
    } catch (error) {
      this.connection.console.error(`Error executing command: ${error}`);
      this.connection.window.showErrorMessage(`Error executing command: ${error}`);
    }
  }
}
