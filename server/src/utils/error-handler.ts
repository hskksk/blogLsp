import { Connection } from 'vscode-languageserver/node';
import type { LlmProvider } from '@blogLsp/shared';
import type { ServerConfig } from '../config/types';

/**
 * ???LLM????????????
 */
export interface ConfigCheckResult {
  isValid: boolean;
  config: ServerConfig;
  provider: LlmProvider;
}

/**
 * ???LLM????????
 * ????????????????
 */
export async function checkConfiguration(
  connection: Connection,
  config: ServerConfig | null,
  provider: LlmProvider | null,
  updateConfig: () => Promise<void>
): Promise<ConfigCheckResult | null> {
  if (!config || !provider) {
    connection.console.warn('Configuration or LLM provider not available');
    await updateConfig();

    // ????????
    // ?????????????????????????????????????????
    // ???????????????????????????
    return null;
  }

  return {
    isValid: true,
    config,
    provider,
  };
}

/**
 * ?????????????????
 */
export function handleError(
  connection: Connection,
  error: unknown,
  userMessage?: string
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  connection.console.error(`Error: ${errorMessage}`);

  if (userMessage) {
    connection.window.showErrorMessage(userMessage);
  }
}

/**
 * ????????????????
 */
export async function ensureConfiguration(
  connection: Connection,
  config: ServerConfig | null,
  provider: LlmProvider | null,
  updateConfig: () => Promise<void>
): Promise<ConfigCheckResult | null> {
  const result = await checkConfiguration(connection, config, provider, updateConfig);

  if (!result) {
    connection.window.showErrorMessage(
      'Configuration or LLM provider not available. Please check your settings.'
    );
  }

  return result;
}
