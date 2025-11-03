import { Connection, DocumentSymbolParams } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { extractHeadings } from '@blogLsp/shared';

/**
 * Document Symbol Handler
 * Returns heading hierarchy
 */
export class DocumentSymbolHandler {
  constructor(
    private connection: Connection,
    private documents: TextDocuments<TextDocument>
  ) {}

  /**
   * Return document symbols (heading hierarchy)
   */
  async handleDocumentSymbol(params: DocumentSymbolParams) {
    try {
      const document = this.documents.get(params.textDocument.uri);
      if (!document) {
        this.connection.console.warn(
          `Document not found: ${params.textDocument.uri}`
        );
        return [];
      }

      const text = document.getText();
      const symbols = extractHeadings(text);

      this.connection.console.log(`Extracted ${symbols.length} heading symbols`);

      return symbols;
    } catch (error) {
      this.connection.console.error(
        `Error extracting document symbols: ${error}`
      );
      return [];
    }
  }
}
