import { clampZoom } from './settings.js';
import type { PanOffset } from '../editor/types.js';

export function buildViewTransform(pan: PanOffset, zoom: number): string {
  return `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`;
}

export function zoomFromWheel(currentZoom: number, deltaY: number): number {
  const factor = Math.exp(-deltaY * 0.0015);
  return clampZoom(currentZoom * factor);
}
