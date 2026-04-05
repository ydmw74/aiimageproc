import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';

export function Toolbar() {
  const { loadImage, undo, redo, saveProject } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const metaKey = isMac ? e.metaKey : e.ctrlKey;

      if (metaKey && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo(); // Ctrl/Cmd + Shift + Z = Redo
        } else {
          undo(); // Ctrl/Cmd + Z = Undo
        }
      } else if (metaKey && e.key === 'y') {
        e.preventDefault();
        redo(); // Ctrl/Cmd + Y = Redo
      } else if (metaKey && e.key === 'o') {
        e.preventDefault();
        handleOpenFile(); // Ctrl/Cmd + O = Open
      } else if (metaKey && e.key === 's') {
        e.preventDefault();
        saveProject(); // Ctrl/Cmd + S = Save
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveProject]);

  const handleOpenFile = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile();
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const readResult = await window.electronAPI.readFile(filePath);
        if (!readResult.success) {
          console.error('Failed to read file:', readResult.error);
          return;
        }
        const fileName = filePath.split('/').pop() || 'image';
        const extension = fileName.split('.').pop()?.toLowerCase() || 'png';
        const mimeTypes: Record<string, string> = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          webp: 'image/webp',
          bmp: 'image/bmp',
        };
        const mimeType = mimeTypes[extension] || 'image/png';
        const data = readResult.data;
        if (!data) {
          console.error('No data returned from file read');
          return;
        }
        const uint8Array = new Uint8Array(data);
        const blob = new Blob([uint8Array], { type: mimeType });
        const file = new File([blob], fileName, { type: mimeType });
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
