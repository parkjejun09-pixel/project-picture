import type { PixelBuffer } from './smartFill.js';

function byteHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0').toUpperCase();
}

export function samplePixelHex(source: PixelBuffer, x: number, y: number): string {
  const px = Math.max(0, Math.min(source.width - 1, Math.floor(x)));
  const py = Math.max(0, Math.min(source.height - 1, Math.floor(y)));
  const offset = (py * source.width + px) * 4;
  return `#${byteHex(source.data[offset]!)}${byteHex(source.data[offset + 1]!)}${byteHex(source.data[offset + 2]!)}`;
}
