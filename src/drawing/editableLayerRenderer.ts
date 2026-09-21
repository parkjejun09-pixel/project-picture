import {
  decodeMaterialAsset,
  type EditableLayerData,
  type MangaEffectLayerData,
  type MaterialLayerData,
  type TextLayerData
} from './editableLayers.js';

export interface MangaEffectLine { x1: number; y1: number; x2: number; y2: number; width: number; }
export type CanvasFactory = (width: number, height: number) => HTMLCanvasElement;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

export function buildMangaEffectLines(data: MangaEffectLayerData, canvasWidth: number, canvasHeight: number): MangaEffectLine[] {
  const random = seededRandom(data.seed);
  const lines: MangaEffectLine[] = [];
  const baseAngle = data.angle * Math.PI / 180;
  const extent = Math.hypot(canvasWidth, canvasHeight);
  for (let index = 0; index < data.count; index += 1) {
    const width = data.width * (0.35 + random() * 0.65);
    const length = data.length * (0.5 + random() * 0.5);
    if (data.effect === 'focus') {
      const angle = baseAngle + (index / data.count) * Math.PI * 2 + (random() - 0.5) * (Math.PI * 2 / data.count);
      const cos = Math.cos(angle); const sin = Math.sin(angle);
      const xDistance = cos > 0 ? (canvasWidth - data.centerX) / cos : cos < 0 ? -data.centerX / cos : Number.POSITIVE_INFINITY;
      const yDistance = sin > 0 ? (canvasHeight - data.centerY) / sin : sin < 0 ? -data.centerY / sin : Number.POSITIVE_INFINITY;
      const edgeDistance = Math.max(0, Math.min(xDistance, yDistance));
      const outer = edgeDistance * (0.82 + random() * 0.18);
      const inner = Math.max(0, outer - length);
      lines.push({
        x1: data.centerX + Math.cos(angle) * inner, y1: data.centerY + Math.sin(angle) * inner,
        x2: data.centerX + Math.cos(angle) * outer, y2: data.centerY + Math.sin(angle) * outer,
        width
      });
    } else {
      const along = (random() - 0.5) * extent;
      const across = (random() - 0.5) * extent;
      const cos = Math.cos(baseAngle); const sin = Math.sin(baseAngle);
      const cx = data.centerX + cos * along - sin * across;
      const cy = data.centerY + sin * along + cos * across;
      lines.push({ x1: cx - cos * length / 2, y1: cy - sin * length / 2, x2: cx + cos * length / 2, y2: cy + sin * length / 2, width });
    }
  }
  return lines;
}

function pathRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y); context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r); context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height); context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r); context.quadraticCurveTo(x, y, x + r, y);
}

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function graphemes(value: string): string[] {
  return Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment);
}

function lineWidth(context: CanvasRenderingContext2D, line: string, letterSpacing: number): number {
  if (letterSpacing === 0) return context.measureText(line).width;
  const segments = graphemes(line);
  return segments.reduce((total, segment) => total + context.measureText(segment).width, 0) + Math.max(0, segments.length - 1) * letterSpacing;
}

function drawTextLine(context: CanvasRenderingContext2D, data: TextLayerData, line: string, y: number): void {
  let x = data.x;
  const width = lineWidth(context, line, data.letterSpacing);
  if (data.alignment === 'center') x -= width / 2;
  if (data.alignment === 'right') x -= width;
  if (data.letterSpacing === 0) {
    if (data.outlineWidth > 0) context.strokeText(line, x, y);
    context.fillText(line, x, y);
    return;
  }
  for (const grapheme of graphemes(line)) {
    if (data.outlineWidth > 0) context.strokeText(grapheme, x, y);
    context.fillText(grapheme, x, y);
    x += context.measureText(grapheme).width + data.letterSpacing;
  }
}

export class EditableLayerRenderer {
  private readonly materialCache = new Map<string, HTMLCanvasElement>();

  constructor(private readonly createCanvas: CanvasFactory) {}

