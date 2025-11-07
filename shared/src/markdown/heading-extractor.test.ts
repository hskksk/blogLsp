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




describe('heading-extractor:isHeadingAtPosition', () => {
  it('returns null when the line is not a heading', () => {
    const md = [
      '# Title',
      '',
      'Some paragraph',
    ].join('\n');

    const info = isHeadingAtPosition(md, { line: 2, character: 0 });
    assert.strictEqual(info, null);
  });

  it('detects ATX heading and returns level/text/line', () => {
    const md = [
      '# Title',
      '## Section',
      '### Subsection',
    ].join('\n');

    const h1 = isHeadingAtPosition(md, { line: 0, character: 0 });
    assert.ok(h1);
    assert.strictEqual(h1!.level, 1);
    assert.strictEqual(h1!.text, 'Title');
    assert.strictEqual(h1!.line, 0);

    const h2 = isHeadingAtPosition(md, { line: 1, character: 3 });
    assert.ok(h2);
    assert.strictEqual(h2!.level, 2);
    assert.strictEqual(h2!.text, 'Section');
    assert.strictEqual(h2!.line, 1);

    const h3 = isHeadingAtPosition(md, { line: 2, character: 10 });
    assert.ok(h3);
    assert.strictEqual(h3!.level, 3);
    assert.strictEqual(h3!.text, 'Subsection');
    assert.strictEqual(h3!.line, 2);
  });
});

describe('heading-extractor:findNearestHeadingBefore', () => {
  it('returns null when there is no previous heading', () => {
    const md = [
      'No headings here',
      'Still no headings',
    ].join('\n');

    const nearest = findNearestHeadingBefore(md, { line: 1, character: 0 });
    assert.strictEqual(nearest, null);
  });

  it('returns the nearest heading above the current line (exclude current line)', () => {
    const md = [
      '# Title',
      '',
      'Paragraph',
      '## Section',
      'Text',
      '### Subsection',
      'More text',
    ].join('\n');

    // On a non-heading line below "Section" => nearest is Section
    const pAfterSection = findNearestHeadingBefore(md, { line: 4, character: 0 });
    assert.ok(pAfterSection);
    assert.strictEqual(pAfterSection!.level, 2);
    assert.strictEqual(pAfterSection!.text, 'Section');
    assert.strictEqual(pAfterSection!.line, 3);

    // On the heading line itself => isHeadingAtPosition detects it,
    // but nearest-before should return the previous heading (Section)
    const onSubsectionHeading = isHeadingAtPosition(md, { line: 5, character: 0 });
    assert.ok(onSubsectionHeading);
    assert.strictEqual(onSubsectionHeading!.level, 3);
    assert.strictEqual(onSubsectionHeading!.text, 'Subsection');
    assert.strictEqual(onSubsectionHeading!.line, 5);

    const nearestBeforeOnHeadingLine = findNearestHeadingBefore(md, { line: 5, character: 0 });
    assert.ok(nearestBeforeOnHeadingLine);
    assert.strictEqual(nearestBeforeOnHeadingLine!.level, 2);
    assert.strictEqual(nearestBeforeOnHeadingLine!.text, 'Section');
    assert.strictEqual(nearestBeforeOnHeadingLine!.line, 3);

    // Above all headings => if cursor is at the first heading line, nearest-before is null
    const aboveAll = findNearestHeadingBefore(md, { line: 0, character: 0 });
    assert.strictEqual(aboveAll, null);
  });
});

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
