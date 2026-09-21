import type { SelectionPoint, SelectionRect } from './selection.js';

export type TransformCorner = 'tl' | 'tr' | 'br' | 'bl';
export type TransformHandle = TransformCorner | 'n' | 'e' | 's' | 'w';

export interface TransformQuad {
  tl: SelectionPoint;
  tr: SelectionPoint;
  br: SelectionPoint;
  bl: SelectionPoint;
}

export interface TransformMesh {
  columns: number;
  rows: number;
  points: SelectionPoint[];
}

export interface AffineMatrix { a: number; b: number; c: number; d: number; e: number; f: number; }

export function rotatedRect90(rect: SelectionRect): SelectionRect {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return { x: cx - rect.height / 2, y: cy - rect.width / 2, width: rect.height, height: rect.width };
}

export function scaleRectFromCenter(rect: SelectionRect, factor: number): SelectionRect {
  const safe = Number.isFinite(factor) ? Math.max(0.05, factor) : 1;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const width = rect.width * safe;
  const height = rect.height * safe;
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

export function rectToQuad(rect: SelectionRect): TransformQuad {
  return {
    tl: { x: rect.x, y: rect.y },
    tr: { x: rect.x + rect.width, y: rect.y },
    br: { x: rect.x + rect.width, y: rect.y + rect.height },
    bl: { x: rect.x, y: rect.y + rect.height }
  };
}

export function quadPoints(quad: TransformQuad): SelectionPoint[] { return [quad.tl, quad.tr, quad.br, quad.bl]; }

export function quadBounds(quad: TransformQuad): SelectionRect {
  const points = quadPoints(quad);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function quadCenter(quad: TransformQuad): SelectionPoint {
  const points = quadPoints(quad);
  return { x: points.reduce((sum, p) => sum + p.x, 0) / 4, y: points.reduce((sum, p) => sum + p.y, 0) / 4 };
}

export function translateQuad(quad: TransformQuad, dx: number, dy: number): TransformQuad {
  const move = (p: SelectionPoint): SelectionPoint => ({ x: p.x + dx, y: p.y + dy });
  return { tl: move(quad.tl), tr: move(quad.tr), br: move(quad.br), bl: move(quad.bl) };
}

export function rotatePoint(point: SelectionPoint, center: SelectionPoint, radians: number): SelectionPoint {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

export function rotateQuad(quad: TransformQuad, radians: number, center = quadCenter(quad)): TransformQuad {
  return {
    tl: rotatePoint(quad.tl, center, radians),
    tr: rotatePoint(quad.tr, center, radians),
    br: rotatePoint(quad.br, center, radians),
    bl: rotatePoint(quad.bl, center, radians)
  };
}

function rectFromHandle(bounds: SelectionRect, handle: TransformHandle, point: SelectionPoint): SelectionRect {
  let left = bounds.x;
  let right = bounds.x + bounds.width;
  let top = bounds.y;
  let bottom = bounds.y + bounds.height;
  if (handle.includes('w') || handle === 'w') left = point.x;
  if (handle.includes('e') || handle === 'e') right = point.x;
  if (handle.includes('n') || handle === 'n') top = point.y;
  if (handle.includes('s') || handle === 's') bottom = point.y;
  if (handle === 'tl') { left = point.x; top = point.y; }
  if (handle === 'tr') { right = point.x; top = point.y; }
  if (handle === 'br') { right = point.x; bottom = point.y; }
  if (handle === 'bl') { left = point.x; bottom = point.y; }
  return { x: Math.min(left, right), y: Math.min(top, bottom), width: Math.abs(right - left), height: Math.abs(bottom - top) };
}

export function scaleQuadFromHandle(quad: TransformQuad, handle: TransformHandle, point: SelectionPoint, preserveAspect: boolean): TransformQuad {
  const bounds = quadBounds(quad);
  let next = rectFromHandle(bounds, handle, point);
  if (preserveAspect && bounds.width > 0 && bounds.height > 0 && (handle === 'tl' || handle === 'tr' || handle === 'br' || handle === 'bl')) {
    const aspect = bounds.width / bounds.height;
    let width = next.width;
    let height = next.height;
    if (width / Math.max(height, 1e-6) > aspect) height = width / aspect;
    else width = height * aspect;
    const fixed = handle === 'tl' ? quad.br : handle === 'tr' ? quad.bl : handle === 'br' ? quad.tl : quad.tr;
    next = {
      x: handle === 'tr' || handle === 'br' ? fixed.x : fixed.x - width,
      y: handle === 'bl' || handle === 'br' ? fixed.y : fixed.y - height,
      width,
      height
    };
  }
  return rectToQuad(next);
}

export function updateDistortCorner(quad: TransformQuad, corner: TransformCorner, point: SelectionPoint): TransformQuad {
  return { ...quad, [corner]: { ...point } };
}

export function updatePerspectiveCorner(quad: TransformQuad, corner: TransformCorner, point: SelectionPoint): TransformQuad {
  const next: TransformQuad = {
    tl: { ...quad.tl }, tr: { ...quad.tr }, br: { ...quad.br }, bl: { ...quad.bl }
  };
  next[corner] = { ...point };
  if (corner === 'tl') next.tr.y = point.y;
  else if (corner === 'tr') next.tl.y = point.y;
  else if (corner === 'bl') next.br.y = point.y;
  else if (corner === 'br') next.bl.y = point.y;
  return next;
}

export function createMeshGrid(rect: SelectionRect, columns = 3, rows = 3): TransformMesh {
  const cols = Math.max(2, Math.round(columns));
  const rs = Math.max(2, Math.round(rows));
  const points: SelectionPoint[] = [];
  for (let row = 0; row < rs; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      points.push({
        x: rect.x + rect.width * (column / (cols - 1)),
        y: rect.y + rect.height * (row / (rs - 1))
      });
    }
  }
  return { columns: cols, rows: rs, points };
}

export function moveMeshPoint(mesh: TransformMesh, index: number, point: SelectionPoint): TransformMesh {
  if (index < 0 || index >= mesh.points.length) return mesh;
  return { ...mesh, points: mesh.points.map((candidate, i) => i === index ? { ...point } : { ...candidate }) };
}

export function meshBounds(mesh: TransformMesh): SelectionRect {
  const xs = mesh.points.map((p) => p.x);
  const ys = mesh.points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function bilinearQuadPoint(quad: TransformQuad, u: number, v: number): SelectionPoint {
  const top = { x: quad.tl.x + (quad.tr.x - quad.tl.x) * u, y: quad.tl.y + (quad.tr.y - quad.tl.y) * u };
  const bottom = { x: quad.bl.x + (quad.br.x - quad.bl.x) * u, y: quad.bl.y + (quad.br.y - quad.bl.y) * u };
  return { x: top.x + (bottom.x - top.x) * v, y: top.y + (bottom.y - top.y) * v };
}

export function affineFromTriangles(source: readonly [SelectionPoint, SelectionPoint, SelectionPoint], destination: readonly [SelectionPoint, SelectionPoint, SelectionPoint]): AffineMatrix {
  const [s0, s1, s2] = source;
  const [d0, d1, d2] = destination;
  const det = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(det) < 1e-9) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const solve = (v0: number, v1: number, v2: number): [number, number, number] => {
    const A = (v0 * (s1.y - s2.y) + v1 * (s2.y - s0.y) + v2 * (s0.y - s1.y)) / det;
    const C = (v0 * (s2.x - s1.x) + v1 * (s0.x - s2.x) + v2 * (s1.x - s0.x)) / det;
    const E = (v0 * (s1.x * s2.y - s2.x * s1.y) + v1 * (s2.x * s0.y - s0.x * s2.y) + v2 * (s0.x * s1.y - s1.x * s0.y)) / det;
    return [A, C, E];
  };
  const [a, c, e] = solve(d0.x, d1.x, d2.x);
  const [b, d, f] = solve(d0.y, d1.y, d2.y);
  return { a, b, c, d, e, f };
}
