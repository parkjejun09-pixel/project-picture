import type { PixelBuffer } from './smartFill.js';

export function intersectMasks(a: Uint8Array, b: Uint8Array): Uint8Array {
  const length = Math.min(a.length, b.length);
  const result = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) result[index] = a[index] && b[index] ? 1 : 0;
  return result;
}

export function createUnpaintedMask(source: PixelBuffer, startX: number, startY: number, alphaThreshold = 16): Uint8Array {
  const x = Math.max(0, Math.min(source.width - 1, Math.floor(startX)));
  const y = Math.max(0, Math.min(source.height - 1, Math.floor(startY)));
  const startIndex = y * source.width + x;
  const threshold = Math.max(0, Math.min(255, alphaThreshold));
  const result = new Uint8Array(source.width * source.height);
  const queue = new Int32Array(result.length);
  let head = 0;
  let tail = 0;
  const alphaAt = (index: number): number => source.data[index * 4 + 3]!;
  if (alphaAt(startIndex) > threshold) return result;
  result[startIndex] = 1;
  queue[tail++] = startIndex;
  while (head < tail) {
    const index = queue[head++]!;
    const cx = index % source.width;
    const cy = Math.floor(index / source.width);
    const candidates = [
      cx > 0 ? index - 1 : -1,
      cx + 1 < source.width ? index + 1 : -1,
      cy > 0 ? index - source.width : -1,
      cy + 1 < source.height ? index + source.width : -1
    ];
    for (const next of candidates) {
      if (next < 0 || result[next] || alphaAt(next) > threshold) continue;
      result[next] = 1;
      queue[tail++] = next;
    }
  }
  return result;
}
