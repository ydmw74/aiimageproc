import { Ollama } from 'ollama';
import type { ProviderType, ModelInfo, ImageProcessParams, ImageProcessResult, ProviderConfig } from '@/types';
import type { KIProvider } from './base';

export class OllamaProvider implements KIProvider {
  name: ProviderType = 'ollama';
  
  private client: Ollama | null = null;

  private getClient(url?: string): Ollama {
    const host = url || 'http://localhost:11434';
    
    if (!this.client || (this.client as any).host !== host) {
      this.client = new Ollama({ host });
    }
    
    return this.client;
  }

  async testConnection(config: ProviderConfig): Promise<boolean> {
    try {
      const client = this.getClient(config.url);
      const response = await client.list();
      return response.models.length > 0;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  async listAvailableModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const client = this.getClient(config.url);
      const response = await client.list();
      
      // Known vision-capable models
      const visionModels = [
        'llava',
        'llava-v1.6',
        'bakllava',
        'qwen-vl',
        'qwen2-vl',
        'moondream',
      ];
      
      return response.models.map(model => ({
        id: model.name,
        name: model.name,
        supportsVision: visionModels.some(vm => model.name.toLowerCase().includes(vm)),
        provider: this.name as ProviderType,
        contextWindow: (model.details as any)?.context_length || 4096,
        maxImageSize: undefined, // Local, no limit
        costPerImage: 0, // Free
      }));
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  async supportsVision(modelId: string, _config: ProviderConfig): Promise<boolean> {
    const visionModels = [
      'llava',
      'llava-v1.6',
      'bakllava',
      'qwen-vl',
      'qwen2-vl',
      'moondream',
    ];
    
    return visionModels.some(vm => modelId.toLowerCase().includes(vm));
  }

  async processImage(params: ImageProcessParams): Promise<ImageProcessResult> {
    const startTime = Date.now();
    
    const config = {
      url: params.provider === 'ollama' 
        ? (await this.getStoredUrl()) 
        : 'http://localhost:11434',
    };
    
    const client = this.getClient(config.url);

    // Prepare prompt
    let prompt = params.prompt;
    
    if (params.maskBase64) {
      prompt = `[Mask provided - only edit the marked areas]\n\n${params.prompt}`;
    }

    try {
      // Convert base64 to Uint8Array for Ollama
      const imageData = this.base64ToUint8Array(params.imageBase64);
      
      const response = await client.chat({
        model: params.model,
        messages: [
          {
            role: 'user',
            content: prompt,
            images: [imageData] as any,
          },
        ],
        stream: false,
      });

      const processingTime = Date.now() - startTime;
      const cost = 0; // Local models are free

      // For now, return original image - in future versions, we can process edits
      return {
        resultImageBase64: params.imageBase64,
        description: response.message?.content || 'No response',
        cost,
        processingTime,
      };
    } catch (error) {
      console.error('Ollama image processing failed:', error);
      throw error;
    }
  }

  getCostEstimate(_modelId: string, _imageSize: number): number {
    return 0; // Local models are free
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const base64Data = base64.split(',')[1] || base64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async getStoredUrl(): Promise<string | undefined> {
    if (window.electronAPI) {
      const result = await window.electronAPI.storageGet('ollama-url');
      if (result.success && result.value) {
        return result.value;
      }
    }
    return undefined;
  }
}
