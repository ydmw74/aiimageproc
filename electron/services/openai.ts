import OpenAI from 'openai';
import type { ProviderType, ModelInfo, ImageProcessParams, ImageProcessResult, ProviderConfig } from './types.js';
import type { KIProvider, ConnectionResult } from './base.js';

export class OpenAIProvider implements KIProvider {
  name: ProviderType = 'openai';
  
  private defaultBaseURL = 'https://api.openai.com/v1';

  private getClient(apiKey?: string, baseURL?: string): OpenAI {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    return new OpenAI({ 
      apiKey,
      baseURL: baseURL || this.defaultBaseURL,
    });
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionResult> {
    if (!config.apiKey) {
      return { connected: false, error: 'API key is required for OpenAI.' };
    }
    try {
      const client = this.getClient(config.apiKey, config.url);
      const models = await client.models.list();
      if (models.data.length === 0) {
        return { connected: false, error: 'Connected but no models returned.' };
      }
      return { connected: true };
    } catch (error: any) {
      const status = error?.status;
      if (status === 401) return { connected: false, error: 'Invalid API key (401 Unauthorized).' };
      if (status === 403) return { connected: false, error: 'API key lacks permission (403 Forbidden).' };
      if (status === 429) return { connected: false, error: 'Rate limit exceeded (429). Try again later.' };
      return { connected: false, error: error?.message || 'Connection failed.' };
    }
  }

  async listAvailableModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const client = this.getClient(config.apiKey, config.url);
      const models = await client.models.list();
      
      const visionModels = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4-vision-preview',
      ];
      
      return models.data
        .filter(model => visionModels.some(vm => model.id.includes(vm)))
        .map(model => ({
          id: model.id,
          name: model.id,
          supportsVision: visionModels.some(vm => model.id.includes(vm)),
          provider: this.name as ProviderType,
          contextWindow: 128000,
          maxImageSize: 20 * 1024 * 1024,
          costPerImage: this.getCostEstimate(model.id, 1024 * 1024),
        }));
    } catch (error) {
      console.error('Failed to list OpenAI models:', error);
      return [];
    }
  }

  async supportsVision(modelId: string, _config: ProviderConfig): Promise<boolean> {
    const visionModels = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4-vision-preview',
    ];
    
    return visionModels.some(vm => modelId.includes(vm));
  }

  async processImage(params: ImageProcessParams, config: ProviderConfig): Promise<ImageProcessResult> {
    const startTime = Date.now();
    
    const client = this.getClient(config.apiKey, config.url);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an AI image editing assistant. You will receive an image and instructions on how to edit it. Describe the changes you would make.',
      },
    ];

    const userContent: Array<OpenAI.Chat.Completions.ChatCompletionContentPart> = [];
    
    if (params.imageBase64) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: params.imageBase64,
          detail: 'high',
        },
      });
    }

    if (params.maskBase64) {
      userContent.push({
        type: 'text',
        text: `[Mask provided - only edit the marked areas]`,
      });
    }

    userContent.push({
      type: 'text',
      text: params.prompt,
    });

    messages.push({
      role: 'user',
      content: userContent,
    });

    try {
      const response = await client.chat.completions.create({
        model: params.model,
        messages,
        max_tokens: 1000,
      });

      const processingTime = Date.now() - startTime;
      const cost = this.getCostEstimate(
        params.model,
        Buffer.from(params.imageBase64.split(',')[1] || '', 'base64').length
      );

      return {
        resultImageBase64: params.imageBase64,
        description: response.choices[0]?.message.content || 'No response',
        cost,
        processingTime,
      };
    } catch (error) {
      console.error('OpenAI image processing failed:', error);
      throw error;
    }
  }

  getCostEstimate(modelId: string, imageSize: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4-vision-preview': { input: 0.01, output: 0.03 },
    };

    const modelPricing = pricing[modelId] || pricing['gpt-4o'];
    const imageTokens = Math.ceil(imageSize / 1024);
    
    return (imageTokens / 1000) * modelPricing.input;
  }
}