import { Connection } from 'vscode-languageserver/node';
import type { LlmProvider } from '@blogLsp/shared';
import type { ServerConfig } from '../config/types';

/**
 * Configuration and LLM provider check result
 */
export interface ConfigCheckResult {
  isValid: boolean;
  config: ServerConfig;
  provider: LlmProvider;
}

/**
 * Check configuration and LLM provider
 * Attempts to update automatically if invalid
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

    // Check again after update
    // This function is called from outside the configuration manager class,
    // so it needs to receive the latest configuration as a parameter
    return null;
  }

  return {
    isValid: true,
    config,
    provider,
  };
}

/**
 * Output error log and notify user
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
 * Common configuration/provider check
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
