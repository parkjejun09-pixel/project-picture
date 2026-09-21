export interface AssistPoint {
  x: number;
  y: number;
}

export type AssistMode = 'none' | 'grid' | 'guide' | 'straight' | 'parallel' | 'curve' | 'radial' | 'concentric' | 'symmetry' | 'perspective';
export type GuideOrientation = 'horizontal' | 'vertical';

const finite = (value: number, fallback = 0): number => Number.isFinite(value) ? value : fallback;
const clampInt = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(value)));

export function snapToGrid(point: AssistPoint, spacing: number, offsetX = 0, offsetY = 0): AssistPoint {
  const step = Math.max(1e-6, Math.abs(finite(spacing, 1)));
  const ox = finite(offsetX);
  const oy = finite(offsetY);
  return {
    x: Math.round((finite(point.x) - ox) / step) * step + ox,
    y: Math.round((finite(point.y) - oy) / step) * step + oy
  };
}

export function snapToGuide(point: AssistPoint, orientation: GuideOrientation, position: number): AssistPoint {
  const p = finite(position);
  return orientation === 'vertical'
    ? { x: p, y: finite(point.y) }
    : { x: finite(point.x), y: p };
}

export function projectPointToLine(point: AssistPoint, anchor: AssistPoint, angleDegrees: number): AssistPoint {
  const theta = finite(angleDegrees) * Math.PI / 180;
  const dx = Math.cos(theta);
  const dy = Math.sin(theta);
  const px = finite(point.x) - finite(anchor.x);
  const py = finite(point.y) - finite(anchor.y);
  const t = px * dx + py * dy;
  return { x: finite(anchor.x) + dx * t, y: finite(anchor.y) + dy * t };
}

function cubicPoint(p0: AssistPoint, p1: AssistPoint, p2: AssistPoint, p3: AssistPoint, t: number): AssistPoint {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y
  };
}

export function nearestPointOnCubic(
  point: AssistPoint,
  p0: AssistPoint,
  p1: AssistPoint,
  p2: AssistPoint,
  p3: AssistPoint,
  samples = 96
): AssistPoint {
  const count = clampInt(samples, 12, 1024);
  let best = { ...p0 };
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= count; i += 1) {
    const candidate = cubicPoint(p0, p1, p2, p3, i / count);
    const dx = candidate.x - point.x;
    const dy = candidate.y - point.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

export function snapToRadial(point: AssistPoint, center: AssistPoint, rays: number): AssistPoint {
  const count = clampInt(rays, 1, 360);
  const dx = finite(point.x) - finite(center.x);
  const dy = finite(point.y) - finite(center.y);
  const radius = Math.hypot(dx, dy);
  if (radius === 0) return { ...center };
  const step = Math.PI * 2 / count;
  const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

export function snapToConcentric(point: AssistPoint, center: AssistPoint, spacing: number): AssistPoint {
  const dx = finite(point.x) - finite(center.x);
  const dy = finite(point.y) - finite(center.y);
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { ...center };
  const step = Math.max(1e-6, Math.abs(finite(spacing, 1)));
  const snappedRadius = Math.round(distance / step) * step;
  const scale = snappedRadius / distance;
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

export function buildSymmetryPoints(point: AssistPoint, center: AssistPoint, axes: number): AssistPoint[] {
  const count = clampInt(axes, 2, 12);
  const dx = finite(point.x) - finite(center.x);
  const dy = finite(point.y) - finite(center.y);
  const result: AssistPoint[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = i * Math.PI * 2 / count;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    result.push({
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos
    });
  }
  return result;
}
