import type { ProviderType, ModelInfo, ImageProcessParams, ImageProcessResult, ProviderConfig } from '@/types';

export interface KIProvider {
  name: ProviderType;
  
  testConnection(config: ProviderConfig): Promise<boolean>;
  listAvailableModels(config: ProviderConfig): Promise<ModelInfo[]>;
  supportsVision(modelId: string, config: ProviderConfig): Promise<boolean>;
  processImage(params: ImageProcessParams): Promise<ImageProcessResult>;
  getCostEstimate(modelId: string, imageSize: number): number;
}
