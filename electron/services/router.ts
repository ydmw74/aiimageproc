import type { ProviderType, ModelInfo, ImageProcessParams, ImageProcessResult, ProviderConfig } from './types.js';
import type { KIProvider, ConnectionResult } from './base.js';
import { OpenAIProvider } from './openai.js';
import { OllamaProvider } from './ollama.js';
import { OllamaCloudProvider } from './ollama-cloud.js';
import { OpenRouterProvider } from './openrouter.js';

export class KIProviderRouter {
  private providers: Map<ProviderType, KIProvider>;

  constructor() {
    this.providers = new Map<ProviderType, KIProvider>();
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('ollama', new OllamaProvider());
    this.providers.set('ollama-cloud', new OllamaCloudProvider());
    this.providers.set('openrouter', new OpenRouterProvider());
  }

  getProvider(providerType: ProviderType): KIProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider ${providerType} not supported`);
    }
    return provider;
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionResult> {
    const provider = this.getProvider(config.type);
    return provider.testConnection(config);
  }

  async listAvailableModels(config: ProviderConfig): Promise<ModelInfo[]> {
    const provider = this.getProvider(config.type);
    return provider.listAvailableModels(config);
  }

  async supportsVision(modelId: string, config: ProviderConfig): Promise<boolean> {
    const provider = this.getProvider(config.type);
    return provider.supportsVision(modelId, config);
  }

  async processImage(params: ImageProcessParams, config: ProviderConfig): Promise<ImageProcessResult> {
    const provider = this.getProvider(params.provider);
    return provider.processImage(params, config);
  }

  getCostEstimate(modelId: string, imageSize: number, providerType: ProviderType): number {
    const provider = this.getProvider(providerType);
    return provider.getCostEstimate(modelId, imageSize);
  }

  async checkVisionCapability(modelId: string, config: ProviderConfig): Promise<{
    supported: boolean;
    message: string;
  }> {
    const provider = this.getProvider(config.type);

    const connectionResult = await provider.testConnection(config);
    if (!connectionResult.connected) {
      return {
        supported: false,
        message: connectionResult.error || `Cannot connect to ${config.type} provider.`,
      };
    }

    const supportsVision = await provider.supportsVision(modelId, config);
    if (!supportsVision) {
      return {
        supported: false,
        message: `Model "${modelId}" does not appear to support vision. Known vision models: llava, bakllava, qwen-vl, gpt-4o, claude-3, gemini.`,
      };
    }

    return {
      supported: true,
      message: `Model "${modelId}" is ready for vision processing.`,
    };
  }

  async fullConnectionTest(modelId: string, config: ProviderConfig): Promise<{
    connected: boolean;
    connectionError?: string;
    visionSupported?: boolean;
    visionMessage?: string;
    availableModels?: ModelInfo[];
  }> {
    const provider = this.getProvider(config.type);

    const connectionResult = await provider.testConnection(config);
    if (!connectionResult.connected) {
      return {
        connected: false,
        connectionError: connectionResult.error,
      };
    }

    const availableModels = await provider.listAvailableModels(config).catch(() => []);
    const visionSupported = modelId ? await provider.supportsVision(modelId, config) : undefined;

    return {
      connected: true,
      visionSupported,
      visionMessage: visionSupported === false
        ? `"${modelId}" does not appear to support vision.`
        : visionSupported === true
          ? `"${modelId}" supports vision processing.`
          : undefined,
      availableModels,
    };
  }
}

export const kiProviderRouter = new KIProviderRouter();