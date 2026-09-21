import type { AssistPoint } from './assist.js';

export type PerspectiveMode = 'one' | 'two' | 'three';
export type VanishingPoint = AssistPoint;

export interface PerspectiveLayout {
  horizonY: number;
  vanishingPoints: VanishingPoint[];
}

export interface PerspectiveRayMatch {
  index: number;
  angleError: number;
  projection: AssistPoint;
}

function projectPointToVector(point: AssistPoint, origin: AssistPoint, target: AssistPoint): AssistPoint {
  const vx = target.x - origin.x;
  const vy = target.y - origin.y;
  const lengthSq = vx * vx + vy * vy;
  if (lengthSq <= 1e-9) return { ...point };
  const px = point.x - origin.x;
  const py = point.y - origin.y;
  const t = (px * vx + py * vy) / lengthSq;
  return { x: origin.x + vx * t, y: origin.y + vy * t };
}

function undirectedAngleError(ax: number, ay: number, bx: number, by: number): number {
  const al = Math.hypot(ax, ay);
  const bl = Math.hypot(bx, by);
  if (al <= 1e-9 || bl <= 1e-9) return Math.PI;
  const cosine = Math.max(-1, Math.min(1, Math.abs((ax * bx + ay * by) / (al * bl))));
  return Math.acos(cosine);
}

export function buildDefaultPerspective(mode: PerspectiveMode): PerspectiveLayout {
  if (mode === 'one') return { horizonY: 0.5, vanishingPoints: [{ x: 0.5, y: 0.5 }] };
  if (mode === 'two') return { horizonY: 0.5, vanishingPoints: [{ x: 0.15, y: 0.5 }, { x: 0.85, y: 0.5 }] };
  return {
    horizonY: 0.5,
    vanishingPoints: [{ x: 0.15, y: 0.5 }, { x: 0.85, y: 0.5 }, { x: 0.5, y: 0.15 }]
  };
}

export function nearestPerspectiveRay(point: AssistPoint, origin: AssistPoint, vanishingPoints: VanishingPoint[]): PerspectiveRayMatch {
  if (vanishingPoints.length === 0) return { index: -1, angleError: Math.PI, projection: { ...point } };
  const px = point.x - origin.x;
  const py = point.y - origin.y;
  let best: PerspectiveRayMatch = { index: 0, angleError: Number.POSITIVE_INFINITY, projection: { ...point } };
  vanishingPoints.forEach((vp, index) => {
    const error = undirectedAngleError(px, py, vp.x - origin.x, vp.y - origin.y);
    if (error < best.angleError) {
      best = { index, angleError: error, projection: projectPointToVector(point, origin, vp) };
    }
  });
  return best;
}

export function projectToPerspective(point: AssistPoint, origin: AssistPoint, vanishingPoints: VanishingPoint[]): AssistPoint {
  return nearestPerspectiveRay(point, origin, vanishingPoints).projection;
}
