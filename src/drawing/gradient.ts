import { hexToRgb } from './colorModel.js';
import type { Point } from './stroke.js';

export type GradientMode = 'linear' | 'radial';

function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
function toHex(value: number): string { return Math.round(value).toString(16).padStart(2, '0').toUpperCase(); }

export function gradientParameter(start: Point, end: Point, point: Point, mode: GradientMode): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-9) return 0;
  if (mode === 'radial') {
    const radius = Math.sqrt(lengthSquared);
    return clamp01(Math.hypot(point.x - start.x, point.y - start.y) / radius);
  }
  return clamp01(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared);
}

export function interpolateHex(startHex: string, endHex: string, t: number): string {
  const a = hexToRgb(startHex);
  const b = hexToRgb(endHex);
  const k = clamp01(t);
  return `#${toHex(a.r + (b.r - a.r) * k)}${toHex(a.g + (b.g - a.g) * k)}${toHex(a.b + (b.b - a.b) * k)}`;
}
