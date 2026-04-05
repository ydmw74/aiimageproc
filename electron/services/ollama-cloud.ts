import axios from 'axios';
import type { ProviderType, ModelInfo, ImageProcessParams, ImageProcessResult, ProviderConfig } from './types.js';
import type { KIProvider, ConnectionResult } from './base.js';

export class OllamaCloudProvider implements KIProvider {
  name: ProviderType = 'ollama-cloud';
  
  private defaultBaseURL = 'https://api.ollama.ai/v1';

  private getClient(config: ProviderConfig): { baseURL: string; headers: Record<string, string> } {
    return {
      baseURL: config.url || this.defaultBaseURL,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    };
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionResult> {
    if (!config.apiKey) {
      return { connected: false, error: 'API key is required for Ollama Cloud.' };
    }
    try {
      const { baseURL, headers } = this.getClient(config);
      const response = await axios.get(`${baseURL}/models`, { headers });
      const hasModels = response.data?.data?.length > 0 || response.data?.models?.length > 0;
      if (!hasModels) {
        return { connected: true, error: 'Connected, but no models found on this endpoint.' };
      }
      return { connected: true };
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) return { connected: false, error: 'Invalid API key (401 Unauthorized).' };
      if (status === 403) return { connected: false, error: 'API key lacks permission (403 Forbidden).' };
      return { connected: false, error: error?.response?.data?.message || error?.message || 'Connection failed.' };
    }
  }

  async listAvailableModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const { baseURL, headers } = this.getClient(config);
      const response = await axios.get(`${baseURL}/models`, { headers });
      
      const models = response.data.data || response.data.models || [];

      return models.map((model: any) => ({
        id: model.id || model.name,
        name: model.name || model.id,
        supportsVision: this.isVisionModel(model.id || model.name || ''),
        provider: this.name as ProviderType,
        contextWindow: model.context_length || model.contextWindow || 4096,
        maxImageSize: 20 * 1024 * 1024,
        costPerImage: this.getCostEstimate(model.id || model.name, 1024 * 1024),
      }));
    } catch (error) {
      console.error('Failed to list Ollama Cloud models:', error);
      return [];
    }
  }

  private isVisionModel(modelId: string): boolean {
    const id = modelId.toLowerCase().split(':')[0];
    const visionPrefixes = ['llava', 'bakllava', 'moondream', 'minicpm-v', 'llava-phi', 'granite3-vision', 'smolvlm'];
    const hasVlSuffix = id.endsWith('-vl') || id.endsWith('vl');
    const hasVisionWord = id.includes('vision');
    return hasVlSuffix || hasVisionWord || visionPrefixes.some(p => id.includes(p));
  }

  async supportsVision(modelId: string, _config: ProviderConfig): Promise<boolean> {
    return this.isVisionModel(modelId);
  }

  async processImage(params: ImageProcessParams, config: ProviderConfig): Promise<ImageProcessResult> {
    const startTime = Date.now();
    const { baseURL, headers } = this.getClient(config);

    if (!config.apiKey) {
      throw new Error('Ollama Cloud API key not found. Please add your API key in Settings.');
    }

    let prompt = params.prompt;
    if (params.maskBase64) {
      prompt = `[Mask provided - only edit the marked areas]\n\n${params.prompt}`;
    }

    try {
      const response = await axios.post(
        `${baseURL}/chat/completions`,
        {
          model: params.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: params.imageBase64,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
        },
        { headers }
      );

      const processingTime = Date.now() - startTime;
      const cost = this.getCostEstimate(params.model, Buffer.from(params.imageBase64.split(',')[1] || '', 'base64').length);

      return {
        resultImageBase64: params.imageBase64,
        description: response.data.choices[0]?.message?.content || 'No response',
        cost,
        processingTime,
      };
    } catch (error: any) {
      console.error('Ollama Cloud image processing failed:', error);
      const status = error?.response?.status;
      const apiMessage = error?.response?.data?.error || error?.response?.data?.message;
      if (status === 404) {
        throw new Error(`Model "${params.model}" not found on this endpoint (404). Check the model ID and endpoint URL in Settings.`);
      }
      if (status === 401) throw new Error('Invalid API key (401). Check your Ollama Cloud API key in Settings.');
      if (status === 403) throw new Error('Access denied (403). Your API key may not have permission for this model.');
      if (status === 429) throw new Error('Rate limit exceeded (429). Please wait and try again.');
      const message = apiMessage || error?.message || String(error);
      if (message.includes('does not support image') || message.includes('vision')) {
        throw new Error(`Model "${params.model}" does not support image input. Select a vision model in Settings.`);
      }
      throw new Error(`Ollama Cloud error: ${message}`);
    }
  }

  getCostEstimate(modelId: string, imageSize: number): number {
    // Ollama Cloud pricing (approximate - adjust based on actual pricing)
    const pricing: Record<string, { input: number; output: number }> = {
      'llava': { input: 0.0001, output: 0.0002 },
      'llava-v1.6': { input: 0.0001, output: 0.0002 },
      'qwen-vl': { input: 0.0001, output: 0.0002 },
    };

    const modelPricing = pricing[modelId] || { input: 0.0001, output: 0.0002 };
    const imageTokens = Math.ceil(imageSize / 1024);
    
    return (imageTokens / 1000) * modelPricing.input;
  }
}