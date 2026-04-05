// Provider Types
export type ProviderType = 'openai' | 'ollama' | 'ollama-cloud' | 'openrouter';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  url?: string; // API Base URL (for all providers)
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

// Image Processing
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

// Canvas & Masks
export interface Mask {
  id: string;
  type: 'brush' | 'rectangle' | 'ellipse' | 'polygon' | 'magic-wand';
  data: any; // Fabric.js object data
  color?: string;
  opacity?: number;
}

export interface ImageData {
  id: string;
  src: string; // Base64 or file path
  width: number;
  height: number;
  name?: string;
}

// App State
export interface AppState {
  // Current Project
  currentProjectId: string | null;
  originalImage: ImageData | null;
  resultImage: ImageData | null;
  masks: Mask[];
  
  // Undo/Redo
  undoStack: Array<{
    masks: Mask[];
    resultImage: ImageData | null;
  }>;
  redoStack: Array<{
    masks: Mask[];
    resultImage: ImageData | null;
  }>;
  
  // KI Settings
  selectedProvider: ProviderType;
  providerConfigs: Record<ProviderType, ProviderConfig>;
  availableModels: ModelInfo[];
  selectedModel: string | null;
  isProcessing: boolean;
  processingProgress: number;
  
  // Filter Settings
  brightness: number;
  contrast: number;
  saturation: number;
  autoPromptEnabled: boolean;
  
  // Tools
  activeTool: 'select' | 'brush' | 'rectangle' | 'ellipse' | 'polygon' | 'magic-wand' | 'eraser';
  brushSize: number;
  magicWandTolerance: number;
  
  // UI State
  activeTab: 'prompt' | 'settings' | 'filters' | 'usage';
  beforeAfterPosition: number; // 0-100
  zoom: number;
  
  // Usage Tracking
  apiUsage: {
    totalRequests: number;
    estimatedCost: number;
    lastReset: string;
  };
  budgetLimit: number;
  
  // App Info
  version: string;
  platform: string;
}

// Actions
export interface AppActions {
  // Project Management
  loadProject: (projectId: string) => void;
  saveProject: () => Promise<void>;
  exportProject: () => Promise<void>;
  
  // Image Operations
  loadImage: (file: File) => Promise<void>;
  setResultImage: (imageData: ImageData) => void;
  resetToOriginal: () => void;
  
  // Mask Operations
  addMask: (mask: Mask) => void;
  updateMask: (maskId: string, data: Partial<Mask>) => void;
  removeMask: (maskId: string) => void;
  clearMasks: () => void;
  
  // Undo/Redo
  pushState: () => void;
  undo: () => void;
  redo: () => void;
  
  // KI Operations
  setProvider: (provider: ProviderType) => void;
  updateProviderConfig: (provider: ProviderType, config: Partial<ProviderConfig>) => void;
  fetchAvailableModels: () => Promise<void>;
  setAvailableModels: (models: ModelInfo[]) => void;
  setSelectedModel: (model: string) => void;
  processImage: (prompt: string) => Promise<ImageProcessResult>;
  testConnection: () => Promise<boolean>;
  
  // Filter Operations
  setFilters: (filters: { brightness?: number; contrast?: number; saturation?: number }) => void;
  toggleAutoPrompt: () => void;
  generateAutoPrompt: () => string;
  
  // Tool Operations
  setActiveTool: (tool: AppState['activeTool']) => void;
  setBrushSize: (size: number) => void;
  setMagicWandTolerance: (tolerance: number) => void;
  
  // UI Operations
  setActiveTab: (tab: AppState['activeTab']) => void;
  setBeforeAfterPosition: (position: number) => void;
  setZoom: (zoom: number) => void;
  
  // Usage Tracking
  updateUsage: (cost: number) => void;
  setBudgetLimit: (limit: number) => void;
  resetUsage: () => void;
}
