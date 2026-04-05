import type { ProviderType, ModelInfo, ImageProcessParams, ImageProcessResult, ProviderConfig } from '@/types';
import type { KIProvider } from './base';
import { OpenAIProvider } from './openai';
import { OllamaProvider } from './ollama';
import { OpenRouterProvider } from './openrouter';

export class KIProviderRouter {
  private providers: Map<ProviderType, KIProvider>;
  private currentProvider: ProviderType = 'ollama';

  constructor() {
    this.providers = new Map<ProviderType, KIProvider>();
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('ollama', new OllamaProvider());
    this.providers.set('openrouter', new OpenRouterProvider());
  }

  getCurrentProvider(): KIProvider {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error(`Provider ${this.currentProvider} not found`);
    }
    return provider;
  }

  setProvider(providerType: ProviderType): void {
    if (!this.providers.has(providerType)) {
      throw new Error(`Provider ${providerType} not supported`);
    }
    this.currentProvider = providerType;
  }

  getProvider(providerType: ProviderType): KIProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider ${providerType} not supported`);
    }
    return provider;
  }

  async testConnection(config: ProviderConfig): Promise<boolean> {
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

  async processImage(params: ImageProcessParams): Promise<ImageProcessResult> {
    const provider = this.getProvider(params.provider);
    return provider.processImage(params);
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
    const supportsVision = await provider.supportsVision(modelId, config);
    
    if (!supportsVision) {
      return {
        supported: false,
        message: `Model "${modelId}" does not support vision. Please select a vision-capable model.`,
      };
    }

    // Test connection
    const connected = await provider.testConnection(config);
    if (!connected) {
      return {
        supported: false,
        message: `Cannot connect to ${config.type} provider. Please check your configuration.`,
      };
    }

    return {
      supported: true,
      message: `Model "${modelId}" is ready for vision processing.`,
    };
  }
}

// Singleton instance
export const kiProviderRouter = new KIProviderRouter();
