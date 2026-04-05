import OpenAI from 'openai';
import type { ProviderType, ModelInfo, ImageProcessParams, ImageProcessResult, ProviderConfig } from '@/types';
import type { KIProvider } from './base';

export class OpenAIProvider implements KIProvider {
  name: ProviderType = 'openai';
  
  private client: OpenAI | null = null;

  private getClient(apiKey?: string): OpenAI {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    if (!this.client) {
      this.client = new OpenAI({ apiKey });
    }
    
    return this.client;
  }

  async testConnection(config: ProviderConfig): Promise<boolean> {
    try {
      const client = this.getClient(config.apiKey);
      const models = await client.models.list();
      return models.data.length > 0;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  async listAvailableModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const client = this.getClient(config.apiKey);
      const models = await client.models.list();
      
      // Filter for vision-capable models
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
          maxImageSize: 20 * 1024 * 1024, // 20MB
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

  async processImage(params: ImageProcessParams): Promise<ImageProcessResult> {
    const startTime = Date.now();
    
    const config = {
      apiKey: params.provider === 'openai' 
        ? (await this.getStoredApiKey()) 
        : undefined,
    };
    
    const client = this.getClient(config.apiKey);

    // Prepare messages with image
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an AI image editing assistant. You will receive an image and instructions on how to edit it. Describe the changes you would make or provide the edited image if capable.',
      },
    ];

    // Add user message with image and prompt
    const userContent: Array<OpenAI.Chat.Completions.ChatCompletionContentPart> = [];
    
    // Add image
    if (params.imageBase64) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: params.imageBase64,
          detail: 'high',
        },
      });
    }

    // Add mask if provided
    if (params.maskBase64) {
      userContent.push({
        type: 'text',
        text: `[Mask provided - only edit the marked areas]`,
      });
    }

    // Add prompt
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

      // For now, return description - in future versions, we can use DALL-E for actual edits
      return {
        resultImageBase64: params.imageBase64, // Return original for now
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
    // Approximate pricing (per 1K tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4-vision-preview': { input: 0.01, output: 0.03 },
    };

    const modelPricing = pricing[modelId] || pricing['gpt-4o'];
    
    // Estimate tokens from image size (rough approximation)
    const imageTokens = Math.ceil(imageSize / 1024);
    
    return (imageTokens / 1000) * modelPricing.input;
  }

  private async getStoredApiKey(): Promise<string> {
    if (window.electronAPI) {
      const result = await window.electronAPI.storageGet('openai-apikey');
      if (result.success && result.value) {
        return result.value;
      }
    }
    throw new Error('OpenAI API key not found');
  }
}
