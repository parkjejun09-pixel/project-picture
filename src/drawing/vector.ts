import { normalizeHex } from './color.js';

export interface VectorHandle { x: number; y: number; }
export interface VectorPoint {
  x: number;
  y: number;
  inHandle?: VectorHandle;
  outHandle?: VectorHandle;
}
export interface VectorStroke {
  id: string;
  points: VectorPoint[];
  color: string;
  size: number;
  opacity: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clonePoint(point: VectorPoint): VectorPoint {
  return {
    x: point.x,
    y: point.y,
    ...(point.inHandle ? { inHandle: { ...point.inHandle } } : {}),
    ...(point.outHandle ? { outHandle: { ...point.outHandle } } : {})
  };
}

export function createVectorStroke(id: string, point: VectorPoint, color: string, size: number, opacity: number): VectorStroke {
  return {
    id,
    points: [clonePoint(point)],
    color: normalizeHex(color) ?? '#000000',
    size: clamp(size, 0.5, 200),
    opacity: clamp(opacity, 0.01, 1)
  };
}

export function appendVectorPoint(stroke: VectorStroke, point: VectorPoint): VectorStroke {
  return { ...stroke, points: [...stroke.points.map(clonePoint), clonePoint(point)] };
}

export function insertVectorPoint(stroke: VectorStroke, segmentIndex: number, point: VectorPoint): VectorStroke {
  const index = Math.max(0, Math.min(stroke.points.length - 1, segmentIndex)) + 1;
  return { ...stroke, points: [...stroke.points.slice(0, index).map(clonePoint), clonePoint(point), ...stroke.points.slice(index).map(clonePoint)] };
}

export function deleteVectorPoint(stroke: VectorStroke, index: number): VectorStroke {
  if (index < 0 || index >= stroke.points.length || stroke.points.length <= 2) return stroke;
  return { ...stroke, points: stroke.points.filter((_, i) => i !== index).map(clonePoint) };
}

export function setVectorHandle(stroke: VectorStroke, index: number, side: 'in' | 'out', handle: VectorHandle | null): VectorStroke {
  if (index < 0 || index >= stroke.points.length) return stroke;
  return {
    ...stroke,
    points: stroke.points.map((point, i) => {
      if (i !== index) return clonePoint(point);
      const next = clonePoint(point);
      const key = side === 'in' ? 'inHandle' : 'outHandle';
      if (handle) next[key] = { ...handle };
      else delete next[key];
      return next;
    })
  };
}

export function updateVectorStroke(stroke: VectorStroke, patch: Partial<Pick<VectorStroke, 'color' | 'size' | 'opacity'>>): VectorStroke {
  return {
    ...stroke,
    color: patch.color === undefined ? stroke.color : (normalizeHex(patch.color) ?? stroke.color),
    size: patch.size === undefined ? stroke.size : clamp(patch.size, 0.5, 200),
    opacity: patch.opacity === undefined ? stroke.opacity : clamp(patch.opacity, 0.01, 1)
  };
}

function pointSegmentDistance(point: VectorPoint, a: VectorPoint, b: VectorPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return Math.hypot(point.x - x, point.y - y);
}

function cubicPoint(a: VectorPoint, b: VectorPoint, t: number): VectorPoint {
  const c1 = a.outHandle ?? a;
  const c2 = b.inHandle ?? b;
  const mt = 1 - t;
  return {
    x: mt * mt * mt * a.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * b.x,
    y: mt * mt * mt * a.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * b.y
  };
}

function segmentDistance(point: VectorPoint, a: VectorPoint, b: VectorPoint): number {
  if (!a.outHandle && !b.inHandle) return pointSegmentDistance(point, a, b);
  let best = Infinity;
  let prev = a;
  for (let i = 1; i <= 16; i += 1) {
    const current = cubicPoint(a, b, i / 16);
    best = Math.min(best, pointSegmentDistance(point, prev, current));
    prev = current;
  }
  return best;
}

export function nearestVectorSegmentIndex(stroke: VectorStroke, point: VectorPoint, threshold: number): number | null {
  let best: number | null = null;
  let bestDistance = Math.max(0, threshold);
  for (let index = 0; index < stroke.points.length - 1; index += 1) {
    const distance = segmentDistance(point, stroke.points[index]!, stroke.points[index + 1]!);
    if (distance <= bestDistance) { best = index; bestDistance = distance; }
  }
  return best;
}

export function findNearestStroke(strokes: VectorStroke[], point: VectorPoint, threshold: number): VectorStroke | null {
  let best: VectorStroke | null = null;
  let bestDistance = Math.max(0, threshold);
  for (const stroke of strokes) {
    if (stroke.points.length === 1) {
      const distance = Math.hypot(point.x - stroke.points[0]!.x, point.y - stroke.points[0]!.y);
      if (distance <= bestDistance) { best = stroke; bestDistance = distance; }
      continue;
    }
    for (let index = 0; index < stroke.points.length - 1; index += 1) {
      const distance = segmentDistance(point, stroke.points[index]!, stroke.points[index + 1]!);
      if (distance <= bestDistance) { best = stroke; bestDistance = distance; }
    }
  }
  return best;
}

export function renderVectorStrokes(context: CanvasRenderingContext2D, strokes: VectorStroke[]): void {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    context.save();
    context.strokeStyle = stroke.color;
    context.globalAlpha = stroke.opacity;
    context.lineWidth = stroke.size;
    context.beginPath();
    context.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
    for (let index = 1; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1]!;
      const point = stroke.points[index]!;
      if (previous.outHandle || point.inHandle) {
        const c1 = previous.outHandle ?? previous;
        const c2 = point.inHandle ?? point;
        context.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, point.x, point.y);
      } else context.lineTo(point.x, point.y);
    }
    if (stroke.points.length === 1) context.lineTo(stroke.points[0]!.x + 0.01, stroke.points[0]!.y + 0.01);
    context.stroke();
    context.restore();
  }
  context.restore();
}

