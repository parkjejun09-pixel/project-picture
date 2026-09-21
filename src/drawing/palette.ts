import { normalizeHex } from './color.js';
import { rgbToHex } from './colorModel.js';

function normalizedOrThrow(color: string): string {
  const normalized = normalizeHex(color);
  if (!normalized) throw new Error(`Invalid palette color: ${color}`);
  return normalized;
}

export function addRecentColor(colors: string[], color: string, limit = 12): string[] {
  const normalized = normalizedOrThrow(color);
  return [normalized, ...colors.filter((candidate) => candidate !== normalized)].slice(0, Math.max(1, limit));
}

export function toggleFavoriteColor(colors: string[], color: string, limit = 24): string[] {
  const normalized = normalizedOrThrow(color);
  if (colors.includes(normalized)) return colors.filter((candidate) => candidate !== normalized);
  return [...colors, normalized].slice(-Math.max(1, limit));
}

export function addProjectColor(colors: string[], color: string, limit = 40): string[] {
  const normalized = normalizedOrThrow(color);
  if (colors.includes(normalized)) return colors.slice();
  return [...colors, normalized].slice(-Math.max(1, limit));
}

interface ColorBin {
  r: number;
  g: number;
  b: number;
  count: number;
}

function distance(a: ColorBin, b: ColorBin): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

export function extractPaletteFromPixels(data: Uint8ClampedArray, count = 6): string[] {
  const bins = new Map<string, ColorBin>();
  for (let offset = 0; offset + 3 < data.length; offset += 4) {
    if (data[offset + 3]! < 24) continue;
    const r = data[offset]! & 0xF8;
    const g = data[offset + 1]! & 0xF8;
    const b = data[offset + 2]! & 0xF8;
    const key = `${r},${g},${b}`;
    const existing = bins.get(key);
    if (existing) existing.count += 1;
    else bins.set(key, { r, g, b, count: 1 });
  }

  const sorted = [...bins.values()].sort((a, b) => b.count - a.count || (b.r + b.g + b.b) - (a.r + a.g + a.b));
  const chosen: ColorBin[] = [];
  for (const candidate of sorted) {
    if (chosen.every((color) => distance(color, candidate) >= 28)) chosen.push(candidate);
    if (chosen.length >= Math.max(1, count)) break;
  }
  return chosen.map(({ r, g, b }) => rgbToHex({ r, g, b }));
}
