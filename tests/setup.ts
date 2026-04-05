import '@testing-library/jest-dom';

// Mock electron API
global.window.electronAPI = {
  openFile: jest.fn(),
  saveFile: jest.fn(),
  exportFile: jest.fn(),
  storageSet: jest.fn(),
  storageGet: jest.fn(),
  storageDelete: jest.fn(),
  dbCreateProject: jest.fn(),
  dbGetProject: jest.fn(),
  dbListProjects: jest.fn(),
  dbUpdateProject: jest.fn(),
  dbDeleteProject: jest.fn(),
  dbAddEditHistory: jest.fn(),
  dbGetEditHistory: jest.fn(),
  getVersion: jest.fn(),
  getPlatform: jest.fn(),
  restart: jest.fn(),
  onUpdateAvailable: jest.fn(),
  onUpdateDownloaded: jest.fn(),
};

// Mock canvas API
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  drawImage: jest.fn(),
  fillRect: jest.fn(),
  clearRect: jest.fn(),
}));

global.HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,test');