export function findNearestPointIndex(stroke: VectorStroke, point: VectorPoint, threshold: number): number | null {
  let best: number | null = null;
  let bestDistance = Math.max(0, threshold);
  stroke.points.forEach((candidate, index) => {
    const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
    if (distance <= bestDistance) { best = index; bestDistance = distance; }
  });
  return best;
}

export function updateVectorPoint(stroke: VectorStroke, index: number, point: VectorPoint): VectorStroke {
  if (index < 0 || index >= stroke.points.length) return stroke;
  const old = stroke.points[index]!;
  const dx = point.x - old.x;
  const dy = point.y - old.y;
  return {
    ...stroke,
    points: stroke.points.map((candidate, candidateIndex) => candidateIndex === index ? {
      ...clonePoint(candidate),
      x: point.x,
      y: point.y,
      ...(candidate.inHandle ? { inHandle: { x: candidate.inHandle.x + dx, y: candidate.inHandle.y + dy } } : {}),
      ...(candidate.outHandle ? { outHandle: { x: candidate.outHandle.x + dx, y: candidate.outHandle.y + dy } } : {})
    } : clonePoint(candidate))
  };
}

export function eraseVectorSegment(stroke: VectorStroke, point: VectorPoint, threshold: number): VectorStroke[] {
  const index = nearestVectorSegmentIndex(stroke, point, threshold);
  if (index === null) return [stroke];
  const leftPoints = stroke.points.slice(0, index + 1).map(clonePoint);
  const rightPoints = stroke.points.slice(index + 1).map(clonePoint);
  const pieces: VectorStroke[] = [];
  if (leftPoints.length >= 2) pieces.push({ ...stroke, id: `${stroke.id}-a`, points: leftPoints });
  if (rightPoints.length >= 2) pieces.push({ ...stroke, id: `${stroke.id}-b`, points: rightPoints });
  return pieces;
}

function perpendicularDistance(point: VectorPoint, start: VectorPoint, end: VectorPoint): number {
  return pointSegmentDistance(point, start, end);
}

function simplifyPoints(points: VectorPoint[], tolerance: number): VectorPoint[] {
  if (points.length <= 2) return points.map(clonePoint);
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i]!, points[0]!, points[points.length - 1]!);
    if (distance > maxDistance) { index = i; maxDistance = distance; }
  }
  if (maxDistance > tolerance) {
    const left = simplifyPoints(points.slice(0, index + 1), tolerance);
    const right = simplifyPoints(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [clonePoint(points[0]!), clonePoint(points[points.length - 1]!)];
}

export function simplifyVectorStroke(stroke: VectorStroke, tolerance: number): VectorStroke {
  return { ...stroke, points: simplifyPoints(stroke.points, Math.max(0, tolerance)) };
}

function endpointDistance(a: VectorPoint, b: VectorPoint): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function reversePoints(points: VectorPoint[]): VectorPoint[] {
  return [...points].reverse().map((point) => ({
    x: point.x,
    y: point.y,
    ...(point.outHandle ? { inHandle: { ...point.outHandle } } : {}),
    ...(point.inHandle ? { outHandle: { ...point.inHandle } } : {})
  }));
}

export function connectVectorStrokes(a: VectorStroke, b: VectorStroke, id: string): VectorStroke {
  const variants = [
    { a: a.points.map(clonePoint), b: b.points.map(clonePoint), d: endpointDistance(a.points.at(-1)!, b.points[0]!) },
    { a: a.points.map(clonePoint), b: reversePoints(b.points), d: endpointDistance(a.points.at(-1)!, b.points.at(-1)!) },
    { a: reversePoints(a.points), b: b.points.map(clonePoint), d: endpointDistance(a.points[0]!, b.points[0]!) },
    { a: reversePoints(a.points), b: reversePoints(b.points), d: endpointDistance(a.points[0]!, b.points.at(-1)!) }
  ];
  variants.sort((x, y) => x.d - y.d);
  const best = variants[0]!;
  const duplicateEndpoint = endpointDistance(best.a.at(-1)!, best.b[0]!) < 1e-6;
  return { ...a, id, points: [...best.a, ...best.b.slice(duplicateEndpoint ? 1 : 0)] };
}

export function redrawVectorSegment(stroke: VectorStroke, startIndex: number, endIndex: number, points: VectorPoint[]): VectorStroke {
  const start = Math.max(0, Math.min(startIndex, endIndex));
  const end = Math.min(stroke.points.length - 1, Math.max(startIndex, endIndex));
  return { ...stroke, points: [...stroke.points.slice(0, start).map(clonePoint), ...points.map(clonePoint), ...stroke.points.slice(end + 1).map(clonePoint)] };
}
