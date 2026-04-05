export type ProviderType = 'openai' | 'ollama' | 'ollama-cloud' | 'openrouter';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  url?: string; // API Base URL (customizable for all providers)
  model?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  supportsVision: boolean;
  provider: ProviderType;
  contextWindow?: number;
  maxImageSize?: number;
  costPerImage?: number;
}

export interface ImageProcessParams {
  imageBase64: string;
  maskBase64?: string;
  prompt: string;
  provider: ProviderType;
  model: string;
}

export interface ImageProcessResult {
  resultImageBase64: string;
  description?: string;
  cost?: number;
  processingTime?: number;
}
