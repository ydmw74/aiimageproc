export function resizeImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = image.width;
  let height = image.height;

  // Calculate new dimensions while maintaining aspect ratio
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = width * ratio;
    height = height * ratio;
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(image, 0, 0, width, height);
}

export function canvasToBase64(
  canvas: HTMLCanvasElement,
  format: string = 'image/png',
  quality: number = 0.9
): string {
  return canvas.toDataURL(format, quality);
}

export function base64ToImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
}

export async function imageToBase64(
  image: HTMLImageElement,
  maxWidth: number = 2048,
  maxHeight: number = 2048
): Promise<string> {
  const canvas = document.createElement('canvas');
  resizeImage(canvas, image, maxWidth, maxHeight);
  return canvasToBase64(canvas);
}

export function extractMaskFromCanvas(
  canvas: HTMLCanvasElement
): string | null {
  // Extract mask data from canvas (red overlay areas)
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Create grayscale mask
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  const maskCtx = maskCanvas.getContext('2d');
  
  if (!maskCtx) return null;

  const maskData = maskCtx.createImageData(canvas.width, canvas.height);
  
  for (let i = 0; i < data.length; i += 4) {
    // Check if pixel is red (mask color)
    const isMask = data[i] > 200 && data[i + 1] < 100 && data[i + 2] < 100;
    const alpha = isMask ? 255 : 0;
    
    maskData.data[i] = alpha;     // R
    maskData.data[i + 1] = alpha; // G
    maskData.data[i + 2] = alpha; // B
    maskData.data[i + 3] = 255;   // A
  }
  
  maskCtx.putImageData(maskData, 0, 0);
  return canvasToBase64(maskCanvas);
}

export function estimateImageSize(base64: string): number {
  const base64Data = base64.split(',')[1] || base64;
  return Math.ceil((base64Data.length * 3) / 4);
}

export function optimizeImageForAPI(
  base64: string,
  maxSizeMB: number = 10
): string {
  const sizeBytes = estimateImageSize(base64);
  const sizeMB = sizeBytes / (1024 * 1024);
  
  if (sizeMB <= maxSizeMB) {
    return base64;
  }
  
  // Need to compress - in a real implementation, we'd resize/recompress here
  console.warn(`Image size (${sizeMB.toFixed(2)}MB) exceeds limit (${maxSizeMB}MB)`);
  
  // For now, return as-is with a warning
  return base64;
}
