import axios from 'axios';
import type { ProviderType, ModelInfo, ImageProcessParams, ImageProcessResult, ProviderConfig } from '@/types';
import type { KIProvider } from './base';

export class OpenRouterProvider implements KIProvider {
  name: ProviderType = 'openrouter';
  
  private baseUrl = 'https://openrouter.ai/api/v1';

  async testConnection(config: ProviderConfig): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });
      return response.data.data && response.data.data.length > 0;
    } catch (error) {
      console.error('OpenRouter connection test failed:', error);
      return false;
    }
  }

  async listAvailableModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });
      
      // Filter for vision-capable models
      const visionKeywords = ['vision', 'gpt-4o', 'claude-3', 'gemini'];
      
      return response.data.data
        .filter((model: any) => {
          const name = model.name || model.id || '';
          return visionKeywords.some(keyword => 
            name.toLowerCase().includes(keyword)
          );
        })
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
    // OpenRouter models with vision capability
    const visionModels = [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-4-turbo',
      'anthropic/claude-3',
      'google/gemini',
    ];
    
    return visionModels.some(vm => modelId.toLowerCase().includes(vm.split('/')[1]));
  }

  async processImage(params: ImageProcessParams): Promise<ImageProcessResult> {
    const startTime = Date.now();
    
    const config = {
      apiKey: params.provider === 'openrouter' 
        ? (await this.getStoredApiKey()) 
        : undefined,
    };

    if (!config.apiKey) {
      throw new Error('OpenRouter API key not found');
    }

    try {
      // Prepare messages with image
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
        `${this.baseUrl}/chat/completions`,
        {
          model: params.model,
          messages,
          max_tokens: 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/ydmw74/aiimageproc',
            'X-Title': 'AI ImageProc',
          },
        }
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
    } catch (error) {
      console.error('OpenRouter image processing failed:', error);
      throw error;
    }
  }

  getCostEstimate(modelId: string, imageSize: number): number {
    // Approximate pricing from OpenRouter (per 1K tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'openai/gpt-4o': { input: 0.005, output: 0.015 },
      'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
      'anthropic/claude-3-sonnet': { input: 0.003, output: 0.015 },
      'google/gemini-pro': { input: 0.00025, output: 0.0005 },
    };

    const modelPricing = pricing[modelId] || { input: 0.005, output: 0.015 };
    
    // Estimate tokens from image size
    const imageTokens = Math.ceil(imageSize / 1024);
    
    return (imageTokens / 1000) * modelPricing.input;
  }

  private async getStoredApiKey(): Promise<string> {
    if (window.electronAPI) {
      const result = await window.electronAPI.storageGet('openrouter-apikey');
      if (result.success && result.value) {
        return result.value;
      }
    }
    throw new Error('OpenRouter API key not found');
  }
}
