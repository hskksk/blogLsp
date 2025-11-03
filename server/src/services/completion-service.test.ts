import { describe, it, beforeEach, afterEach } from 'mocha';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { Connection } from 'vscode-languageserver/node';
import { CompletionService } from './completion-service';
import type { BlogLspConfig, LlmProvider } from '@blogLsp/shared';
import type { CompletionSettings } from '../config/types';
import type { Position } from '@blogLsp/shared';



describe('completion-service.ts', () => {
  let mockConnection: sinon.SinonStubbedInstance<Connection>;
  let completionService: CompletionService;
  let mockProvider: sinon.SinonStubbedInstance<LlmProvider>;

  beforeEach(() => {
    // Connection?????????????????????
    mockConnection = {
      console: {} as any,
    } as any;
    completionService = new CompletionService(mockConnection as any);

    mockProvider = {
      name: 'Test Provider',
      supportsStreaming: false,
      generateCompletions: sinon.stub(),
    } as any;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('CompletionService', () => {
    const mockConfig: BlogLspConfig = {
      provider: 'openai',
      model: 'gpt-4',
      numSuggestions: 1,
      style: 'tech-blog',
      language: 'ja',
      privacy: { scope: 'paragraph' },
      enableStreaming: false,
      timeoutMs: 5000,
    };

    const mockCompletionSettings: CompletionSettings = {
      triggerOnHeading: true,
      maxHeadingSuggestions: 3,
      maxTextSuggestions: 1,
    };

    const mockPosition: Position = { line: 1, character: 5 };

    describe('generateHeadingCompletion', () => {
      it('should generate heading completion items', async () => {
        const mockHeadings = ['Heading 1', 'Heading 2', 'Heading 3'];
        mockProvider.generateCompletions!.resolves(mockHeadings);

        const context = {
          currentText: '# ',
          linesBefore: ['Line before'],
          currentLine: '# ',
          linesAfter: ['Line after'],
        };

        const result = await completionService.generateHeadingCompletion(
          context,
          mockPosition,
          mockConfig,
          mockProvider as any,
          mockCompletionSettings
        );

        assert.equal(result.length, 3);
        assert.ok(result[0].label);
        assert.ok(mockProvider.generateCompletions!.calledOnce);

        const callArgs = mockProvider.generateCompletions!.firstCall.args[0];
        assert.ok(callArgs.prompt);
        assert.equal(callArgs.numSuggestions, mockCompletionSettings.maxHeadingSuggestions);
      });

      it('should handle empty heading suggestions', async () => {
        mockProvider.generateCompletions!.resolves([]);

        const context = {
          currentText: '# ',
          linesBefore: [],
          currentLine: '# ',
          linesAfter: [],
        };

        const result = await completionService.generateHeadingCompletion(
          context,
          mockPosition,
          mockConfig,
          mockProvider as any,
          mockCompletionSettings
        );

        assert.equal(result.length, 0);
      });

      it('should pass correct parameters to provider', async () => {
        mockProvider.generateCompletions!.resolves(['Test Heading']);

        const context = {
          currentText: '## ',
          linesBefore: ['Previous context'],
          currentLine: '## ',
          linesAfter: ['Next context'],
        };

        await completionService.generateHeadingCompletion(
          context,
          mockPosition,
          mockConfig,
          mockProvider as any,
          mockCompletionSettings
        );

        const callArgs = mockProvider.generateCompletions!.firstCall.args[0];
        assert.equal(callArgs.language, mockConfig.language);
        assert.equal(callArgs.maxTokens, mockConfig.maxTokens);
        assert.equal(callArgs.temperature, mockConfig.temperature);
        assert.equal(callArgs.numSuggestions, mockCompletionSettings.maxHeadingSuggestions);
      });
    });

    describe('generateTextCompletion', () => {
      it('should generate text completion items', async () => {
        const mockCompletions = ['completion text 1', 'completion text 2'];
        mockProvider.generateCompletions!.resolves(mockCompletions);

        const context = {
          currentText: 'Hello',
          linesBefore: ['Line before'],
          currentLine: 'Hello world',
          linesAfter: ['Line after'],
        };

        const result = await completionService.generateTextCompletion(
          context,
          mockPosition,
          mockConfig,
          mockProvider as any,
          mockCompletionSettings
        );

        assert.equal(result.length, 2);
        assert.ok(result[0].label);
        assert.ok(mockProvider.generateCompletions!.calledOnce);

        const callArgs = mockProvider.generateCompletions!.firstCall.args[0];
        assert.ok(callArgs.prompt);
        assert.equal(callArgs.numSuggestions, mockCompletionSettings.maxTextSuggestions);
      });

      it('should handle empty text completions', async () => {
        mockProvider.generateCompletions!.resolves([]);

        const context = {
          currentText: 'Test',
          linesBefore: [],
          currentLine: 'Test line',
          linesAfter: [],
        };

        const result = await completionService.generateTextCompletion(
          context,
          mockPosition,
          mockConfig,
          mockProvider as any,
          mockCompletionSettings
        );

        assert.equal(result.length, 0);
      });

      it('should pass correct parameters to provider', async () => {
        mockProvider.generateCompletions!.resolves(['Test completion']);

        const context = {
          currentText: 'Partial text',
          linesBefore: ['Context before'],
          currentLine: 'Partial text line',
          linesAfter: ['Context after'],
        };

        await completionService.generateTextCompletion(
          context,
          mockPosition,
          mockConfig,
          mockProvider as any,
          mockCompletionSettings
        );

        const callArgs = mockProvider.generateCompletions!.firstCall.args[0];
        assert.equal(callArgs.language, mockConfig.language);
        assert.equal(callArgs.maxTokens, mockConfig.maxTokens);
        assert.equal(callArgs.temperature, mockConfig.temperature);
        assert.equal(callArgs.numSuggestions, mockCompletionSettings.maxTextSuggestions);
      });

      it('should use custom completion settings', async () => {
        mockProvider.generateCompletions!.resolves(['Completion']);

        const customSettings: CompletionSettings = {
          triggerOnHeading: true,
          maxHeadingSuggestions: 5,
          maxTextSuggestions: 3,
        };

        const context = {
          currentText: 'Text',
          linesBefore: [],
          currentLine: 'Text line',
          linesAfter: [],
        };

        await completionService.generateTextCompletion(
          context,
          mockPosition,
          mockConfig,
          mockProvider as any,
          customSettings
        );

        const callArgs = mockProvider.generateCompletions!.firstCall.args[0];
        assert.equal(callArgs.numSuggestions, 3);
      });
    });
  });
});
