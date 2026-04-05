import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';

export function ControlPanel() {
  const { 
    activeTab, 
    setActiveTab, 
    selectedProvider, 
    setProvider,
    providerConfigs,
    updateProviderConfig,
    availableModels,
    setAvailableModels,
    selectedModel,
    setSelectedModel,
    isProcessing,
    processingProgress,
    processImage,
    brightness,
    contrast,
    saturation,
    setFilters,
    autoPromptEnabled,
    toggleAutoPrompt,
    generateAutoPrompt,
    apiUsage,
    budgetLimit,
    setBudgetLimit,
    resetUsage,
  } = useAppStore();

  const [prompt, setPrompt] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(providerConfigs.openai.apiKey ?? '');
  const [openrouterApiKeyInput, setOpenrouterApiKeyInput] = useState(providerConfigs.openrouter.apiKey ?? '');
  const [ollamaCloudApiKeyInput, setOllamaCloudApiKeyInput] = useState(providerConfigs['ollama-cloud'].apiKey ?? '');
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
    vision: boolean | null;
    visionMessage?: string;
  } | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  // Sync local input state when store is hydrated from secure storage (App.tsx init)
  useEffect(() => {
    setApiKeyInput(providerConfigs.openai.apiKey ?? '');
  }, [providerConfigs.openai.apiKey]);

  useEffect(() => {
    setOpenrouterApiKeyInput(providerConfigs.openrouter.apiKey ?? '');
  }, [providerConfigs.openrouter.apiKey]);

  useEffect(() => {
    setOllamaCloudApiKeyInput(providerConfigs['ollama-cloud'].apiKey ?? '');
  }, [providerConfigs['ollama-cloud'].apiKey]);

  const STORAGE_KEYS: Record<string, string> = {
    'openai-apikey': 'openai-apikey',
    'openrouter-apikey': 'openrouter-apikey',
    'ollama-cloud-apikey': 'ollama-cloud-apikey',
    'ollama-url': 'ollama-url',
    'ollama-cloud-url': 'ollama-cloud-url',
  };

  const handleApiKeyChange = async (provider: 'openai' | 'openrouter' | 'ollama-cloud', value: string) => {
    if (provider === 'openai') {
      setApiKeyInput(value);
    } else if (provider === 'openrouter') {
      setOpenrouterApiKeyInput(value);
    } else {
      setOllamaCloudApiKeyInput(value);
    }
    updateProviderConfig(provider, { apiKey: value });
    if (window.electronAPI) {
      const storageKey = provider === 'openai' ? STORAGE_KEYS['openai-apikey']
        : provider === 'openrouter' ? STORAGE_KEYS['openrouter-apikey']
        : STORAGE_KEYS['ollama-cloud-apikey'];
      await window.electronAPI.storageSet(storageKey, value);
    }
  };

  const handleUrlChange = async (provider: 'openai' | 'openrouter' | 'ollama' | 'ollama-cloud', value: string) => {
    updateProviderConfig(provider, { url: value });
    if (window.electronAPI) {
      const storageKey = provider === 'ollama' ? STORAGE_KEYS['ollama-url']
        : provider === 'ollama-cloud' ? STORAGE_KEYS['ollama-cloud-url']
        : null;
      if (storageKey) {
        await window.electronAPI.storageSet(storageKey, value);
      }
    }
  };

  const handleApply = async () => {
    setProcessError(null);
    try {
      await processImage(prompt);
    } catch (error) {
      console.error('Image processing failed:', error);
      setProcessError(error instanceof Error ? error.message : 'Image processing failed. Please try again.');
    }
  };

  const handleTestConnection = async () => {
    const config = providerConfigs[selectedProvider];
    setConnectionTesting(true);
    setConnectionResult(null);

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.kiTestConnection(config, selectedModel || undefined);

      if (!result.success || !result.connected) {
        setConnectionResult({
          success: false,
          message: result.connectionError || 'Connection failed.',
          vision: null,
        });
        return;
      }

      // Populate model suggestions from returned models
      if (result.availableModels?.length > 0) {
        setAvailableModels(result.availableModels);
      }

      setConnectionResult({
        success: true,
        message: 'Connected successfully.',
        vision: result.visionSupported ?? null,
        visionMessage: result.visionMessage,
      });
    } catch (error) {
      setConnectionResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed.',
        vision: null,
      });
    } finally {
      setConnectionTesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'prompt' ? 'active' : ''}`}
          onClick={() => setActiveTab('prompt')}
        >
          Prompt
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`tab ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => setActiveTab('filters')}
        >
          Filters
        </button>
        <button
          className={`tab ${activeTab === 'usage' ? 'active' : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          Usage
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {activeTab === 'prompt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Processing Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to do with the image..."
                rows={6}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Quick Presets
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  className="secondary"
                  onClick={() => setPrompt('Remove the selected object seamlessly')}
                >
                  Remove Object
                </button>
                <button
                  className="secondary"
                  onClick={() => setPrompt('Change background to a neutral gray')}
                >
                  Change Background
                </button>
                <button
                  className="secondary"
                  onClick={() => setPrompt('Enhance colors and contrast')}
                >
                  Enhance Colors
                </button>
                <button
                  className="secondary"
                  onClick={() => setPrompt('Convert to black and white with high contrast')}
                >
                  B&W Convert
                </button>
              </div>
            </div>

            <button
              onClick={handleApply}
              disabled={isProcessing || !prompt}
              className="primary"
              style={{ marginTop: 8 }}
            >
              {isProcessing ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="spinner" style={{ width: 16, height: 16 }} />
                  Processing... {processingProgress}%
                </span>
              ) : (
                'Apply'
              )}
            </button>

            {processError && (
              <div style={{
                marginTop: 8,
                padding: '10px 12px',
                borderRadius: 4,
                backgroundColor: 'var(--error)',
                color: 'white',
                fontSize: 13,
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}>
                {processError}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Provider selector */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => { setProvider(e.target.value as any); setConnectionResult(null); }}
                style={{ width: '100%' }}
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="ollama-cloud">Ollama Cloud</option>
                <option value="openai">OpenAI API</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>

            {/* Endpoint URL — always shown, provider-specific default */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Endpoint URL</label>
              <input
                type="text"
                value={providerConfigs[selectedProvider].url || ''}
                onChange={(e) => handleUrlChange(selectedProvider, e.target.value)}
                placeholder={
                  selectedProvider === 'openai' ? 'https://api.openai.com/v1'
                  : selectedProvider === 'openrouter' ? 'https://openrouter.ai/api/v1'
                  : selectedProvider === 'ollama-cloud' ? 'https://api.ollama.ai/v1'
                  : 'http://localhost:11434'
                }
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {selectedProvider === 'openai' && 'Compatible with any OpenAI-API endpoint (e.g. LM Studio, LocalAI)'}
                {selectedProvider === 'openrouter' && 'openrouter.ai/api/v1 — see openrouter.ai for model IDs'}
                {selectedProvider === 'ollama-cloud' && 'Custom Ollama Cloud or self-hosted compatible endpoint'}
                {selectedProvider === 'ollama' && 'Local Ollama server — must be running'}
              </span>
            </div>

            {/* API Key — always shown; Ollama local can leave empty */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                API Key{selectedProvider === 'ollama' ? ' (optional)' : ''}
              </label>
              <input
                type="password"
                value={
                  selectedProvider === 'openai' ? apiKeyInput
                  : selectedProvider === 'openrouter' ? openrouterApiKeyInput
                  : selectedProvider === 'ollama-cloud' ? ollamaCloudApiKeyInput
                  : ''
                }
                onChange={(e) => {
                  if (selectedProvider === 'openai') handleApiKeyChange('openai', e.target.value);
                  else if (selectedProvider === 'openrouter') handleApiKeyChange('openrouter', e.target.value);
                  else if (selectedProvider === 'ollama-cloud') handleApiKeyChange('ollama-cloud', e.target.value);
                }}
                placeholder={
                  selectedProvider === 'openai' ? 'sk-...'
                  : selectedProvider === 'openrouter' ? 'sk-or-...'
                  : selectedProvider === 'ollama-cloud' ? 'Your Ollama Cloud key'
                  : 'No key required for local Ollama'
                }
                disabled={selectedProvider === 'ollama'}
                style={{ width: '100%' }}
              />
            </div>

            {/* Model — free text input with datalist suggestions */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Model</label>
              <input
                type="text"
                list="model-suggestions"
                value={selectedModel || ''}
                onChange={(e) => setSelectedModel(e.target.value)}
                placeholder={
                  selectedProvider === 'openai' ? 'gpt-4o'
                  : selectedProvider === 'openrouter' ? 'openai/gpt-4o'
                  : selectedProvider === 'ollama-cloud' ? 'llava'
                  : 'llava'
                }
                style={{ width: '100%' }}
              />
              <datalist id="model-suggestions">
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id} label={m.supportsVision ? `${m.name} (vision)` : m.name} />
                ))}
                {availableModels.length === 0 && selectedProvider === 'openai' && (
                  <>
                    <option value="gpt-4o" label="GPT-4o (vision)" />
                    <option value="gpt-4o-mini" label="GPT-4o Mini (vision)" />
                    <option value="gpt-4-turbo" label="GPT-4 Turbo (vision)" />
                  </>
                )}
                {availableModels.length === 0 && selectedProvider === 'openrouter' && (
                  <>
                    <option value="openai/gpt-4o" label="GPT-4o (vision)" />
                    <option value="anthropic/claude-3-5-sonnet" label="Claude 3.5 Sonnet (vision)" />
                    <option value="google/gemini-flash-1.5" label="Gemini Flash 1.5 (vision)" />
                  </>
                )}
                {availableModels.length === 0 && (selectedProvider === 'ollama' || selectedProvider === 'ollama-cloud') && (
                  <>
                    <option value="llava" label="LLaVA (vision)" />
                    <option value="llava-v1.6" label="LLaVA 1.6 (vision)" />
                    <option value="qwen2-vl" label="Qwen2-VL (vision)" />
                    <option value="bakllava" label="BakLLaVA (vision)" />
                    <option value="moondream" label="Moondream (vision)" />
                  </>
                )}
              </datalist>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Enter the model ID exactly as shown on the provider website. Click "Test Connection" to check vision support.
              </span>
            </div>

            {/* Test Connection */}
            <button
              onClick={handleTestConnection}
              className="secondary"
              disabled={connectionTesting}
            >
              {connectionTesting ? 'Testing...' : 'Test Connection'}
            </button>

            {/* Connection result */}
            {connectionResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 4,
                  backgroundColor: connectionResult.success ? 'var(--success)' : 'var(--error)',
                  color: 'white',
                  fontSize: 13,
                }}>
                  {connectionResult.success ? 'Connected' : 'Failed'}: {connectionResult.message}
                </div>
                {connectionResult.success && connectionResult.vision !== null && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 4,
                    backgroundColor: connectionResult.vision ? 'var(--success)' : 'var(--warning, #f59e0b)',
                    color: 'white',
                    fontSize: 13,
                  }}>
                    Vision: {connectionResult.visionMessage}
                  </div>
                )}
                {connectionResult.success && connectionResult.vision === null && selectedModel && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Vision capability not checked — no model entered.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'filters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontWeight: 500 }}>Auto-Prompt from Filters</label>
              <input
                type="checkbox"
                checked={autoPromptEnabled}
                onChange={toggleAutoPrompt}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label>Brightness</label>
                <span>{brightness > 0 ? '+' : ''}{brightness}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={brightness}
                onChange={(e) => setFilters({ brightness: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label>Contrast</label>
                <span>{contrast > 0 ? '+' : ''}{contrast}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={contrast}
                onChange={(e) => setFilters({ contrast: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label>Saturation</label>
                <span>{saturation > 0 ? '+' : ''}{saturation}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={saturation}
                onChange={(e) => setFilters({ saturation: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            {autoPromptEnabled && (
              <div style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: 12,
                borderRadius: 4,
                fontSize: 13,
              }}>
                <strong>Generated Prompt:</strong>
                <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
                  {generateAutoPrompt() || 'No adjustments made'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'usage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ marginBottom: 8 }}>API Usage</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Total Requests:</span>
                <span>{apiUsage.totalRequests}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Estimated Cost:</span>
                <span>${apiUsage.estimatedCost.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Last Reset:</span>
                <span>{new Date(apiUsage.lastReset).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Budget Limit ($)
              </label>
              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(Number(e.target.value))}
                min="0"
                step="1"
                style={{ width: '100%' }}
              />
              {apiUsage.estimatedCost >= budgetLimit * 0.8 && (
                <p style={{
                  marginTop: 8,
                  color: 'var(--warning)',
                  fontSize: 13,
                }}>
                  ⚠️ You've used {((apiUsage.estimatedCost / budgetLimit) * 100).toFixed(0)}% of your budget
                </p>
              )}
            </div>

            <button className="secondary" onClick={resetUsage}>
              Reset Usage Statistics
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
