import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { useAppStore } from '@/store/appStore';
import { applyMagicWand } from '@/utils/magicWand';

export function CanvasEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  
  const { 
    originalImage, 
    activeTool, 
    brushSize,
    addMask,
    pushState,
  } = useAppStore();

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: '#1e1e1e',
      selection: true,
    });

    fabricRef.current = canvas;

    // Handle window resize
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        canvas.setWidth(container.clientWidth);
        canvas.setHeight(container.clientHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  // Load image when available
  useEffect(() => {
    if (!fabricRef.current || !originalImage) return;

    fabric.util.loadImage(originalImage.src, {
      crossOrigin: 'anonymous',
    }).then((img) => {
      const canvas = fabricRef.current!;
      const container = canvasRef.current?.parentElement;
      
      if (!container || !img) return;

      // Scale image to fit canvas
      const scaleX = (container.clientWidth - 40) / img.width;
      const scaleY = (container.clientHeight - 40) / img.height;
      const scale = Math.min(scaleX, scaleY, 1);

      const fabricImg = new fabric.Image(img, {
        scaleX: scale,
        scaleY: scale,
        left: (container.clientWidth - img.width * scale) / 2,
        top: (container.clientHeight - img.height * scale) / 2,
      });

      canvas.add(fabricImg);
      canvas.centerObject(fabricImg);
      canvas.setActiveObject(fabricImg);
    });
  }, [originalImage]);

  // Handle tool changes
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    switch (activeTool) {
      case 'brush':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = brushSize;
        canvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
        break;
      case 'select':
        canvas.isDrawingMode = false;
        break;
      case 'eraser':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = brushSize;
        canvas.freeDrawingBrush.color = '#1e1e1e';
        break;
      case 'magic-wand':
        canvas.isDrawingMode = false;
        break;
      default:
        canvas.isDrawingMode = false;
        break;
    }
  }, [activeTool, brushSize]);

  // Handle shape tools
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let shape: fabric.Object | null = null;

    const onMouseDown = (e: fabric.TEvent<MouseEvent>) => {
      // Magic Wand handling
      if (activeTool === 'magic-wand') {
        const pointer = canvas.getPointer(e.e);
        if (!pointer) return;
        
        pushState();
        
        const magicWandPath = applyMagicWand(canvas, pointer, 30);
        if (magicWandPath) {
          canvas.add(magicWandPath);
          addMask({
            id: crypto.randomUUID(),
            type: 'magic-wand',
            data: magicWandPath.toJSON(),
            color: 'red',
            opacity: 0.3,
          });
        }
        return;
      }
      
      if (!['rectangle', 'ellipse', 'polygon'].includes(activeTool)) return;
      const pointer = canvas.getPointer(e.e);
      if (!pointer) return;

      isDrawing = true;
      startX = pointer.x;
      startY = pointer.y;

      pushState();

      if (activeTool === 'rectangle') {
        shape = new fabric.Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          fill: 'rgba(255, 0, 0, 0.3)',
          stroke: 'red',
          strokeWidth: 2,
        });
      } else if (activeTool === 'ellipse') {
        shape = new fabric.Ellipse({
          left: startX,
          top: startY,
          rx: 0,
          ry: 0,
          fill: 'rgba(255, 0, 0, 0.3)',
          stroke: 'red',
          strokeWidth: 2,
        });
      }

      if (shape) {
        canvas.add(shape);
      }
    };

    const onMouseMove = (e: fabric.TEvent<MouseEvent>) => {
      if (!isDrawing || !shape) return;
      const pointer = canvas.getPointer(e.e);
      if (!pointer) return;

      const currentX = pointer.x;
      const currentY = pointer.y;

      if (activeTool === 'rectangle') {
        const width = currentX - startX;
        const height = currentY - startY;

        shape.set({
          width: Math.abs(width),
          height: Math.abs(height),
          left: width > 0 ? startX : currentX,
          top: height > 0 ? startY : currentY,
        });
      } else if (activeTool === 'ellipse') {
        const rx = Math.abs(currentX - startX) / 2;
        const ry = Math.abs(currentY - startY) / 2;

        shape.set({
          rx,
          ry,
          left: Math.min(startX, currentX),
          top: Math.min(startY, currentY),
        });
      }

      canvas.requestRenderAll();
    };

    const onMouseUp = () => {
      if (!isDrawing) return;
      isDrawing = false;

      if (shape) {
        addMask({
          id: crypto.randomUUID(),
          type: activeTool as any,
          data: shape.toJSON(),
          color: 'red',
          opacity: 0.3,
        });
        shape = null;
      }
    };

    canvas.on('mouse:down', onMouseDown as any);
    canvas.on('mouse:move', onMouseMove as any);
    canvas.on('mouse:up', onMouseUp as any);

    return () => {
      canvas.off('mouse:down', onMouseDown as any);
      canvas.off('mouse:move', onMouseMove as any);
      canvas.off('mouse:up', onMouseUp as any);
    };
  }, [activeTool, addMask, pushState]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#1e1e1e' }}>
      <canvas ref={canvasRef} />
      {!originalImage && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>No image loaded</p>
          <p style={{ fontSize: 14 }}>Click "Open" to load an image</p>
        </div>
      )}
    </div>
  );
}
