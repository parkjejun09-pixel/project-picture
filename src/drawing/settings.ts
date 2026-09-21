function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampBrushSize(value: number): number {
  return clamp(value, 1, 200);
}

export function clampOpacity(value: number): number {
  return clamp(value, 0.01, 1);
}

export function clampSpacing(value: number): number {
  return clamp(value, 1, 40);
}

export function clampZoom(value: number): number {
  return clamp(value, 0.25, 4);
}

export function clampStabilizer(value: number): number {
  return clamp(value, 0, 100);
}

export function clampPressureResponse(value: number): number {
  return clamp(value, -1, 1);
}

export function clampInfluence(value: number): number {
  return clamp(value, 0, 1);
}

export function clampFillTolerance(value: number): number {
  return clamp(value, 0, 255);
}

export function clampFillGapClosing(value: number): number {
  return clamp(value, 0, 8);
}

export function clampFillExpansion(value: number): number {
  return clamp(value, 0, 12);
}
