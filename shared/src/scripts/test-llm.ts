#!/usr/bin/env node

/**
 * LLMプロバイダのテストスクリプト
 * 
 * 使用例:
 *   npm run test:llm
 *   OPENAI_API_KEY=your-key npm run test:llm
 */

import { createLlmProvider, buildSystemPrompt } from '../index';
import type { BlogLspConfig } from '../index';

// 環境変数から設定を読み込む
function getConfig(): BlogLspConfig {
  const provider = process.env.LLM_PROVIDER || 'openai';
  const model = process.env.LLM_MODEL || 'gpt-3.5-turbo';
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  const apiBaseUrl = process.env.LLM_API_BASE_URL;
  
  if (!apiKey) {
    console.error('Error: API key not found. Set OPENAI_API_KEY or LLM_API_KEY environment variable.');
    process.exit(1);
  }

  return {
    provider,
    model,
    apiKey,
    apiBaseUrl,
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '256', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    numSuggestions: parseInt(process.env.LLM_NUM_SUGGESTIONS || '2', 10),
    style: (process.env.LLM_STYLE as 'tech-blog' | 'casual' | 'formal') || 'tech-blog',
    language: (process.env.LLM_LANGUAGE as 'ja' | 'en') || 'ja',
    privacy: {
      scope: 'paragraph',
    },
    enableStreaming: false,
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '20000', 10),
  };
}

async function main() {
  console.log('🚀 LLM Provider Test\n');
  
  const config = getConfig();
  console.log('Configuration:');
  console.log(`  Provider: ${config.provider}`);
  console.log(`  Model: ${config.model}`);
  console.log(`  Max Tokens: ${config.maxTokens}`);
  console.log(`  Temperature: ${config.temperature}`);
  console.log(`  Num Suggestions: ${config.numSuggestions}`);
  console.log(`  Style: ${config.style}`);
  console.log(`  Language: ${config.language}\n`);

  try {
    // プロバイダを作成
    const provider = createLlmProvider(config);
    console.log(`✓ Created provider: ${provider.name}`);
    console.log(`✓ Streaming supported: ${provider.supportsStreaming}\n`);

    // システムプロンプトを構築
    const systemPrompt = buildSystemPrompt(config.style, config.language);
    
    // テスト用のプロンプト
    const testPrompt = `${systemPrompt}\n\nContinue the following paragraph naturally:\n\nTypeScript is a powerful language that extends JavaScript with type safety. When developing large-scale applications,`;

    console.log('📝 Test Prompt:');
    console.log('─'.repeat(60));
    console.log(testPrompt);
    console.log('─'.repeat(60));
    console.log('\n⏳ Generating completions...\n');

    // 補完を生成
    const startTime = Date.now();
    const completions = await provider.generateCompletions({
      prompt: testPrompt,
      language: config.language,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      numSuggestions: config.numSuggestions,
    });
    const elapsedTime = Date.now() - startTime;

    console.log(`✓ Generated ${completions.length} completion(s) in ${elapsedTime}ms\n`);
    
    // 結果を表示
    completions.forEach((completion, index) => {
      console.log(`\n📄 Suggestion ${index + 1}:`);
      console.log('─'.repeat(60));
      console.log(completion);
      console.log('─'.repeat(60));
    });

    console.log('\n✅ Test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// スクリプトとして実行された場合のみmainを実行
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

