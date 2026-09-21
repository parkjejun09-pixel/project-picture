function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function mapPressure(rawPressure: number, response: number): number {
  const pressure = clamp(rawPressure, 0, 1);
  const curve = clamp(response, -1, 1);
  if (curve === 0) return pressure;

  const exponent = 1 + Math.abs(curve) * 3;
  return curve > 0
    ? 1 - Math.pow(1 - pressure, exponent)
    : Math.pow(pressure, exponent);
}

export function pressureCurvePath(
  response: number,
  width = 148,
  height = 72,
  steps = 24
): string {
  const safeSteps = Math.max(2, Math.round(steps));
  const points: string[] = [];
  for (let index = 0; index <= safeSteps; index += 1) {
    const xRatio = index / safeSteps;
    const mapped = mapPressure(xRatio, response);
    const x = xRatio * width;
    const y = height - mapped * height;
    points.push(`${Number(x.toFixed(2))} ${Number(y.toFixed(2))}`);
  }
  return `M ${points.join(' L ')}`;
}
