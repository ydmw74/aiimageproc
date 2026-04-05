import { Ollama } from 'ollama';
import type { ProviderType, ModelInfo, ImageProcessParams, ImageProcessResult, ProviderConfig } from './types.js';
import type { KIProvider, ConnectionResult } from './base.js';

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

  async testConnection(config: ProviderConfig): Promise<ConnectionResult> {
    const host = config.url || 'http://localhost:11434';
    try {
      const client = this.getClient(config.url);
      const response = await client.list();
      if (response.models.length === 0) {
        return { connected: true, error: 'Connected, but no models installed. Run "ollama pull <model>" first.' };
      }
      return { connected: true };
    } catch (error: any) {
      if (error?.cause?.code === 'ECONNREFUSED') {
        return { connected: false, error: `Cannot reach Ollama at ${host}. Is Ollama running?` };
      }
      return { connected: false, error: error?.message || 'Connection failed.' };
    }
  }

  async listAvailableModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const client = this.getClient(config.url);
      const response = await client.list();
      
      return response.models.map(model => ({
        id: model.name,
        name: model.name,
        supportsVision: this.isVisionModel(model.name),
        provider: this.name as ProviderType,
        contextWindow: (model.details as any)?.context_length || 4096,
        maxImageSize: undefined,
        costPerImage: 0,
      }));
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  private isVisionModel(modelId: string): boolean {
    const id = modelId.toLowerCase().split(':')[0]; // strip tag: "qwen3-vl:235b-instruct-cloud" → "qwen3-vl"
    const visionPrefixes = ['llava', 'bakllava', 'moondream', 'minicpm-v', 'llava-phi', 'granite3-vision', 'smolvlm'];
    const hasVlSuffix = id.endsWith('-vl') || id.endsWith('vl'); // qwen3-vl, qwen2-vl, qwen-vl, ...
    const hasVisionWord = id.includes('vision');
    return hasVlSuffix || hasVisionWord || visionPrefixes.some(p => id.includes(p));
  }

  async supportsVision(modelId: string, _config: ProviderConfig): Promise<boolean> {
    return this.isVisionModel(modelId);
  }

  async processImage(params: ImageProcessParams, config: ProviderConfig): Promise<ImageProcessResult> {
    const startTime = Date.now();
    
    const client = this.getClient(config.url);

    let prompt = params.prompt;
    
    if (params.maskBase64) {
      prompt = `[Mask provided - only edit the marked areas]\n\n${params.prompt}`;
    }

    try {
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
      const cost = 0;

      return {
        resultImageBase64: params.imageBase64,
        description: response.message?.content || 'No response',
        cost,
        processingTime,
      };
    } catch (error) {
      console.error('Ollama image processing failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('does not support image input') || message.includes('image input')) {
        throw new Error(`Model "${params.model}" does not support image input. Please select a vision model (llava, qwen-vl, bakllava) in Settings.`);
      }
      if (message.includes('model') && message.includes('not found')) {
        throw new Error(`Model "${params.model}" is not installed. Run: ollama pull ${params.model}`);
      }
      if (message.includes('404') || (error as any)?.status === 404) {
        throw new Error(`Model "${params.model}" not found on Ollama server (404). Run: ollama pull ${params.model}`);
      }
      throw new Error(`Ollama error: ${message}`);
    }
  }

  getCostEstimate(_modelId: string, _imageSize: number): number {
    return 0;
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
}