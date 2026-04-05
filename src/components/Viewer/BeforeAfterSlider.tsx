import { useState } from 'react';
import { useAppStore } from '@/store/appStore';

export function BeforeAfterSlider() {
  const { beforeAfterPosition, setBeforeAfterPosition, originalImage, resultImage } = useAppStore();
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');

  if (!originalImage) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-secondary)',
        padding: 20,
      }}>
        <p style={{ textAlign: 'center' }}>Load an image to see<br />before/after comparison</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setViewMode('slider')}
          className={viewMode === 'slider' ? 'primary' : 'secondary'}
          style={{ flex: 1 }}
        >
          Slider
        </button>
        <button
          onClick={() => setViewMode('side-by-side')}
          className={viewMode === 'side-by-side' ? 'primary' : 'secondary'}
          style={{ flex: 1 }}
        >
          Side by Side
        </button>
      </div>

      {viewMode === 'slider' ? (
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          {/* After Image (Background) */}
          {resultImage && (
            <img
              src={resultImage.src}
              alt="After"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          )}
          
          {/* Before Image (Clipped) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${beforeAfterPosition}%`,
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <img
              src={originalImage.src}
              alt="Before"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Slider Handle */}
          <input
            type="range"
            min="0"
            max="100"
            value={beforeAfterPosition}
            onChange={(e) => setBeforeAfterPosition(Number(e.target.value))}
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: '100%',
              transform: 'translateY(-50%)',
              opacity: 0,
              cursor: 'ew-resize',
              zIndex: 10,
            }}
          />

          {/* Slider Line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${beforeAfterPosition}%`,
              width: 2,
              height: '100%',
              backgroundColor: 'white',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 40,
                height: 40,
                backgroundColor: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'black',
                fontWeight: 'bold',
              }}
            >
              ↔
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: 4,
              left: 4,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              zIndex: 1,
            }}>
              Before
            </div>
            <img
              src={originalImage.src}
              alt="Before"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          {resultImage && (
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: 4,
                left: 4,
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 12,
                zIndex: 1,
              }}>
                After
              </div>
              <img
                src={resultImage.src}
                alt="After"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
