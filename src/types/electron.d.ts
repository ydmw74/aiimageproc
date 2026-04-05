export interface ElectronAPI {
  // File Operations
  openFile: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  readFile: (filePath: string) => Promise<{ success: boolean; data?: Buffer; error?: string }>;
  saveFile: (filePath: string, data: Buffer) => Promise<{ success: boolean; error?: string }>;
  exportFile: (defaultPath: string, data: Buffer) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  
  // Storage (Sensitive)
  storageSet: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
  storageGet: (key: string) => Promise<{ success: boolean; value?: string; notFound?: boolean; error?: string }>;
  storageDelete: (key: string) => Promise<{ success: boolean; error?: string }>;
  
  // Database Operations
  dbCreateProject: (name: string) => Promise<{ success: boolean; id?: number; error?: string }>;
  dbGetProject: (id: number) => Promise<{ success: boolean; project?: any; error?: string }>;
  dbListProjects: (limit?: number) => Promise<{ success: boolean; projects?: any[]; error?: string }>;
  dbUpdateProject: (id: number, updates: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  dbDeleteProject: (id: number) => Promise<{ success: boolean; error?: string }>;
  dbAddEditHistory: (edit: Record<string, any>) => Promise<{ success: boolean; id?: number; error?: string }>;
  dbGetEditHistory: (projectId: number, limit?: number) => Promise<{ success: boolean; history?: any[]; error?: string }>;
  
  // App Info
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  
  // KI Provider Operations
  kiTestConnection: (config: Record<string, any>) => Promise<{ success: boolean; connected?: boolean; error?: string }>;
  kiListModels: (config: Record<string, any>) => Promise<{ success: boolean; models?: any[]; error?: string }>;
  kiCheckVisionCapability: (modelId: string, config: Record<string, any>) => Promise<{ success: boolean; supported?: boolean; message?: string; error?: string }>;
  kiProcessImage: (params: Record<string, any>, config: Record<string, any>) => Promise<{ success: boolean; resultImageBase64?: string; description?: string; cost?: number; processingTime?: number; error?: string }>;
  
  // Auto-update
  restart: () => Promise<void>;
  onUpdateAvailable: (callback: () => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
