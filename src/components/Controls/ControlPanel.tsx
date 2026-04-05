import { useState } from 'react';
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
  } = useAppStore();

  const [prompt, setPrompt] = useState('');

  const handleApply = async () => {
    await processImage(prompt);
  };

  const handleTestConnection = async () => {
    // TODO: Implement actual test
    alert('Connection test not yet implemented');
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
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                KI Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setProvider(e.target.value as any)}
                style={{ width: '100%' }}
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI API</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>

            {selectedProvider === 'openai' && (
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={providerConfigs.openai.apiKey || ''}
                  onChange={(e) => updateProviderConfig('openai', { apiKey: e.target.value })}
                  placeholder="sk-..."
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {selectedProvider === 'openrouter' && (
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={providerConfigs.openrouter.apiKey || ''}
                  onChange={(e) => updateProviderConfig('openrouter', { apiKey: e.target.value })}
                  placeholder="sk-or-..."
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {selectedProvider === 'ollama' && (
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Server URL
                </label>
                <input
                  type="text"
                  value={providerConfigs.ollama.url}
                  onChange={(e) => updateProviderConfig('ollama', { url: e.target.value })}
                  placeholder="http://localhost:11434"
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Model
              </label>
              <select
                value={selectedModel || ''}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ width: '100%' }}
              >
                {availableModels.length > 0 ? (
                  availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.supportsVision ? '👁️' : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="llava">LLaVA (Vision)</option>
                    <option value="qwen-vl">Qwen-VL (Vision)</option>
                    <option value="bakllava">BakLLaVA (Vision)</option>
                  </>
                )}
              </select>
            </div>

            <button onClick={handleTestConnection} className="secondary">
              Test Connection
            </button>
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

            <button className="secondary">
              Reset Usage Statistics
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
