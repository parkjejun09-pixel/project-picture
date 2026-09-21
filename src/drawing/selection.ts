export interface SelectionPoint { x: number; y: number; }
export interface SelectionRect { x: number; y: number; width: number; height: number; }

export function normalizeSelectionRect(a: SelectionPoint, b: SelectionPoint): SelectionRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

export function clampSelectionRect(rect: SelectionRect, width: number, height: number): SelectionRect {
  const x1 = Math.max(0, Math.min(width, rect.x));
  const y1 = Math.max(0, Math.min(height, rect.y));
  const x2 = Math.max(0, Math.min(width, rect.x + rect.width));
  const y2 = Math.max(0, Math.min(height, rect.y + rect.height));
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
}

export function translateSelectionRect(rect: SelectionRect, dx: number, dy: number, width: number, height: number): SelectionRect {
  const maxX = Math.max(0, width - rect.width);
  const maxY = Math.max(0, height - rect.height);
  return {
    ...rect,
    x: Math.max(0, Math.min(maxX, rect.x + dx)),
    y: Math.max(0, Math.min(maxY, rect.y + dy))
  };
}

export function rectContainsPoint(rect: SelectionRect, point: SelectionPoint): boolean {
  return point.x >= rect.x && point.y >= rect.y && point.x <= rect.x + rect.width && point.y <= rect.y + rect.height;
}
