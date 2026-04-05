import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { AppState, AppActions, ProviderType, Mask, ImageData, ProviderConfig } from '@/types';
import { kiProviderRouter } from '@/services/providers/router';
import { generatePromptFromFilters, getMaskedPrompt } from '@/services/prompts';

type AppStore = AppState & AppActions;

const initialState: AppState = {
  // Current Project
  currentProjectId: null,
  originalImage: null,
  resultImage: null,
  masks: [],
  
  // Undo/Redo
  undoStack: [],
  redoStack: [],
  
  // KI Settings
  selectedProvider: 'ollama',
  providerConfigs: {
    openai: { type: 'openai', apiKey: undefined, model: 'gpt-4o' },
    ollama: { type: 'ollama', url: 'http://localhost:11434', model: 'llava' },
    openrouter: { type: 'openrouter', apiKey: undefined, model: 'openai/gpt-4o' },
  },
  availableModels: [],
  selectedModel: 'llava',
  isProcessing: false,
  processingProgress: 0,
  
  // Filter Settings
  brightness: 0,
  contrast: 0,
  saturation: 0,
  autoPromptEnabled: true,
  
  // Tools
  activeTool: 'select',
  brushSize: 20,
  magicWandTolerance: 30,
  
  // UI State
  activeTab: 'prompt',
  beforeAfterPosition: 50,
  zoom: 1,
  
  // Usage Tracking
  apiUsage: {
    totalRequests: 0,
    estimatedCost: 0,
    lastReset: new Date().toISOString(),
  },
  budgetLimit: 10,
  
  // App Info
  version: '0.1.0',
  platform: 'unknown',
};

