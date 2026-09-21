import { hexToRgb } from './colorModel.js';

export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface SmartFillOptions {
  tolerance: number;
  gapClosing: number;
}

function pixelOffset(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

function colorDistance(data: Uint8ClampedArray, offset: number, target: readonly number[]): number {
  const dr = data[offset]! - target[0]!;
  const dg = data[offset + 1]! - target[1]!;
  const db = data[offset + 2]! - target[2]!;
  const da = data[offset + 3]! - target[3]!;
  return Math.sqrt(dr * dr + dg * dg + db * db + da * da * 0.2);
}

function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const r = Math.max(0, Math.floor(radius));
  if (r === 0) return mask.slice();
  const result = mask.slice();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          result[ny * width + nx] = 1;
        }
      }
    }
  }
  return result;
}

export function createFillMask(source: PixelBuffer, startX: number, startY: number, options: SmartFillOptions): Uint8Array {
  const { width, height, data } = source;
  const x = Math.max(0, Math.min(width - 1, Math.floor(startX)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(startY)));
  const seedOffset = pixelOffset(width, x, y);
  const target = [data[seedOffset]!, data[seedOffset + 1]!, data[seedOffset + 2]!, data[seedOffset + 3]!] as const;
  const tolerance = Math.max(0, options.tolerance);
  const barriers = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (colorDistance(data, offset, target) > tolerance) barriers[index] = 1;
  }
  const closedBarriers = dilate(barriers, width, height, options.gapClosing);
  closedBarriers[y * width + x] = 0;

  const filled = new Uint8Array(width * height);
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  queueX[tail] = x;
  queueY[tail] = y;
  tail += 1;
  filled[y * width + x] = 1;

  while (head < tail) {
    const cx = queueX[head]!;
    const cy = queueY[head]!;
    head += 1;
    const neighbors = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]] as const;
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const index = ny * width + nx;
      if (filled[index] || closedBarriers[index]) continue;
      const offset = index * 4;
      if (colorDistance(data, offset, target) > tolerance) continue;
      filled[index] = 1;
      queueX[tail] = nx;
      queueY[tail] = ny;
      tail += 1;
    }
  }
  return filled;
}

export function expandFillMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  return dilate(mask, width, height, Math.max(0, radius));
}

export function antialiasFillMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const result = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (mask[index]) {
        result[index] = 255;
        continue;
      }
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (mask[ny * width + nx]) neighbors += 1;
        }
      }
      if (neighbors > 0) result[index] = Math.min(160, neighbors * 28);
    }
  }
  return result;
}

export function applyFillColor(target: PixelBuffer, mask: Uint8Array, hex: string, opacity = 1): void {
  const { r, g, b } = hexToRgb(hex);
  const alphaScale = Math.min(1, Math.max(0, opacity));
  for (let index = 0; index < mask.length; index += 1) {
    const coverage = mask[index]!;
    if (!coverage) continue;
    const offset = index * 4;
    target.data[offset] = r;
    target.data[offset + 1] = g;
    target.data[offset + 2] = b;
    target.data[offset + 3] = Math.round(255 * alphaScale * (coverage === 1 ? 1 : coverage / 255));
  }
}
