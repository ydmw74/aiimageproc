import { useState, useEffect } from 'react';
import { Header } from './components/Header/Header';
import { Toolbar } from './components/Header/Toolbar';
import { CanvasEditor } from './components/Canvas/CanvasEditor';
import { BeforeAfterSlider } from './components/Viewer/BeforeAfterSlider';
import { ControlPanel } from './components/Controls/ControlPanel';
import { StatusBar } from './components/StatusBar/StatusBar';

function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initialize app
    const init = async () => {
      // Get platform info
      if (window.electronAPI) {
        const platformInfo = await window.electronAPI.getPlatform();
        console.log('Running on platform:', platformInfo);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header>
        <Toolbar />
      </Header>
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Canvas Editor */}
        <div style={{ flex: 1, minWidth: 400, borderRight: '1px solid var(--border)' }}>
          <CanvasEditor />
        </div>
        
        {/* Center: Before/After Slider */}
        <div style={{ width: 300, borderRight: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <BeforeAfterSlider />
        </div>
        
        {/* Right: Control Panel */}
        <div style={{ width: 350, backgroundColor: 'var(--bg-secondary)' }}>
          <ControlPanel />
        </div>
      </div>
      
      <StatusBar />
    </div>
  );
}

export default App;
