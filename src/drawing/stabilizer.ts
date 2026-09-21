import type { StrokeSample } from './stroke.js';

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function stabilizeSample(
  previous: StrokeSample,
  current: StrokeSample,
  amount: number
): StrokeSample {
  const normalized = clamp(amount, 0, 100) / 100;
  if (normalized === 0) return { ...current };

  const alpha = 1 - normalized * 0.82;
  return {
    x: previous.x + (current.x - previous.x) * alpha,
    y: previous.y + (current.y - previous.y) * alpha,
    pressure: current.pressure,
    tiltX: current.tiltX,
    tiltY: current.tiltY
  };
}