export const useAppStore = create<AppStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      
      // Project Management
      loadProject: (projectId: string) => {
        // TODO: Load from SQLite
        console.log('Loading project:', projectId);
      },
      
      saveProject: async () => {
        // TODO: Save to SQLite
        console.log('Saving project...');
      },
      
      exportProject: async () => {
        // TODO: Export to ZIP
        console.log('Exporting project...');
      },
      
      // Image Operations
      loadImage: async (file: File) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              set({
                originalImage: {
                  id: crypto.randomUUID(),
                  src: e.target?.result as string,
                  width: img.width,
                  height: img.height,
                  name: file.name,
                },
                resultImage: null,
                masks: [],
                undoStack: [],
                redoStack: [],
              });
              resolve();
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      },
      
      setResultImage: (imageData: ImageData) => {
        set({ resultImage: imageData });
      },
      
      resetToOriginal: () => {
        set({ resultImage: null });
      },
      
      // Mask Operations
      addMask: (mask: Mask) => {
        get().pushState();
        set((state) => ({ masks: [...state.masks, mask] }));
      },
      
      updateMask: (maskId: string, data: Partial<Mask>) => {
        set((state) => ({
          masks: state.masks.map((m) =>
            m.id === maskId ? { ...m, ...data } : m
          ),
        }));
      },
      
      removeMask: (maskId: string) => {
        get().pushState();
        set((state) => ({
          masks: state.masks.filter((m) => m.id !== maskId),
        }));
      },
      
      clearMasks: () => {
        get().pushState();
        set({ masks: [] });
      },
      
      // Undo/Redo
      pushState: () => {
        const { masks, resultImage } = get();
        set((state) => ({
          undoStack: [...state.undoStack, { masks: [...masks], resultImage }],
          redoStack: [],
        }));
      },
      
      undo: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return;
        
        const previousState = undoStack[undoStack.length - 1];
        const currentState = { masks: get().masks, resultImage: get().resultImage };
        
        set({
          masks: previousState.masks,
          resultImage: previousState.resultImage,
          undoStack: undoStack.slice(0, -1),
          redoStack: [...get().redoStack, currentState],
        });
      },
      
      redo: () => {
        const { redoStack } = get();
        if (redoStack.length === 0) return;
        
        const nextState = redoStack[redoStack.length - 1];
        const currentState = { masks: get().masks, resultImage: get().resultImage };
        
        set({
          masks: nextState.masks,
          resultImage: nextState.resultImage,
          undoStack: [...get().undoStack, currentState],
          redoStack: redoStack.slice(0, -1),
        });
      },
      
      // KI Operations
      setProvider: (provider: ProviderType) => {
        set({ selectedProvider: provider });
      },
      
      updateProviderConfig: (provider: ProviderType, config: Partial<ProviderConfig>) => {
        set((state) => ({
          providerConfigs: {
            ...state.providerConfigs,
            [provider]: { ...state.providerConfigs[provider], ...config },
          },
        }));
      },
      
      fetchAvailableModels: async () => {
        // TODO: Fetch from actual provider
        set({ availableModels: [] });
      },
      
      setSelectedModel: (model: string) => {
        set({ selectedModel: model });
      },
      
      processImage: async (prompt: string) => {
        const state = get();
        
        if (!state.originalImage) {
          throw new Error('No image loaded');
        }
        
        set({ isProcessing: true, processingProgress: 0 });
        
        try {
          // Generate prompt from filters if enabled
          let finalPrompt = prompt;
          if (state.autoPromptEnabled && (state.brightness !== 0 || state.contrast !== 0 || state.saturation !== 0)) {
            const filterPrompt = generatePromptFromFilters(
              state.brightness,
              state.contrast,
              state.saturation
            );
            finalPrompt = prompt ? `${prompt}. ${filterPrompt}` : filterPrompt;
          }
          
          // Add mask instruction if masks exist
          if (state.masks.length > 0) {
            finalPrompt = getMaskedPrompt(finalPrompt);
          }
          
          // Extract mask from canvas (if any masks exist)
          let maskBase64: string | undefined = undefined;
          if (state.masks.length > 0) {
            // In a real implementation, we'd extract from the Fabric.js canvas
            // For now, we'll skip mask extraction
            console.log('Masks present but extraction not yet implemented');
          }
          
          // Get provider config
          const providerConfig = state.providerConfigs[state.selectedProvider];
          
          // Check vision capability
          const visionCheck = await kiProviderRouter.checkVisionCapability(
            state.selectedModel || providerConfig.model || '',
            providerConfig
          );
          
          if (!visionCheck.supported) {
            throw new Error(visionCheck.message);
          }
          
          set({ processingProgress: 20 });
          
          // Process image
          const result = await kiProviderRouter.processImage({
            imageBase64: state.originalImage.src,
            maskBase64,
            prompt: finalPrompt,
            provider: state.selectedProvider,
            model: state.selectedModel || providerConfig.model || '',
          });
          
          set({ processingProgress: 80 });
          
          // Update usage
          if (result.cost && result.cost > 0) {
            get().updateUsage(result.cost);
          }
          
          // Set result image (for now, same as original - actual edits coming later)
          if (result.resultImageBase64) {
            set({
              resultImage: {
                ...state.originalImage,
                src: result.resultImageBase64,
              },
            });
          }
          
          set({ isProcessing: false, processingProgress: 100 });
          
          return result;
        } catch (error) {
          set({ isProcessing: false, processingProgress: 0 });
          throw error;
        }
      },
      
      testConnection: async () => {
        const state = get();
        const providerConfig = state.providerConfigs[state.selectedProvider];
        
        try {
          const connected = await kiProviderRouter.testConnection(providerConfig);
          
          if (connected) {
            // Fetch available models
            const models = await kiProviderRouter.listAvailableModels(providerConfig);
            set({ availableModels: models });
            
            // Auto-select first vision-capable model if none selected
            if (!state.selectedModel && models.length > 0) {
              const visionModel = models.find(m => m.supportsVision) || models[0];
              set({ selectedModel: visionModel.id });
            }
          }
          
          return connected;
        } catch (error) {
          console.error('Connection test failed:', error);
          return false;
        }
      },
      
      // Filter Operations
      setFilters: (filters) => {
        set((state) => ({
          brightness: filters.brightness ?? state.brightness,
          contrast: filters.contrast ?? state.contrast,
          saturation: filters.saturation ?? state.saturation,
        }));
      },
      
      toggleAutoPrompt: () => {
        set((state) => ({ autoPromptEnabled: !state.autoPromptEnabled }));
      },
      
      generateAutoPrompt: () => {
        const { brightness, contrast, saturation } = get();
        const parts: string[] = [];
        
        if (brightness > 0) parts.push(`Increase brightness by ${brightness}%`);
        if (brightness < 0) parts.push(`Decrease brightness by ${Math.abs(brightness)}%`);
        if (contrast > 0) parts.push(`Increase contrast by ${contrast}%`);
        if (contrast < 0) parts.push(`Decrease contrast by ${Math.abs(contrast)}%`);
        if (saturation > 0) parts.push(`Increase saturation by ${saturation}%`);
        if (saturation < 0) parts.push(`Decrease saturation by ${Math.abs(saturation)}%`);
        
        return parts.join('. ') || 'Apply subtle improvements';
      },
      
      // Tool Operations
      setActiveTool: (tool) => {
        set({ activeTool: tool });
      },
      
      setBrushSize: (size) => {
        set({ brushSize: size });
      },
      
      setMagicWandTolerance: (tolerance) => {
        set({ magicWandTolerance: tolerance });
      },
      
      // UI Operations
      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },
      
      setBeforeAfterPosition: (position) => {
        set({ beforeAfterPosition: Math.max(0, Math.min(100, position)) });
      },
      
      setZoom: (zoom) => {
        set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
      },
      
      // Usage Tracking
      updateUsage: (cost: number) => {
        set((state) => ({
          apiUsage: {
            ...state.apiUsage,
            totalRequests: state.apiUsage.totalRequests + 1,
            estimatedCost: state.apiUsage.estimatedCost + cost,
          },
        }));
      },
      
      setBudgetLimit: (limit) => {
        set({ budgetLimit: limit });
      },
      
      resetUsage: () => {
        set({
          apiUsage: {
            totalRequests: 0,
            estimatedCost: 0,
            lastReset: new Date().toISOString(),
          },
        });
      },
    })),
    {
      name: 'aiimageproc-storage',
      partialize: (state) => ({
        selectedProvider: state.selectedProvider,
        selectedModel: state.selectedModel,
        brushSize: state.brushSize,
        magicWandTolerance: state.magicWandTolerance,
        budgetLimit: state.budgetLimit,
      }),
    }
  )
);
