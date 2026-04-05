import { contextBridge, ipcRenderer } from 'electron';

// Expose IPC channels to renderer
export const electronAPI = {
  // File Operations
  openFile: () => ipcRenderer.invoke('file:open'),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', { filePath }),
  saveFile: (filePath: string, data: Buffer) => ipcRenderer.invoke('file:save', { filePath, data }),
  exportFile: (defaultPath: string, data: Buffer) => 
    ipcRenderer.invoke('file:export', { defaultPath, data }),
  
  // Storage (Sensitive)
  storageSet: (key: string, value: string) => ipcRenderer.invoke('storage:set', { key, value }),
  storageGet: (key: string) => ipcRenderer.invoke('storage:get', { key }),
  storageDelete: (key: string) => ipcRenderer.invoke('storage:delete', { key }),
  
  // Database Operations
  dbCreateProject: (name: string) => ipcRenderer.invoke('db:createProject', { name }),
  dbGetProject: (id: number) => ipcRenderer.invoke('db:getProject', { id }),
  dbListProjects: (limit?: number) => ipcRenderer.invoke('db:listProjects', { limit }),
  dbUpdateProject: (id: number, updates: Record<string, any>) => 
    ipcRenderer.invoke('db:updateProject', { id, updates }),
  dbDeleteProject: (id: number) => ipcRenderer.invoke('db:deleteProject', { id }),
  dbAddEditHistory: (edit: Record<string, any>) => ipcRenderer.invoke('db:addEditHistory', { edit }),
  dbGetEditHistory: (projectId: number, limit?: number) => 
    ipcRenderer.invoke('db:getEditHistory', { projectId, limit }),
  
  // App Info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  
  // KI Provider Operations
  kiTestConnection: (config: Record<string, any>, modelId?: string) =>
    ipcRenderer.invoke('ki:testConnection', { config, modelId }),
  kiListModels: (config: Record<string, any>) => 
    ipcRenderer.invoke('ki:listModels', { config }),
  kiCheckVisionCapability: (modelId: string, config: Record<string, any>) => 
    ipcRenderer.invoke('ki:checkVisionCapability', { modelId, config }),
  kiProcessImage: (params: Record<string, any>, config: Record<string, any>) => 
    ipcRenderer.invoke('ki:processImage', { params, config }),
  
  // Auto-update
  restart: () => ipcRenderer.invoke('app:restart'),
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update-available', callback);
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', callback);
  },
};

// Expose to window
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration
export type ElectronAPI = typeof electronAPI;
