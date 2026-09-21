import type { PaintTool } from './canvasRenderer.js';
import { mapPressure } from './pressure.js';
import type { StrokeSample } from './stroke.js';

export interface BrushDynamicsSettings {
  size: number;
  opacity: number;
  pressureResponse: number;
  pressureSize: number;
  pressureOpacity: number;
  tiltInfluence: number;
  hardness: number;
}

export interface DynamicDabStyle {
  compositeOperation: GlobalCompositeOperation;
  fillStyle: string;
  globalAlpha: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  hardness: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function buildDynamicDabStyle(
  tool: PaintTool,
  color: string,
  settings: BrushDynamicsSettings,
  sample: StrokeSample
): DynamicDabStyle {
  const pressure = mapPressure(sample.pressure, settings.pressureResponse);
  const pressureSize = clamp(settings.pressureSize, 0, 1);
  const pressureOpacity = clamp(settings.pressureOpacity, 0, 1);
  const baseRadius = Math.max(0.5, settings.size / 2);
  const sizeScale = (1 - pressureSize) + pressureSize * Math.max(0.08, pressure);
  const opacityScale = (1 - pressureOpacity) + pressureOpacity * pressure;

  const tiltMagnitude = Math.min(1, Math.hypot(sample.tiltX, sample.tiltY) / 90);
  const tilt = tiltMagnitude * clamp(settings.tiltInfluence, 0, 1);
  const radius = baseRadius * sizeScale;

  return {
    compositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
    fillStyle: color,
    globalAlpha: clamp(settings.opacity * opacityScale, 0.01, 1),
    radiusX: radius * (1 + tilt * 1.35),
    radiusY: radius * (1 - tilt * 0.28),
    rotation: Math.atan2(sample.tiltY, sample.tiltX || Number.EPSILON),
    hardness: clamp(settings.hardness, 0.02, 1)
  };
}
