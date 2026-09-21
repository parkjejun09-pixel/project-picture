export interface Point {
  x: number;
  y: number;
}

export interface StrokeSample extends Point {
  pressure: number;
  tiltX: number;
  tiltY: number;
}

export function sampleSegment(from: Point, to: Point, spacing: number): Point[] {
  const safeSpacing = Math.max(0.1, spacing);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) return [{ x: to.x, y: to.y }];

  const steps = Math.max(1, Math.ceil(distance / safeSpacing));
  const points: Point[] = [];
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    points.push({ x: from.x + dx * t, y: from.y + dy * t });
  }
  return points;
}

export function sampleStrokeSegment(from: StrokeSample, to: StrokeSample, spacing: number): StrokeSample[] {
  const safeSpacing = Math.max(0.1, spacing);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return [{ ...to }];

  const steps = Math.max(1, Math.ceil(distance / safeSpacing));
  const samples: StrokeSample[] = [];
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    samples.push({
      x: from.x + dx * t,
      y: from.y + dy * t,
      pressure: from.pressure + (to.pressure - from.pressure) * t,
      tiltX: from.tiltX + (to.tiltX - from.tiltX) * t,
      tiltY: from.tiltY + (to.tiltY - from.tiltY) * t
    });
  }
  return samples;
}
