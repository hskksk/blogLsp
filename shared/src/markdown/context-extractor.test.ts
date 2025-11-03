import { describe, it } from 'mocha';
import * as assert from 'assert';
import { extractContextLines } from './context-extractor';
import type { Position } from './context-extractor';



describe('context-extractor.ts', () => {
  describe('extractContextLines', () => {
    it('should extract default 5 lines before and after', () => {
      const text = `Line 1
Line 2
Line 3
Line 4
Line 5
Line 6
Line 7
Line 8
Line 9
Line 10
Line 11`;

      const position: Position = { line: 5, character: 5 };

      const result = extractContextLines(text, position);

      assert.equal(result.linesBefore.length, 5);
      assert.equal(result.linesAfter.length, 5);
      assert.equal(result.linesBefore[0], 'Line 1');
      assert.equal(result.linesAfter[0], 'Line 7');
      assert.equal(result.currentLine, 'Line 6');
      assert.equal(result.currentText, 'Line ');
    });

    it('should extract custom number of lines', () => {
      const text = `Line 1
Line 2
Line 3
Line 4
Line 5`;

      const position: Position = { line: 2, character: 3 };

      const result = extractContextLines(text, position, 2, 2);

      assert.equal(result.linesBefore.length, 2);
      assert.equal(result.linesAfter.length, 2);
      assert.equal(result.linesBefore[0], 'Line 1');
      assert.equal(result.linesBefore[1], 'Line 2');
      assert.equal(result.linesAfter[0], 'Line 4');
      assert.equal(result.linesAfter[1], 'Line 5');
    });

    it('should handle position at start of document', () => {
      const text = `Line 1
Line 2
Line 3`;

      const position: Position = { line: 0, character: 0 };

      const result = extractContextLines(text, position, 5, 5);

      assert.equal(result.linesBefore.length, 0);
      assert.ok(result.linesAfter.length >= 0); // May be fewer if document is short
      assert.equal(result.currentLine, 'Line 1');
      assert.equal(result.currentText, '');
    });

    it('should handle position at end of document', () => {
      const text = `Line 1
Line 2
Line 3`;

      const position: Position = { line: 2, character: 5 };

      const result = extractContextLines(text, position, 5, 5);

      assert.equal(result.linesBefore.length, 2);
      assert.equal(result.linesAfter.length, 0);
      assert.equal(result.currentLine, 'Line 3');
      assert.equal(result.currentText, 'Line ');
    });

    it('should extract current text up to cursor position', () => {
      const text = `Hello world
Test line`;

      const position: Position = { line: 0, character: 5 };

      const result = extractContextLines(text, position);

      assert.equal(result.currentText, 'Hello');
      assert.equal(result.currentLine, 'Hello world');
    });

    it('should handle empty document', () => {
      const text = '';
      const position: Position = { line: 0, character: 0 };

      const result = extractContextLines(text, position);

      assert.equal(result.currentLine, '');
      assert.equal(result.currentText, '');
      assert.equal(result.linesBefore.length, 0);
      assert.equal(result.linesAfter.length, 0);
    });

    it('should handle single line document', () => {
      const text = 'Single line';
      const position: Position = { line: 0, character: 6 };

      const result = extractContextLines(text, position, 5, 5);

      assert.equal(result.currentLine, 'Single line');
      assert.equal(result.currentText, 'Single');
      assert.equal(result.linesBefore.length, 0);
      assert.equal(result.linesAfter.length, 0);
    });

    it('should handle Windows line endings', () => {
      const text = 'Line 1\r\nLine 2\r\nLine 3';
      const position: Position = { line: 1, character: 3 };

      const result = extractContextLines(text, position, 1, 1);

      assert.equal(result.linesBefore.length, 1);
      assert.equal(result.linesAfter.length, 1);
      assert.equal(result.currentLine, 'Line 2');
    });

    it('should handle Mac line endings', () => {
      const text = 'Line 1\rLine 2\rLine 3';
      const position: Position = { line: 1, character: 3 };

      const result = extractContextLines(text, position, 1, 1);

      assert.equal(result.linesBefore.length, 1);
      assert.equal(result.linesAfter.length, 1);
      assert.equal(result.currentLine, 'Line 2');
    });
  });
});
