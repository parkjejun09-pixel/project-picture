import type { Point } from './stroke.js';
import type { SelectionRect } from './selection.js';

export type ShapeType = 'line' | 'rectangle' | 'ellipse';

export function shapeBounds(start: Point, end: Point): SelectionRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

export function lineEndpoints(start: Point, end: Point): { x1: number; y1: number; x2: number; y2: number } {
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}
