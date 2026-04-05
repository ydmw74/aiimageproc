import axios from 'axios';
import type { ProviderType, ModelInfo, ImageProcessParams, ImageProcessResult, ProviderConfig } from './types.js';
import type { KIProvider, ConnectionResult } from './base.js';

export class OpenRouterProvider implements KIProvider {
  name: ProviderType = 'openrouter';
  
  private defaultBaseURL = 'https://openrouter.ai/api/v1';

  private getClient(config: ProviderConfig): { baseURL: string; headers: Record<string, string> } {
    return {
      baseURL: config.url || this.defaultBaseURL,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/ydmw74/aiimageproc',
        'X-Title': 'AI ImageProc',
      },
    };
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionResult> {
    if (!config.apiKey) {
      return { connected: false, error: 'API key is required for OpenRouter.' };
    }
    try {
      const { baseURL, headers } = this.getClient(config);
      const response = await axios.get(`${baseURL}/models`, { headers });
      if (!response.data?.data?.length) {
        return { connected: true, error: 'Connected, but no models returned.' };
      }
      return { connected: true };
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) return { connected: false, error: 'Invalid API key (401 Unauthorized).' };
      if (status === 403) return { connected: false, error: 'API key lacks permission (403 Forbidden).' };
      return { connected: false, error: error?.response?.data?.message || error?.message || 'Connection failed.' };
    }
  }

  // Check if a model supports image input using the OpenRouter API response fields
  private modelSupportsImage(model: any): boolean {
    // Prefer authoritative API field: architecture.input_modalities or architecture.modalities
    const modalities: string[] =
      model.architecture?.input_modalities ||
      model.architecture?.modalities ||
      [];
    if (modalities.length > 0) {
      return modalities.some((m: string) => m === 'image' || m === 'image_url');
    }
    // Fallback: name-based heuristic for older API responses
    return this.isVisionModelByName(model.id || model.name || '');
  }

  private isVisionModelByName(modelId: string): boolean {
    const id = modelId.toLowerCase();
    const visionPrefixes = ['gpt-4o', 'gpt-4-turbo', 'gpt-4-vision', 'claude-3', 'gemini', 'llava', 'qwen-vl', 'qwen2-vl', 'qwen3-vl', 'pixtral', 'llama-3.2-11b-vision', 'llama-3.2-90b-vision'];
    const hasVlSuffix = id.split('/').pop()?.endsWith('-vl') || id.split('/').pop()?.endsWith('vl');
    const hasVisionWord = id.includes('vision');
    return !!hasVlSuffix || hasVisionWord || visionPrefixes.some(p => id.includes(p));
  }

  async listAvailableModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const { baseURL, headers } = this.getClient(config);
      const response = await axios.get(`${baseURL}/models`, { headers });

      return response.data.data
        .filter((model: any) => this.modelSupportsImage(model))
        .map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          supportsVision: true,
          provider: this.name as ProviderType,
          contextWindow: model.context_length || 4096,
          maxImageSize: undefined,
          costPerImage: this.getCostEstimate(model.id, 1024 * 1024),
        }));
    } catch (error) {
      console.error('Failed to list OpenRouter models:', error);
      return [];
    }
  }

  async supportsVision(modelId: string, _config: ProviderConfig): Promise<boolean> {
    return this.isVisionModelByName(modelId);
  }

  async processImage(params: ImageProcessParams, config: ProviderConfig): Promise<ImageProcessResult> {
    const startTime = Date.now();
    const { baseURL, headers } = this.getClient(config);

    if (!config.apiKey) {
      throw new Error('OpenRouter API key not found');
    }

    try {
      const messages = [
        {
          role: 'system' as const,
          content: 'You are an AI image editing assistant. You will receive an image and instructions on how to edit it. Describe the changes you would make.',
        },
        {
          role: 'user' as const,
          content: [
            {
              type: 'image_url',
              image_url: {
                url: params.imageBase64,
              },
            },
            {
              type: 'text',
              text: params.prompt,
            },
          ],
        },
      ];

      const response = await axios.post(
        `${baseURL}/chat/completions`,
        {
          model: params.model,
          messages,
          max_tokens: 1000,
        },
        { headers }
      );

      const processingTime = Date.now() - startTime;
      const cost = this.getCostEstimate(
        params.model,
        Buffer.from(params.imageBase64.split(',')[1] || '', 'base64').length
      );

      return {
        resultImageBase64: params.imageBase64,
        description: response.data.choices[0]?.message?.content || 'No response',
        cost,
        processingTime,
      };
    } catch (error: any) {
      console.error('OpenRouter image processing failed:', error);
      const status = error?.response?.status;
      const apiMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
      if (status === 404) {
        throw new Error(`Model "${params.model}" not found on OpenRouter (404). Check the model ID at openrouter.ai/models`);
      }
      if (status === 401) throw new Error('Invalid API key (401). Check your OpenRouter API key in Settings.');
      if (status === 402) throw new Error('Insufficient credits (402). Top up your OpenRouter balance.');
      if (status === 429) throw new Error('Rate limit exceeded (429). Please wait and try again.');
      throw new Error(`OpenRouter error: ${apiMessage || error?.message || String(error)}`);
    }
  }

  getCostEstimate(modelId: string, imageSize: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'openai/gpt-4o': { input: 0.005, output: 0.015 },
      'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
      'anthropic/claude-3-sonnet': { input: 0.003, output: 0.015 },
      'google/gemini-pro': { input: 0.00025, output: 0.0005 },
    };

    const modelPricing = pricing[modelId] || { input: 0.005, output: 0.015 };
    const imageTokens = Math.ceil(imageSize / 1024);
    
    return (imageTokens / 1000) * modelPricing.input;
  }
}