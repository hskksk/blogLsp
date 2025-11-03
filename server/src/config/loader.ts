import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';
import toml from 'toml';

export interface WorkspaceConfigData {
  stylePrompt?: string;
  completion?: {
    maxTextSuggestions?: number;
    maxHeadingSuggestions?: number;
    triggerOnHeading?: boolean;
  };
}

type ParsedFile = {
  mtimeMs: number;
  data: WorkspaceConfigData;
  filePath: string;
};

/**
 * WorkspaceConfigLoader
 * - Finds and parses .blog-lsp.toml or .blog-lsp.yml at the workspace root
 * - Caches by mtime and prefers TOML over YAML when both exist
 */
export class WorkspaceConfigLoader {
  private workspaceRoot: string;
  private cache: ParsedFile | null = null;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  private readIfExists(filePath: string): ParsedFile | null {
    if (!fs.existsSync(filePath)) return null;
    try {
      const stat = fs.statSync(filePath);
      const raw = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath).toLowerCase();
      let parsed: any;
      if (ext === '.toml') {
        parsed = toml.parse(raw);
      } else {
        parsed = yaml.parse(raw);
      }
      const normalized = this.normalize(parsed);
      return { mtimeMs: stat.mtimeMs, data: normalized, filePath };
    } catch (err) {
      // Parse errors are non-fatal: ignore and return null
      return null;
    }
  }

  private normalize(parsed: any): WorkspaceConfigData {
    const result: WorkspaceConfigData = {};

    // style.prompt -> stylePrompt
    const stylePrompt = parsed?.style?.prompt;
    if (typeof stylePrompt === 'string') {
      result.stylePrompt = stylePrompt;
    }

    // completion.* passthrough (validated later by consumer)
    const completion = parsed?.completion ?? {};
    const outCompletion: WorkspaceConfigData['completion'] = {};
    if (typeof completion.maxTextSuggestions === 'number') {
      outCompletion.maxTextSuggestions = completion.maxTextSuggestions;
    }
    if (typeof completion.maxHeadingSuggestions === 'number') {
      outCompletion.maxHeadingSuggestions = completion.maxHeadingSuggestions;
    }
    if (typeof completion.triggerOnHeading === 'boolean') {
      outCompletion.triggerOnHeading = completion.triggerOnHeading;
    }
    if (Object.keys(outCompletion).length > 0) {
      result.completion = outCompletion;
    }

    return result;
  }

  /**
   * Load workspace config with precedence: TOML > YAML. Cached by mtime.
   */
  load(): WorkspaceConfigData | null {
    const tomlPath = path.join(this.workspaceRoot, '.blog-lsp.toml');
    const yamlPath = path.join(this.workspaceRoot, '.blog-lsp.yml');

    const tomlData = this.readIfExists(tomlPath);
    const yamlData = this.readIfExists(yamlPath);

    // Pick candidate according to precedence
    const candidate = tomlData ?? yamlData ?? null;
    if (!candidate) return null;

    // If cache matches same file and mtime, return cached
    if (
      this.cache &&
      this.cache.filePath === candidate.filePath &&
      this.cache.mtimeMs === candidate.mtimeMs
    ) {
      return this.cache.data;
    }

    // Update cache and return
    this.cache = candidate;
    return candidate.data;
  }
}
