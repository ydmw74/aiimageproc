import { useAppStore } from '@/store/appStore';

export function Toolbar() {
  const { loadImage, undo, redo, saveProject } = useAppStore();

  const handleOpenFile = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile();
      if (!result.canceled && result.filePaths.length > 0) {
        const file = await new Promise<File>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const blob = new Blob([e.target?.result as ArrayBuffer]);
            const file = new File([blob], result.filePaths[0].split('/').pop() || 'image.png', { type: 'image/png' });
            resolve(file);
          };
          
          fetch(result.filePaths[0])
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], result.filePaths[0].split('/').pop() || 'image.png', { type: 'image/png' });
              resolve(file);
            });
        });
        
        await loadImage(file);
      }
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button onClick={handleOpenFile} className="secondary">
        📁 Open
      </button>
      <button onClick={saveProject} className="secondary">
        💾 Save
      </button>
      <div style={{ width: 1, height: 24, backgroundColor: 'var(--border)', margin: '0 4px' }} />
      <button onClick={undo} className="secondary" title="Undo (Ctrl+Z)">
        ↶ Undo
      </button>
      <button onClick={redo} className="secondary" title="Redo (Ctrl+Y)">
        ↷ Redo
      </button>
    </div>
  );
}
