import { describe, it } from 'mocha';
import * as assert from 'assert';
import {
  buildCompletionItems,
  buildHeadingCompletionItems,
} from './completion-item-builder';
import type { Position } from 'vscode-languageserver/node';
import { CompletionItemKind, InsertTextFormat } from 'vscode-languageserver/node';



describe('completion-item-builder.ts', () => {
  describe('buildCompletionItems', () => {
    it('should build completion items from text completions', () => {
      const completions = ['suggestion 1', 'suggestion 2'];
      const position: Position = { line: 0, character: 5 };
      const currentText = 'Hello';

      const result = buildCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 2);
      assert.equal(result[0].label, 'suggestion 1');
      assert.equal(result[1].label, 'suggestion 2');
      assert.equal(result[0].kind, CompletionItemKind.Text);
      assert.equal(result[0].insertTextFormat, InsertTextFormat.PlainText);
      assert.ok(result[0].textEdit);
      const textEdit = result[0].textEdit! as any;
      if ('range' in textEdit) {
        assert.equal(textEdit.range.start.line, 0);
        assert.equal(textEdit.range.start.character, 5);
      }
    });

    it('should remove currentText prefix from completions', () => {
      const completions = ['Hello world', 'Hello there'];
      const position: Position = { line: 0, character: 5 };
      const currentText = 'Hello';

      const result = buildCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 2);
      assert.equal(result[0].textEdit!.newText, ' world');
      assert.equal(result[1].textEdit!.newText, ' there');
    });

    it('should filter out empty completions', () => {
      const completions = ['valid', '', '   ', 'also valid'];
      const position: Position = { line: 0, character: 0 };
      const currentText = '';

      const result = buildCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 2);
      assert.equal(result[0].textEdit!.newText, 'valid');
      assert.equal(result[1].textEdit!.newText, 'also valid');
    });

    it('should filter out completions that only contain currentText', () => {
      const completions = ['Hello', 'Hello world', 'Hello there'];
      const position: Position = { line: 0, character: 5 };
      const currentText = 'Hello';

      const result = buildCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 2);
      assert.equal(result[0].textEdit!.newText, ' world');
      assert.equal(result[1].textEdit!.newText, ' there');
    });

    it('should use custom kind and sortPrefix', () => {
      const completions = ['item 1', 'item 2'];
      const position: Position = { line: 0, character: 0 };
      const currentText = '';

      const result = buildCompletionItems({
        completions,
        position,
        currentText,
        kind: CompletionItemKind.Snippet,
        sortPrefix: '999',
      });

      assert.equal(result.length, 2);
      assert.equal(result[0].kind, CompletionItemKind.Snippet);
      assert.equal(result[0].sortText, '9990');
      assert.equal(result[1].sortText, '9991');
    });

    it('should truncate long labels', () => {
      const longText = 'a'.repeat(100);
      const completions = [longText];
      const position: Position = { line: 0, character: 0 };
      const currentText = '';

      const result = buildCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.ok(result[0].label.length <= 53); // 50 chars + '...'
      assert.ok(result[0].label.endsWith('...'));
    });

    it('should create detail with truncated text', () => {
      const longText = 'a'.repeat(150);
      const completions = [longText];
      const position: Position = { line: 0, character: 0 };
      const currentText = '';

      const result = buildCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.ok(result[0].detail);
      assert.ok(result[0].detail!.includes('LLM Suggestion 1:'));
      assert.ok(result[0].detail!.length < longText.length);
    });
  });

  describe('buildHeadingCompletionItems', () => {
    it('should build heading completion items', () => {
      const completions = ['My Heading', 'Another Heading'];
      const position: Position = { line: 0, character: 2 };
      const currentText = '# ';

      const result = buildHeadingCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 2);
      assert.equal(result[0].label, '# My Heading');
      assert.equal(result[1].label, '# Another Heading');
      assert.equal(result[0].kind, CompletionItemKind.Class);
      assert.ok(result[0].textEdit);
      assert.equal(result[0].textEdit!.range.start.character, 0);
    });

    it('should preserve heading level prefix', () => {
      const completions = ['Title'];
      const position: Position = { line: 0, character: 3 };
      const currentText = '## ';

      const result = buildHeadingCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 1);
      assert.equal(result[0].label, '## Title');
      assert.equal(result[0].textEdit!.newText, '## Title');
    });

    it('should handle heading with existing text', () => {
      const completions = ['Complete Title'];
      const position: Position = { line: 0, character: 7 };
      const currentText = '# Part';

      const result = buildHeadingCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 1);
      assert.equal(result[0].textEdit!.newText, '# Complete Title');
    });

    it('should filter out empty completions', () => {
      const completions = ['Valid', '', '   ', 'Also Valid'];
      const position: Position = { line: 0, character: 2 };
      const currentText = '# ';

      const result = buildHeadingCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 2);
      assert.equal(result[0].textEdit!.newText, '# Valid');
      assert.equal(result[1].textEdit!.newText, '# Also Valid');
    });

    it('should remove duplicate text from completion', () => {
      const completions = ['My Complete Title'];
      const position: Position = { line: 0, character: 9 };
      const currentText = '# My ';

      const result = buildHeadingCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 1);
      assert.equal(result[0].textEdit!.newText, '# Complete Title');
    });

    it('should use correct sort prefix for headings', () => {
      const completions = ['Heading 1', 'Heading 2'];
      const position: Position = { line: 0, character: 2 };
      const currentText = '# ';

      const result = buildHeadingCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 2);
      assert.equal(result[0].sortText, '1000');
      assert.equal(result[1].sortText, '1001');
    });

    it('should replace entire line up to cursor', () => {
      const completions = ['New Heading'];
      const position: Position = { line: 0, character: 5 };
      const currentText = '# Old';

      const result = buildHeadingCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 1);
      const textEdit = result[0].textEdit! as any;
      if ('range' in textEdit) {
        assert.equal(textEdit.range.start.character, 0);
        assert.equal(textEdit.range.end.line, 0);
        assert.equal(textEdit.range.end.character, 5);
      }
      assert.equal(textEdit.newText, '# New Heading');
    });

    it('should handle complex heading levels', () => {
      const completions = ['Deep Section'];
      const position: Position = { line: 0, character: 4 };
      const currentText = '### ';

      const result = buildHeadingCompletionItems({
        completions,
        position,
        currentText,
      });

      assert.equal(result.length, 1);
      assert.equal(result[0].label, '### Deep Section');
      assert.equal(result[0].textEdit!.newText, '### Deep Section');
    });
  });
});