  render(data: EditableLayerData, width: number, height: number): HTMLCanvasElement {
    const canvas = this.createCanvas(width, height);
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Editable layer context is unavailable.');
    if (data.kind === 'text') this.renderText(context, data);
    else if (data.kind === 'balloon') this.renderBalloon(context, data);
    else if (data.kind === 'panel') this.renderPanel(context, data, width, height);
    else if (data.kind === 'screen-tone') this.renderTone(context, data, width, height);
    else if (data.kind === 'manga-effect') {
      context.strokeStyle = data.color; context.lineCap = 'round';
      for (const line of buildMangaEffectLines(data, width, height)) {
        context.lineWidth = line.width; context.beginPath(); context.moveTo(line.x1, line.y1); context.lineTo(line.x2, line.y2); context.stroke();
      }
    } else this.renderMaterial(context, data, width, height);
    return canvas;
  }

  evictUnusedMaterials(layers: readonly EditableLayerData[]): void {
    const active = new Set(layers.filter((layer): layer is MaterialLayerData => layer.kind === 'material').map((layer) => this.materialKey(layer)));
    for (const key of this.materialCache.keys()) if (!active.has(key)) this.materialCache.delete(key);
  }

  private renderText(context: CanvasRenderingContext2D, data: TextLayerData): void {
    context.save(); context.textBaseline = 'top'; context.font = `${data.fontWeight} ${data.fontSize}px ${data.fontFamily}`;
    context.fillStyle = data.fillColor; context.strokeStyle = data.outlineColor; context.lineWidth = data.outlineWidth * 2; context.lineJoin = 'round';
    data.content.split(/\r\n?|\n/).forEach((line, index) => drawTextLine(context, data, line, data.y + index * data.fontSize * data.lineHeight));
    context.restore();
  }

  private renderPanel(context: CanvasRenderingContext2D, data: Extract<EditableLayerData, { kind: 'panel' }>, width: number, height: number): void {
    const availableWidth = Math.max(0, width - data.margin * 2 - data.gutter * (data.columns - 1));
    const availableHeight = Math.max(0, height - data.margin * 2 - data.gutter * (data.rows - 1));
    const cellWidth = availableWidth / data.columns; const cellHeight = availableHeight / data.rows;
    context.strokeStyle = data.strokeColor; context.lineWidth = data.strokeWidth;
    for (let row = 0; row < data.rows; row += 1) for (let column = 0; column < data.columns; column += 1) {
      context.strokeRect(data.margin + column * (cellWidth + data.gutter), data.margin + row * (cellHeight + data.gutter), cellWidth, cellHeight);
    }
  }

  private renderBalloon(context: CanvasRenderingContext2D, data: Extract<EditableLayerData, { kind: 'balloon' }>): void {
    const centerX = data.x + data.width / 2; const bottom = data.y + data.height;
    const halfBase = Math.min(data.tailBaseSize / 2, data.width / 2);
    const leftX = centerX - halfBase; const rightX = centerX + halfBase;
    let leftY = bottom; let rightY = bottom;
    context.fillStyle = data.fillColor; context.strokeStyle = data.strokeColor;
    context.lineWidth = data.strokeWidth; context.lineJoin = 'round'; context.lineCap = 'round';
    context.beginPath();
    if (data.shape === 'ellipse') {
      context.ellipse(centerX, data.y + data.height / 2, data.width / 2, data.height / 2, 0, 0, Math.PI * 2);
      const normalized = Math.min(1, halfBase / (data.width / 2));
      const offsetY = data.height / 2 * Math.sqrt(Math.max(0, 1 - normalized * normalized));
      leftY = data.y + data.height / 2 + offsetY; rightY = leftY;
    } else pathRoundedRect(context, data.x, data.y, data.width, data.height, data.cornerRadius);
    context.moveTo(leftX, leftY); context.lineTo(data.tailEndX, data.tailEndY); context.lineTo(rightX, rightY); context.closePath();
    context.fill();
    if (data.strokeWidth <= 0) return;
    context.beginPath();
    if (data.shape === 'ellipse') {
      const radiusX = data.width / 2; const radiusY = data.height / 2;
      const rightAngle = Math.acos(Math.min(1, halfBase / radiusX));
      const leftAngle = Math.PI - rightAngle;
      context.ellipse(centerX, data.y + radiusY, radiusX, radiusY, 0, leftAngle, rightAngle, false);
    } else {
      const r = Math.min(data.cornerRadius, data.width / 2, data.height / 2);
      context.moveTo(rightX, bottom); context.lineTo(data.x + data.width - r, bottom);
      context.quadraticCurveTo(data.x + data.width, bottom, data.x + data.width, bottom - r);
      context.lineTo(data.x + data.width, data.y + r); context.quadraticCurveTo(data.x + data.width, data.y, data.x + data.width - r, data.y);
      context.lineTo(data.x + r, data.y); context.quadraticCurveTo(data.x, data.y, data.x, data.y + r);
      context.lineTo(data.x, bottom - r); context.quadraticCurveTo(data.x, bottom, data.x + r, bottom); context.lineTo(leftX, bottom);
    }
    context.moveTo(leftX, leftY); context.lineTo(data.tailEndX, data.tailEndY); context.lineTo(rightX, rightY);
    context.stroke();
  }

