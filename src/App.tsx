import { useState, useEffect } from 'react';
import { Header } from './components/Header/Header';
import { Toolbar } from './components/Header/Toolbar';
import { CanvasEditor } from './components/Canvas/CanvasEditor';
import { BeforeAfterSlider } from './components/Viewer/BeforeAfterSlider';
import { ControlPanel } from './components/Controls/ControlPanel';
import { StatusBar } from './components/StatusBar/StatusBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './store/appStore';

function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const updateProviderConfig = useAppStore(s => s.updateProviderConfig);

  useEffect(() => {
    const init = async () => {
      if (window.electronAPI) {
        await window.electronAPI.getPlatform();

        // Restore encrypted API keys and provider URLs from secure storage
        const storageKeys: Array<{ key: string; provider: 'openai' | 'openrouter' | 'ollama' | 'ollama-cloud'; field: string }> = [
          { key: 'openai-apikey', provider: 'openai', field: 'apiKey' },
          { key: 'openrouter-apikey', provider: 'openrouter', field: 'apiKey' },
          { key: 'ollama-cloud-apikey', provider: 'ollama-cloud', field: 'apiKey' },
          { key: 'ollama-url', provider: 'ollama', field: 'url' },
          { key: 'ollama-cloud-url', provider: 'ollama-cloud', field: 'url' },
        ];

        for (const { key, provider, field } of storageKeys) {
          const result = await window.electronAPI.storageGet(key);
          if (result.success && result.value) {
            updateProviderConfig(provider, { [field]: result.value });
          }
        }
      }

      setIsLoaded(true);
    };

    init();
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Header>
          <Toolbar />
        </Header>
        
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, minWidth: 400, borderRight: '1px solid var(--border)' }}>
            <ErrorBoundary>
              <CanvasEditor />
            </ErrorBoundary>
          </div>
          
          <div style={{ width: 300, borderRight: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <BeforeAfterSlider />
          </div>
          
          <div style={{ width: 350, backgroundColor: 'var(--bg-secondary)' }}>
            <ControlPanel />
          </div>
        </div>
        
        <StatusBar />
      </div>
    </ErrorBoundary>
  );
}

export default App;
