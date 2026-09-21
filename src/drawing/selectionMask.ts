import { createFillMask, type PixelBuffer } from './smartFill.js';
import type { SelectionPoint, SelectionRect } from './selection.js';

export type SelectionCombineMode = 'replace' | 'add' | 'subtract' | 'intersect';

export function createMagicWandMask(source: PixelBuffer, x: number, y: number, tolerance: number): Uint8Array {
  return createFillMask(source, x, y, { tolerance: Math.max(0, tolerance), gapClosing: 0 });
}

function pointInPolygon(x: number, y: number, points: readonly SelectionPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const pi = points[i]!;
    const pj = points[j]!;
    const vx = pj.x - pi.x;
    const vy = pj.y - pi.y;
    const lengthSquared = vx * vx + vy * vy;
    if (lengthSquared > 0) {
      const t = Math.max(0, Math.min(1, ((x - pi.x) * vx + (y - pi.y) * vy) / lengthSquared));
      const dx = x - (pi.x + t * vx);
      const dy = y - (pi.y + t * vy);
      if (dx * dx + dy * dy <= 1e-8) return true;
    }
    const intersects = ((pi.y > y) !== (pj.y > y)) &&
      (x < ((pj.x - pi.x) * (y - pi.y)) / ((pj.y - pi.y) || Number.EPSILON) + pi.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

export function createLassoMask(width: number, height: number, points: readonly SelectionPoint[]): Uint8Array {
  const result = new Uint8Array(width * height);
  if (points.length < 3) return result;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) result[y * width + x] = 1;
    }
  }
  return result;
}

export function createPolygonMask(width: number, height: number, points: readonly SelectionPoint[]): Uint8Array {
  const lasso = createLassoMask(width, height, points);
  const result = new Uint8Array(lasso.length);
  for (let i = 0; i < lasso.length; i += 1) result[i] = lasso[i] ? 255 : 0;
  return result;
}

export function createEllipseMask(width: number, height: number, rect: SelectionRect): Uint8Array {
  const result = new Uint8Array(width * height);
  if (rect.width <= 0 || rect.height <= 0) return result;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rx = rect.width / 2;
  const ry = rect.height / 2;
  const x1 = Math.max(0, Math.floor(rect.x));
  const y1 = Math.max(0, Math.floor(rect.y));
  const x2 = Math.min(width, Math.ceil(rect.x + rect.width));
  const y2 = Math.min(height, Math.ceil(rect.y + rect.height));
  for (let y = y1; y < y2; y += 1) {
    for (let x = x1; x < x2; x += 1) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) result[y * width + x] = 255;
    }
  }
  return result;
}

function stampCircle(mask: Uint8Array, width: number, height: number, cx: number, cy: number, radius: number): void {
  const r = Math.max(0.5, radius);
  const x1 = Math.max(0, Math.floor(cx - r));
  const y1 = Math.max(0, Math.floor(cy - r));
  const x2 = Math.min(width - 1, Math.ceil(cx + r));
  const y2 = Math.min(height - 1, Math.ceil(cy + r));
  const rr = r * r;
  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rr) mask[y * width + x] = 255;
    }
  }
}

export function createSelectionPenMask(width: number, height: number, points: readonly SelectionPoint[], diameter: number): Uint8Array {
  const result = new Uint8Array(width * height);
  if (points.length === 0) return result;
  const radius = Math.max(0.5, diameter / 2);
  stampCircle(result, width, height, points[0]!.x, points[0]!.y, radius);
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(distance / Math.max(0.5, radius * 0.5)));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      stampCircle(result, width, height, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, radius);
    }
  }
  return result;
}

export function combineSelectionMasks(current: Uint8Array | null, incoming: Uint8Array, mode: SelectionCombineMode): Uint8Array {
  if (!current || mode === 'replace') return incoming.slice();
  const length = Math.min(current.length, incoming.length);
  const result = new Uint8Array(Math.max(current.length, incoming.length));
  for (let i = 0; i < result.length; i += 1) {
    const a = i < current.length ? current[i]! : 0;
    const b = i < incoming.length ? incoming[i]! : 0;
    if (i >= length && mode === 'subtract') { result[i] = a; continue; }
    switch (mode) {
      case 'add': result[i] = Math.max(a, b); break;
      case 'subtract': result[i] = b > 0 ? 0 : a; break;
      case 'intersect': result[i] = Math.min(a, b); break;
      default: result[i] = b;
    }
  }
  return result;
}

export function invertSelectionMask(mask: Uint8Array): Uint8Array {
  const result = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) result[i] = 255 - mask[i]!;
  return result;
}

function morphology(mask: Uint8Array, width: number, height: number, radius: number, mode: 'max' | 'min'): Uint8Array {
  const r = Math.max(0, Math.round(radius));
  if (r === 0) return mask.slice();
  const result = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let value = mode === 'max' ? 0 : 255;
      outer: for (let oy = -r; oy <= r; oy += 1) {
        for (let ox = -r; ox <= r; ox += 1) {
          if (ox * ox + oy * oy > r * r) continue;
          const sx = x + ox;
          const sy = y + oy;
          const sample = sx < 0 || sx >= width || sy < 0 || sy >= height ? 0 : mask[sy * width + sx]!;
          if (mode === 'max') {
            value = Math.max(value, sample);
            if (value === 255) break outer;
          } else {
            value = Math.min(value, sample);
            if (value === 0) break outer;
          }
        }
      }
      result[y * width + x] = value;
    }
  }
  return result;
}

export function expandSelectionMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  return morphology(mask, width, height, radius, 'max');
}

export function contractSelectionMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  return morphology(mask, width, height, radius, 'min');
}

export function featherSelectionMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const r = Math.max(0, Math.round(radius));
  if (r === 0) return mask.slice();
  const result = new Uint8Array(mask.length);
  const kernelRadius = Math.max(1, r * 2);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let weight = 0;
      for (let oy = -kernelRadius; oy <= kernelRadius; oy += 1) {
        for (let ox = -kernelRadius; ox <= kernelRadius; ox += 1) {
          const distance = Math.hypot(ox, oy);
          if (distance > kernelRadius) continue;
          const sx = x + ox;
          const sy = y + oy;
          const sample = sx < 0 || sx >= width || sy < 0 || sy >= height ? 0 : mask[sy * width + sx]!;
          const w = Math.max(0.05, 1 - distance / (kernelRadius + 0.5));
          sum += sample * w;
          weight += w;
        }
      }
      result[y * width + x] = Math.round(sum / Math.max(1e-6, weight));
    }
  }
  return result;
}

export function maskBounds(mask: Uint8Array, width: number, height: number): SelectionRect | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function rectangleMask(width: number, height: number, rect: SelectionRect): Uint8Array {
  const result = new Uint8Array(width * height);
  const x1 = Math.max(0, Math.floor(rect.x));
  const y1 = Math.max(0, Math.floor(rect.y));
  const x2 = Math.min(width, Math.ceil(rect.x + rect.width));
  const y2 = Math.min(height, Math.ceil(rect.y + rect.height));
  for (let y = y1; y < y2; y += 1) for (let x = x1; x < x2; x += 1) result[y * width + x] = 1;
  return result;
}
