import { useAppStore } from '@/store/appStore';

export function StatusBar() {
  const { zoom, activeTool, version } = useAppStore();

  const toolNames: Record<string, string> = {
    select: 'Select',
    brush: 'Brush',
    rectangle: 'Rectangle',
    ellipse: 'Ellipse',
    polygon: 'Lasso',
    'magic-wand': 'Magic Wand',
    eraser: 'Eraser',
  };

  return (
    <footer style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '4px 16px',
      backgroundColor: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      fontSize: 12,
      color: 'var(--text-secondary)',
    }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <span>Tool: {toolNames[activeTool]}</span>
        <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
      </div>
      <div>
        AI ImageProc v{version}
      </div>
    </footer>
  );
}
