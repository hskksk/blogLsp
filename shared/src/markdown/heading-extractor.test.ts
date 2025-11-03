import { describe, it } from 'mocha';
import * as assert from 'assert';
import {
  findNearestHeadingBefore,
  isHeadingAtPosition,
  findNextHeading,
  extractHeadings,
} from './heading-extractor';
import type { Position } from 'vscode-languageserver/node';
import { SymbolKind } from 'vscode-languageserver/node';



describe('heading-extractor.ts', () => {
  describe('findNearestHeadingBefore', () => {
    it('should find the nearest heading before cursor', () => {
      const text = `# Title

Content here.

## Section

More content.

### Subsection`;

      const position: Position = { line: 7, character: 0 };

      const result = findNearestHeadingBefore(text, position);

      assert.ok(result);
      assert.equal(result?.text, 'Section');
      assert.equal(result?.level, 2);
      assert.equal(result?.line, 4);
    });

    it('should return null if no heading exists before cursor', () => {
      const text = `No heading here.
Just content.`;

      const position: Position = { line: 1, character: 0 };

      const result = findNearestHeadingBefore(text, position);

      assert.equal(result, null);
    });

    it('should find heading at line 0', () => {
      const text = `# First Heading
Content`;

      const position: Position = { line: 1, character: 0 };

      const result = findNearestHeadingBefore(text, position);

      assert.ok(result);
      assert.equal(result?.text, 'First Heading');
      assert.equal(result?.line, 0);
    });

    it('should handle multiple headings and find the nearest', () => {
      const text = `# Level 1
Content
## Level 2
More content
### Level 3
Even more`;

      const position: Position = { line: 5, character: 0 };

      const result = findNearestHeadingBefore(text, position);

      assert.ok(result);
      assert.equal(result?.text, 'Level 3');
      assert.equal(result?.level, 3);
    });
  });

  describe('isHeadingAtPosition', () => {
    it('should return heading info if cursor is on heading line', () => {
      const text = `# Title
Content`;

      const position: Position = { line: 0, character: 0 };

      const result = isHeadingAtPosition(text, position);

      assert.ok(result);
      assert.equal(result?.text, 'Title');
      assert.equal(result?.level, 1);
      assert.equal(result?.line, 0);
    });

    it('should return null if cursor is not on heading', () => {
      const text = `# Title
Content`;

      const position: Position = { line: 1, character: 0 };

      const result = isHeadingAtPosition(text, position);

      assert.equal(result, null);
    });

    it('should handle heading with spaces', () => {
      const text = `   ##  Section with spaces  `;

      const position: Position = { line: 0, character: 5 };

      const result = isHeadingAtPosition(text, position);

      assert.ok(result);
      assert.equal(result?.text, 'Section with spaces');
      assert.equal(result?.level, 2);
    });
  });

  describe('findNextHeading', () => {
    it('should find the next heading after specified line', () => {
      const text = `# First
Content
## Second
More content`;

      const result = findNextHeading(text, 1);

      assert.ok(result);
      assert.equal(result?.text, 'Second');
      assert.equal(result?.level, 2);
      assert.equal(result?.line, 2);
    });

    it('should return null if no heading exists after line', () => {
      const text = `# Title
Content`;

      const result = findNextHeading(text, 1);

      assert.equal(result, null);
    });

    it('should not include the heading at the specified line', () => {
      const text = `# First
## Second
### Third`;

      const result = findNextHeading(text, 0);

      assert.ok(result);
      assert.equal(result?.text, 'Second');
      assert.equal(result?.line, 1);
    });
  });

  describe('extractHeadings', () => {
    it('should extract headings as DocumentSymbol array', () => {
      const text = `# Level 1
Content
## Level 2
### Level 3`;

      const result = extractHeadings(text);

      assert.equal(result.length, 1); // Root level has one symbol
      assert.equal(result[0].name, 'Level 1');
      assert.equal(result[0].kind, SymbolKind.Class);
      assert.ok(result[0].children);
      assert.equal(result[0].children!.length, 1);
      assert.equal(result[0].children![0].name, 'Level 2');
      assert.equal(result[0].children![0].children!.length, 1);
      assert.equal(result[0].children![0].children![0].name, 'Level 3');
    });

    it('should handle flat heading structure', () => {
      const text = `# Heading 1
# Heading 2
# Heading 3`;

      const result = extractHeadings(text);

      assert.equal(result.length, 3);
      assert.equal(result[0].name, 'Heading 1');
      assert.equal(result[1].name, 'Heading 2');
      assert.equal(result[2].name, 'Heading 3');
    });

    it('should handle empty document', () => {
      const text = '';

      const result = extractHeadings(text);

      assert.equal(result.length, 0);
    });

    it('should handle document without headings', () => {
      const text = `Just some content.
No headings here.`;

      const result = extractHeadings(text);

      assert.equal(result.length, 0);
    });

    it('should extract correct ranges for headings', () => {
      const text = `# Title`;

      const result = extractHeadings(text);

      assert.equal(result.length, 1);
      assert.equal(result[0].range.start.line, 0);
      assert.equal(result[0].range.start.character, 0);
      assert.equal(result[0].range.end.line, 0);
      assert.ok(result[0].range.end.character >= 7); // At least the length of "# Title"
    });

    it('should handle nested heading hierarchy correctly', () => {
      const text = `# H1
## H2-1
### H3-1
## H2-2
### H3-2`;

      const result = extractHeadings(text);

      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'H1');
      assert.equal(result[0].children!.length, 2);
      assert.equal(result[0].children![0].name, 'H2-1');
      assert.equal(result[0].children![0].children!.length, 1);
      assert.equal(result[0].children![0].children![0].name, 'H3-1');
      assert.equal(result[0].children![1].name, 'H2-2');
      assert.equal(result[0].children![1].children!.length, 1);
      assert.equal(result[0].children![1].children![0].name, 'H3-2');
    });
  });
});