  private renderTone(context: CanvasRenderingContext2D, data: Extract<EditableLayerData, { kind: 'screen-tone' }>, width: number, height: number): void {
    context.save(); context.translate(width / 2, height / 2); context.rotate(data.angle * Math.PI / 180); context.translate(-width / 2, -height / 2);
    const spacing = Math.max(0.5, data.frequency);
    const tileSize = Math.max(1, Math.ceil(spacing));
    const tile = this.createCanvas(tileSize, tileSize); const tileContext = tile.getContext('2d', { alpha: true });
    if (!tileContext) throw new Error('Screen tone tile context is unavailable.');
    if (data.pattern === 'dots') {
      const radius = Math.min(tileSize / 2, spacing * 0.45 * Math.sqrt(data.density));
      tileContext.fillStyle = data.color; tileContext.beginPath(); tileContext.arc(tileSize / 2, tileSize / 2, radius, 0, Math.PI * 2); tileContext.fill();
    } else {
      tileContext.strokeStyle = data.color; tileContext.lineWidth = Math.max(0.5, spacing * data.density);
      tileContext.beginPath(); tileContext.moveTo(0, tileSize / 2); tileContext.lineTo(tileSize, tileSize / 2); tileContext.stroke();
    }
    const pattern = context.createPattern(tile, 'repeat');
    if (pattern) { context.fillStyle = pattern; const extent = Math.hypot(width, height); context.fillRect(-extent, -extent, width + extent * 2, height + extent * 2); }
    context.restore();
  }

  private materialKey(data: MaterialLayerData): string { return `${data.asset.width}x${data.asset.height}:${data.asset.rgba}`; }

  private materialSource(data: MaterialLayerData): HTMLCanvasElement {
    const key = this.materialKey(data); const cached = this.materialCache.get(key); if (cached) return cached;
    const source = this.createCanvas(data.asset.width, data.asset.height); const context = source.getContext('2d', { alpha: true });
    if (!context) throw new Error('Material source context is unavailable.');
    context.putImageData(new ImageData(decodeMaterialAsset(data.asset), data.asset.width, data.asset.height), 0, 0);
    this.materialCache.set(key, source); return source;
  }

  private renderMaterial(context: CanvasRenderingContext2D, data: MaterialLayerData, width: number, height: number): void {
    const source = this.materialSource(data);
    const radians = data.rotation * Math.PI / 180; const cos = Math.cos(radians); const sin = Math.sin(radians);
    const canvasCorners: ReadonlyArray<readonly [number, number]> = [[0, 0], [width, 0], [0, height], [width, height]];
    const localCorners = canvasCorners.map(([x, y]) => {
      const dx = x - data.x; const dy = y - data.y;
      return { x: (cos * dx + sin * dy) / data.scale, y: (-sin * dx + cos * dy) / data.scale };
    });
    const minX = Math.min(...localCorners.map((point) => point.x)); const maxX = Math.max(...localCorners.map((point) => point.x));
    const minY = Math.min(...localCorners.map((point) => point.y)); const maxY = Math.max(...localCorners.map((point) => point.y));
    context.save(); context.translate(data.x, data.y); context.rotate(radians); context.scale(data.scale, data.scale);
    if (data.materialType === 'image' && data.repeat === 'no-repeat') context.drawImage(source, -source.width / 2, -source.height / 2);
    else {
      const pattern = context.createPattern(source, data.repeat); if (pattern) { context.fillStyle = pattern; context.fillRect(minX, minY, maxX - minX, maxY - minY); }
    }
    context.restore();
  }
}
