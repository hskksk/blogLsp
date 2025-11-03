import { Connection, HoverParams, Hover, MarkupKind } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  isHeadingAtPosition,
  findNextHeading,
  findNearestHeadingBefore,
} from '@blogLsp/shared';

/**
 * Hover Handler
 * Returns hover information
 */
export class HoverHandler {
  constructor(
    private connection: Connection,
    private documents: TextDocuments<TextDocument>
  ) {}

  /**
   * Return hover information
   */
  async handleHover(params: HoverParams): Promise<Hover | null> {
    try {
      const document = this.documents.get(params.textDocument.uri);
      if (!document) {
        this.connection.console.warn(
          `Document not found: ${params.textDocument.uri}`
        );
        return null;
      }

      const text = document.getText();
      const position = params.position;

      // Check if the line at cursor position is a heading
      const currentHeading = isHeadingAtPosition(text, position);

      if (currentHeading) {
        // When hovering over a heading: also show next heading information
        {
          const nextHeading = findNextHeading(text, currentHeading.line);

          const parts: string[] = [];
          parts.push(`**Heading Level ${currentHeading.level}**`);
          parts.push('');
          parts.push(currentHeading.text);

          if (nextHeading) {
            parts.push('');
            parts.push('---');
            parts.push('');
            parts.push('**Next Heading**:');
            parts.push(`Level ${nextHeading.level}: ${nextHeading.text}`);
          } else {
            parts.push('');
            parts.push('_(No next heading after this heading)_');
          }

          return {
            contents: {
              kind: MarkupKind.Markdown,
              value: parts.join('\n'),
            },
          };
        }
      } else {
        // When hovering over regular text: show current section information
        const nearestHeading = findNearestHeadingBefore(text, position);

        if (nearestHeading) {
          const parts: string[] = [];
          parts.push('**Current Section**');
          parts.push('');
          parts.push(`Level ${nearestHeading.level}: ${nearestHeading.text}`);

          // Also show next heading
          const nextHeading = findNextHeading(text, nearestHeading.line);
          if (nextHeading) {
            parts.push('');
            parts.push('---');
            parts.push('');
            parts.push('**Next Section**:');
            parts.push(`Level ${nextHeading.level}: ${nextHeading.text}`);
          }

          return {
            contents: {
              kind: MarkupKind.Markdown,
              value: parts.join('\n'),
            },
          };
        }
      }

      // Return null if no heading found (don't show hover information)
      return null;
    } catch (error) {
      this.connection.console.error(
        `Error generating hover information: ${error}`
      );
      return null;
    }
  }
}
