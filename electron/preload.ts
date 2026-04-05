import { contextBridge, ipcRenderer } from 'electron';

// Expose IPC channels to renderer
export const electronAPI = {
  // File Operations
  openFile: () => ipcRenderer.invoke('file:open'),
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
