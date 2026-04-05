import * as fabric from 'fabric';

export interface MagicWandOptions {
  tolerance: number;
  antiAlias: boolean;
}

export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number
): Uint8Array {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  
  // Get target color at starting point
  const startIndex = (startY * width + startX) * 4;
  const targetR = data[startIndex];
  const targetG = data[startIndex + 1];
  const targetB = data[startIndex + 2];
  
  // Helper to check if pixel matches target color
  const matches = (index: number) => {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    
    const diff = Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB);
    return diff <= tolerance * 3; // Scale tolerance for RGB sum
  };
  
  // Stack-based flood fill (4-directional)
  const stack: Array<[number, number]> = [[startX, startY]];
  
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const index = (y * width + x) * 4;
    
    // Skip if out of bounds or already processed
    if (x < 0 || x >= width || y < 0 || y >= height || mask[y * width + x]) {
      continue;
    }
    
    // Skip if color doesn't match
    if (!matches(index)) {
      continue;
    }
    
    // Mark as filled
    mask[y * width + x] = 255;
    
    // Add neighbors to stack
    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }
  
  return mask;
}

export function createMagicWandPath(
  mask: Uint8Array,
  width: number,
  height: number,
  simplify: number = 2
): fabric.Path {
  // Find contours in mask
  const contours = findContours(mask, width, height);
  
  if (contours.length === 0) {
    return new fabric.Path('', { fill: 'rgba(255, 0, 0, 0.3)', stroke: 'red', strokeWidth: 2 });
  }
  
  // Use largest contour
  const largestContour = contours.reduce((a, b) => 
    b.length > a.length ? b : a
  );
  
  // Simplify contour points
  const simplified = simplifyPoints(largestContour, simplify);
  
  // Convert to SVG path
  const pathData = contourToPathData(simplified);
  
  return new fabric.Path(pathData, {
    fill: 'rgba(255, 0, 0, 0.3)',
    stroke: 'red',
    strokeWidth: 2,
  });
}

function findContours(
  mask: Uint8Array,
  width: number,
  height: number
): Array<Array<[number, number]>> {
  const contours: Array<Array<[number, number]>> = [];
  const visited = new Uint8Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      
      if (mask[index] === 255 && !visited[index]) {
        const contour = traceContour(mask, visited, x, y, width, height);
        if (contour.length > 3) {
          contours.push(contour);
        }
      }
    }
  }
  
  return contours;
}

function traceContour(
  mask: Uint8Array,
  visited: Uint8Array,
  startX: number,
  startY: number,
  width: number,
  height: number
): Array<[number, number]> {
  const contour: Array<[number, number]> = [];
  const directions = [
    [1, 0],   // Right
    [0, 1],   // Down
    [-1, 0],  // Left
    [0, -1],  // Up
  ];
  
  let x = startX;
  let y = startY;
  let dirIndex = 0;
  
  do {
    contour.push([x, y]);
    visited[y * width + x] = 255;
    
    // Try to turn left (counter-clockwise)
    let found = false;
    for (let i = 0; i < 4; i++) {
      const newDirIndex = (dirIndex + i) % 4;
      const [dx, dy] = directions[newDirIndex];
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
          mask[ny * width + nx] === 255 && !visited[ny * width + nx]) {
        x = nx;
        y = ny;
        dirIndex = (newDirIndex + 3) % 4; // Turn right for next iteration
        found = true;
        break;
      }
    }
    
    if (!found) {
      break;
    }
  } while ((x !== startX || y !== startY) && contour.length < 10000);
  
  return contour;
}

function simplifyPoints(
  points: Array<[number, number]>,
  tolerance: number
): Array<[number, number]> {
  if (points.length <= 2) {
    return points;
  }
  
  // Ramer-Douglas-Peucker algorithm
  const squaredDistance = (p1: [number, number], p2: [number, number]) => {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return dx * dx + dy * dy;
  };
  
  const perpendicularDistance = (
    point: [number, number],
    lineStart: [number, number],
    lineEnd: [number, number]
  ) => {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];
    
    if (dx === 0 && dy === 0) {
      return squaredDistance(point, lineStart);
    }
    
    const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (dx * dx + dy * dy);
    const nearestX = lineStart[0] + t * dx;
    const nearestY = lineStart[1] + t * dy;
    
    return squaredDistance(point, [nearestX, nearestY]);
  };
  
  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;
  
  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  
  if (maxDistance > tolerance * tolerance) {
    const left = simplifyPoints(points.slice(0, index + 1), tolerance);
    const right = simplifyPoints(points.slice(index), tolerance);
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[end]];
  }
}

function contourToPathData(points: Array<[number, number]>): string {
  if (points.length === 0) {
    return '';
  }
  
  let pathData = `M ${points[0][0]} ${points[0][1]}`;
  
  for (let i = 1; i < points.length; i++) {
    pathData += ` L ${points[i][0]} ${points[i][1]}`;
  }
  
  pathData += ' Z';
  return pathData;
}

export function applyMagicWand(
  canvas: fabric.Canvas,
  pointer: fabric.Point,
  tolerance: number
): fabric.Path | null {
  const ctx = canvas.getContext();
  if (!ctx) return null;
  
  const width = canvas.width!;
  const height = canvas.height!;
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  
  // Perform flood fill
  const mask = floodFill(imageData, Math.floor(pointer.x), Math.floor(pointer.y), tolerance);
  
  // Check if any pixels were selected
  const selectedPixels = mask.filter(v => v === 255).length;
  if (selectedPixels < 10) {
    return null; // Too few pixels selected
  }
  
  // Create path from mask
  return createMagicWandPath(mask, width, height, 2);
}
