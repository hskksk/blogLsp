import { describe, it } from 'mocha';
import * as assert from 'assert';
import { extractMarkdownContext, extractTextByScope } from './extractor';
import type { ExtractionOptions } from './types';

describe('extractor.ts', () => {
  describe('extractMarkdownContext', () => {
    it('should extract context from simple markdown', () => {
      const text = `# Title

This is a paragraph.
Another line.

## Section

More content.`;

      const options: ExtractionOptions = {
        scope: 'paragraph',
        position: { line: 2, character: 10 },
      };

      const context = extractMarkdownContext(text, options);

      assert.ok(context.currentParagraph);
      assert.ok(context.currentParagraph.includes('This is a paragraph'));
      assert.equal(context.nearestHeading?.text, 'Title');
      assert.equal(context.nearestHeading?.level, 1);
      assert.equal(context.metadata.lineCount, 8);
    });

    it('should handle empty document', () => {
      const text = '';
      const options: ExtractionOptions = {
        scope: 'paragraph',
        position: { line: 0, character: 0 },
      };

      const context = extractMarkdownContext(text, options);

      // Empty document may have empty paragraph or empty string
      assert.ok(typeof context.currentParagraph === 'string');
      assert.equal(context.metadata.lineCount, 0);
      assert.equal(context.metadata.hasFrontMatter, false);
    });

    it('should extract front matter', () => {
      const text = `---
title: Test
author: John
---

# Title

Content here.`;

      const options: ExtractionOptions = {
        scope: 'paragraph',
        position: { line: 6, character: 0 },
      };

      const context = extractMarkdownContext(text, options);

      assert.equal(context.metadata.hasFrontMatter, true);
      assert.ok(context.metadata.frontMatter);
      assert.equal((context.metadata.frontMatter as any).title, 'Test');
      assert.equal((context.metadata.frontMatter as any).author, 'John');
    });

    it('should extract heading hierarchy', () => {
      const text = `# Level 1

Content.

## Level 2

More content.

### Level 3

Even more.`;

      const options: ExtractionOptions = {
        scope: 'paragraph',
        position: { line: 12, character: 0 },
      };

      const context = extractMarkdownContext(text, options);

      assert.ok(context.headingHierarchy);
      assert.ok(context.headingHierarchy.length > 0);
      
      // Check hierarchy order
      const levels = context.headingHierarchy.map(h => h.level);
      assert.ok(levels.includes(1));
      assert.ok(levels.includes(2));
      assert.ok(levels.includes(3));
    });

    it('should extract previous and next paragraphs', () => {
      const text = `First paragraph.

Second paragraph.

Third paragraph.`;

      const options: ExtractionOptions = {
        scope: 'paragraph',
        position: { line: 3, character: 0 },
      };

      const context = extractMarkdownContext(text, options);

      assert.ok(context.previousParagraph);
      assert.ok(context.previousParagraph!.includes('First paragraph'));
      assert.ok(context.nextParagraph);
      assert.ok(context.nextParagraph!.includes('Third paragraph'));
    });
  });

  describe('extractTextByScope', () => {
    it('should extract selection scope', () => {
      const text = `Line 1
Line 2
Line 3
Line 4`;

      const options: ExtractionOptions = {
        scope: 'selection',
        position: { line: 1, character: 0 },
        selection: {
          startLine: 1,
          startCharacter: 2,
          endLine: 2,
          endCharacter: 4,
        },
      };

      const result = extractTextByScope(text, options);

      // Selection from character 2 of line 1 to character 4 of line 2
      assert.ok(result.text.includes('ne 2'));
      assert.equal(result.range.startLine, 1);
      assert.equal(result.range.startCharacter, 2);
      assert.equal(result.range.endLine, 2);
      assert.equal(result.range.endCharacter, 4);
    });

    it('should extract paragraph scope', () => {
      const text = `First paragraph with
multiple lines.

Second paragraph.

Third paragraph.`;

      const options: ExtractionOptions = {
        scope: 'paragraph',
        position: { line: 1, character: 10 },
      };

      const result = extractTextByScope(text, options);

      assert.ok(result.text);
      assert.ok(result.text.includes('First paragraph'));
      assert.equal(result.range.startLine, 0);
      // Paragraph can span multiple lines
      assert.ok(result.range.endLine >= result.range.startLine);
    });

    it('should extract document scope', () => {
      const text = `Line 1
Line 2
Line 3`;

      const options: ExtractionOptions = {
        scope: 'document',
        position: { line: 1, character: 0 },
      };

      const result = extractTextByScope(text, options);

      assert.equal(result.text, text);
      assert.equal(result.range.startLine, 0);
      assert.equal(result.range.startCharacter, 0);
      assert.equal(result.range.endLine, 2);
    });

    it('should throw error for selection scope without selection', () => {
      const text = 'Some text';
      const options: ExtractionOptions = {
        scope: 'selection',
        position: { line: 0, character: 0 },
      };

      assert.throws(() => {
        extractTextByScope(text, options);
      }, /Selection scope requires selection range/);
    });

    it('should throw error for unknown scope', () => {
      const text = 'Some text';
      const options = {
        scope: 'unknown' as any,
        position: { line: 0, character: 0 },
      };

      assert.throws(() => {
        extractTextByScope(text, options);
      }, /Unknown scope/);
    });
  });
});
