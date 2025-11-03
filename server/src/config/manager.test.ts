import { describe, it, beforeEach, afterEach } from 'mocha';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { Connection } from 'vscode-languageserver/node';
import { ConfigurationManager } from './manager';
import type { InitConfigOptions } from './types';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';



describe('manager.ts', () => {
  let mockConnection: sinon.SinonStubbedInstance<Connection>;
  let configManager: ConfigurationManager;

  beforeEach(() => {
    // Connection?????????????????????
    mockConnection = {
      workspace: {} as any,
      console: {
        log: sinon.stub(),
        error: sinon.stub(),
        warn: sinon.stub(),
      } as any,
      window: {} as any,
    } as any;
    configManager = new ConfigurationManager(mockConnection as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('ConfigurationManager', () => {
    describe('setConfigurationCapability', () => {
      it('should set configuration capability', () => {
        configManager.setConfigurationCapability(true);
        assert.equal(configManager.hasCapability(), true);

        configManager.setConfigurationCapability(false);
        assert.equal(configManager.hasCapability(), false);
      });
    });

    describe('workspace file precedence and failure cases', () => {
      let tmpDir: string;
      beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloglsp-test-'));
        configManager.setWorkspaceRoot(tmpDir);
      });
      afterEach(() => {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
      });

      it('TOML style.prompt overrides VS Code stylePrompt', async () => {
        configManager.setConfigurationCapability(true);
        // VS Code config returns a stylePrompt, which should be overridden by TOML
        mockConnection.workspace = {
          getConfiguration: sinon.stub().resolves({
            provider: 'openai',
            model: 'gpt-4',
            numSuggestions: 1,
            stylePrompt: 'VS-CODE-STYLE',
            language: 'ja',
          }),
        } as any;

        // Write TOML file
        const tomlContent = [
          '[style]',
          'prompt = """TOML STYLE PROMPT"""',
        ].join('\n');
        fs.writeFileSync(path.join(tmpDir, '.blog-lsp.toml'), tomlContent, 'utf8');

        const cfg = await configManager.getConfiguration();
        assert.ok(cfg);
        assert.equal(cfg!.stylePrompt, 'TOML STYLE PROMPT');
      });

      it('YAML used when TOML missing', async () => {
        configManager.setConfigurationCapability(true);
        mockConnection.workspace = {
          getConfiguration: sinon.stub().resolves({
            provider: 'openai',
            model: 'gpt-4',
            numSuggestions: 1,
            language: 'en',
          }),
        } as any;

        const yml = [
          'style:',
          '  prompt: |',
          '    YAML STYLE PROMPT',
          'completion:',
          '  maxTextSuggestions: 2',
          '  maxHeadingSuggestions: 7',
          '  triggerOnHeading: false',
        ].join('\n');
        fs.writeFileSync(path.join(tmpDir, '.blog-lsp.yml'), yml, 'utf8');

        const cfg = await configManager.getConfiguration();
        assert.ok(cfg);
        assert.equal(cfg!.stylePrompt, 'YAML STYLE PROMPT\n');

        const comp = await configManager.getCompletionSettings();
        assert.equal(comp.maxTextSuggestions, 2);
        assert.equal(comp.maxHeadingSuggestions, 7);
        assert.equal(comp.triggerOnHeading, false);
      });

      it('Invalid file is ignored and does not crash', async () => {
        configManager.setConfigurationCapability(true);
        mockConnection.workspace = {
          getConfiguration: sinon.stub().resolves({
            provider: 'openai',
            model: 'gpt-4',
            numSuggestions: 1,
            stylePrompt: 'FALLBACK STYLE',
            language: 'ja',
          }),
        } as any;

        // Write invalid TOML
        fs.writeFileSync(
          path.join(tmpDir, '.blog-lsp.toml'),
          '[[style]\ninvalid',
          'utf8'
        );

        const cfg = await configManager.getConfiguration();
        assert.ok(cfg);
        // Falls back to VS Code stylePrompt
        assert.equal(cfg!.stylePrompt, 'FALLBACK STYLE');
      });
    });

    describe('getCurrentConfig', () => {
      it('should return null initially', () => {
        const config = configManager.getCurrentConfig();
        assert.equal(config, null);
      });

      it('should return config after initialization', async () => {
        const initConfig: InitConfigOptions = {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'test-key',
          numSuggestions: 2,
          language: 'ja',
          privacy: { scope: 'paragraph' },
          enableStreaming: false,
          timeoutMs: 5000,
        };

        await configManager.updateConfigurationFromInit(initConfig);

        const config = configManager.getCurrentConfig();
        assert.ok(config);
        assert.equal(config!.provider, 'openai');
        assert.equal(config!.model, 'gpt-4');
      });
    });

    describe('getLlmProvider', () => {
      it('should return null initially', () => {
        const provider = configManager.getLlmProvider();
        assert.equal(provider, null);
      });

      it('should return provider after initialization', async () => {
        const initConfig: InitConfigOptions = {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'test-key',
          numSuggestions: 2,
          language: 'ja',
          privacy: { scope: 'paragraph' },
          enableStreaming: false,
          timeoutMs: 5000,
        };

        await configManager.updateConfigurationFromInit(initConfig);

        const provider = configManager.getLlmProvider();
        assert.ok(provider);
        assert.equal(provider!.name, 'openai');
      });
    });

    describe('getConfiguration', () => {
      it('should return null if no capability', async () => {
        configManager.setConfigurationCapability(false);

        const config = await configManager.getConfiguration();

        assert.equal(config, null);
      });

      it('should get configuration from workspace settings', async () => {
        configManager.setConfigurationCapability(true);

        const mockConfig = {
          provider: 'openai',
          model: 'gpt-4',
          maxTokens: 128,
          numSuggestions: 3,
          language: 'en',
          privacy: { scope: 'document' },
          enableStreaming: true,
          timeoutMs: 30000,
        };

        mockConnection.workspace = {
          getConfiguration: sinon.stub().resolves(mockConfig),
        } as any;

        const config = await configManager.getConfiguration();

        assert.ok(config);
        assert.equal(config!.provider, 'openai');
        assert.equal(config!.model, 'gpt-4');
        assert.equal(config!.numSuggestions, 3);
        // style removed
      });

      it('should handle environment variable in apiKey', async () => {
        configManager.setConfigurationCapability(true);
        const originalEnv = process.env.TEST_API_KEY;
        process.env.TEST_API_KEY = 'env-key-value';

        const mockConfig = {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: '${env:TEST_API_KEY}',
          numSuggestions: 1,
          language: 'ja',
          privacy: { scope: 'paragraph' },
          enableStreaming: false,
          timeoutMs: 5000,
        };

        mockConnection.workspace = {
          getConfiguration: sinon.stub().resolves(mockConfig),
        } as any;

        const config = await configManager.getConfiguration();

        assert.ok(config);
        assert.equal(config!.apiKey, 'env-key-value');

        if (originalEnv) {
          process.env.TEST_API_KEY = originalEnv;
        } else {
          delete process.env.TEST_API_KEY;
        }
      });
    });

    describe('updateConfigurationFromInit', () => {
      it('should update config and initialize provider', async () => {
        const initConfig: InitConfigOptions = {
          provider: 'azure-openai',
          model: 'gpt-4',
          apiKey: 'test-key',
          apiBaseUrl: 'https://test.openai.azure.com/openai/deployments/gpt-4',
          numSuggestions: 5,
          language: 'en',
          privacy: { scope: 'document' },
          enableStreaming: true,
          timeoutMs: 10000,
        };

        await configManager.updateConfigurationFromInit(initConfig);

        const config = configManager.getCurrentConfig();
        assert.ok(config);
        assert.equal(config!.provider, 'azure-openai');
        assert.equal(config!.numSuggestions, 5);

        const provider = configManager.getLlmProvider();
        assert.ok(provider);
        assert.equal(provider!.name, 'azure-openai');
      });

      it('should use defaults for missing options', async () => {
        const initConfig: InitConfigOptions = {
          provider: 'openai',
        };

        await configManager.updateConfigurationFromInit(initConfig);

        const config = configManager.getCurrentConfig();
        assert.ok(config);
        assert.equal(config!.provider, 'openai');
        assert.equal(config!.numSuggestions, 2);
      });

      it('should initialize provider without apiKey for openai-compatible on localhost', async () => {
        const initConfig: InitConfigOptions = {
          provider: 'openai-compatible',
          model: 'llama3.1:8b',
          apiBaseUrl: 'http://localhost:11434/v1',
          // apiKey omitted intentionally
        };

        await configManager.updateConfigurationFromInit(initConfig);

        const cfg = configManager.getCurrentConfig();
        const prov = configManager.getLlmProvider();
        assert.ok(cfg);
        assert.ok(prov);
        assert.equal(prov!.name, 'openai');
      });

      it('should initialize provider without apiKey for local provider on localhost', async () => {
        const initConfig: InitConfigOptions = {
          provider: 'local',
          model: 'llama3.1:8b',
          apiBaseUrl: 'http://127.0.0.1:11434/v1',
          // apiKey omitted intentionally
        };

        await configManager.updateConfigurationFromInit(initConfig);

        const cfg = configManager.getCurrentConfig();
        const prov = configManager.getLlmProvider();
        assert.ok(cfg);
        assert.ok(prov);
        assert.equal(prov!.name, 'openai');
      });
    });

    describe('updateConfiguration', () => {
      it('should update config from workspace settings', async () => {
        configManager.setConfigurationCapability(true);

        const mockConfig = {
          provider: 'openai',
          model: 'gpt-4',
          numSuggestions: 1,
          language: 'ja',
          privacy: { scope: 'paragraph' },
          enableStreaming: false,
          timeoutMs: 5000,
        };

        mockConnection.workspace = {
          getConfiguration: sinon.stub().resolves(mockConfig),
        } as any;

        await configManager.updateConfiguration();

        const config = configManager.getCurrentConfig();
        assert.ok(config);
        assert.equal(config!.provider, 'openai');
      });

      it('should update provider when config changes', async () => {
        configManager.setConfigurationCapability(true);

        // First config
        mockConnection.workspace = {
          getConfiguration: sinon.stub().resolves({
            provider: 'openai',
            model: 'gpt-4',
            apiKey: 'test-key',
            numSuggestions: 1,
            language: 'ja',
            privacy: { scope: 'paragraph' },
            enableStreaming: false,
            timeoutMs: 5000,
          }),
        } as any;

        await configManager.updateConfiguration();

        const provider1 = configManager.getLlmProvider();
        assert.ok(provider1);
        assert.equal(provider1!.name, 'openai');

        // Change config
        mockConnection.workspace = {
          getConfiguration: sinon.stub().resolves({
            provider: 'azure-openai',
            model: 'gpt-4',
            apiKey: 'test-key',
            apiBaseUrl: 'https://test.openai.azure.com/openai/deployments/gpt-4',
            numSuggestions: 1,
            style: 'tech-blog',
            language: 'ja',
            privacy: { scope: 'paragraph' },
            enableStreaming: false,
            timeoutMs: 5000,
          }),
        } as any;

        await configManager.updateConfiguration();

        const provider2 = configManager.getLlmProvider();
        assert.ok(provider2);
        assert.equal(provider2!.name, 'azure-openai');
      });
    });

    describe('getCompletionSettings', () => {
      it('should return defaults if no capability', async () => {
        configManager.setConfigurationCapability(false);

        const settings = await configManager.getCompletionSettings();

        assert.equal(settings.triggerOnHeading, true);
        assert.equal(settings.maxHeadingSuggestions, 3);
        assert.equal(settings.maxTextSuggestions, 1);
      });

      it('should get settings from workspace config', async () => {
        configManager.setConfigurationCapability(true);

        mockConnection.workspace = {
          getConfiguration: sinon.stub().resolves({
            completion: {
              triggerOnHeading: false,
              maxHeadingSuggestions: 5,
              maxTextSuggestions: 2,
            },
          }),
        } as any;

        const settings = await configManager.getCompletionSettings();

        assert.equal(settings.triggerOnHeading, false);
        assert.equal(settings.maxHeadingSuggestions, 5);
        assert.equal(settings.maxTextSuggestions, 2);
      });
    });

    describe('getCommandSettings', () => {
      it('should return defaults if no capability', async () => {
        configManager.setConfigurationCapability(false);

        const settings = await configManager.getCommandSettings();

        assert.equal(settings.enableHeadingGeneration, true);
        assert.equal(settings.enableParagraphCompletion, true);
      });

      it('should get settings from workspace config', async () => {
        configManager.setConfigurationCapability(true);

        mockConnection.workspace = {
          getConfiguration: sinon.stub().resolves({
            commands: {
              enableHeadingGeneration: false,
              enableParagraphCompletion: false,
            },
          }),
        } as any;

        const settings = await configManager.getCommandSettings();

        assert.equal(settings.enableHeadingGeneration, false);
        assert.equal(settings.enableParagraphCompletion, false);
      });
    });
  });
});
