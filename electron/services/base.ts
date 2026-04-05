import type { ProviderType, ModelInfo, ImageProcessParams, ImageProcessResult, ProviderConfig } from './types';

export interface ConnectionResult {
  connected: boolean;
  error?: string;
}

export interface KIProvider {
  name: ProviderType;

  testConnection(config: ProviderConfig): Promise<ConnectionResult>;
  listAvailableModels(config: ProviderConfig): Promise<ModelInfo[]>;
  supportsVision(modelId: string, config: ProviderConfig): Promise<boolean>;
  processImage(params: ImageProcessParams, config: ProviderConfig): Promise<ImageProcessResult>;
  getCostEstimate(modelId: string, imageSize: number): number;
}