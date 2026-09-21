export type PaintTool = 'brush' | 'eraser';

export interface DabStyle {
  compositeOperation: GlobalCompositeOperation;
  fillStyle: string;
  globalAlpha: number;
  radius: number;
}

export function getDabStyle(
  tool: PaintTool,
  color: string,
  opacity: number,
  size: number
): DabStyle {
  return {
    compositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
    fillStyle: color,
    globalAlpha: opacity,
    radius: Math.max(0.5, size / 2)
  };
}

export function drawDab(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: DabStyle
): void {
  context.save();
  context.globalCompositeOperation = style.compositeOperation;
  context.globalAlpha = style.globalAlpha;
  context.fillStyle = style.fillStyle;
  context.beginPath();
  context.arc(x, y, style.radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export interface DynamicPaintDabStyle {
  compositeOperation: GlobalCompositeOperation;
  fillStyle: string;
  globalAlpha: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  hardness: number;
}

export function drawDynamicDab(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: DynamicPaintDabStyle
): void {
  context.save();
  context.globalCompositeOperation = style.compositeOperation;
  context.globalAlpha = style.globalAlpha;
  context.translate(x, y);
  context.rotate(style.rotation);
  context.scale(Math.max(0.01, style.radiusX), Math.max(0.01, style.radiusY));
  context.beginPath();
  context.arc(0, 0, 1, 0, Math.PI * 2);

  if (style.hardness >= 0.985) {
    context.fillStyle = style.fillStyle;
  } else {
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    const hardStop = Math.min(0.94, Math.max(0.02, style.hardness));
    gradient.addColorStop(0, style.fillStyle);
    gradient.addColorStop(hardStop, style.fillStyle);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
  }

  context.fill();
  context.restore();
}
