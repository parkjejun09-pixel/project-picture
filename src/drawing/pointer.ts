export interface PointerDynamics {
  pressure: number;
  tiltX: number;
  tiltY: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizePointerDynamics(
  pointerType: string,
  pressure: number,
  tiltX: number,
  tiltY: number
): PointerDynamics {
  if (pointerType !== 'pen') {
    return { pressure: 1, tiltX: 0, tiltY: 0 };
  }

  return {
    pressure: clamp(pressure, 0, 1),
    tiltX: clamp(tiltX, -90, 90),
    tiltY: clamp(tiltY, -90, 90)
  };
}
