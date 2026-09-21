export type EditableLayerKind = 'text' | 'balloon' | 'panel' | 'screen-tone' | 'manga-effect' | 'material';
export type TextAlignment = 'left' | 'center' | 'right';
export type BalloonShape = 'ellipse' | 'rounded-rectangle';
export type ScreenTonePattern = 'dots' | 'lines';
export type MangaEffectType = 'speed' | 'focus';
export type MaterialType = 'image' | 'pattern' | 'texture';
export type MaterialRepeat = 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';

export interface TextLayerData {
  kind: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  alignment: TextAlignment;
  lineHeight: number;
  letterSpacing: number;
  fillColor: string;
  outlineColor: string;
  outlineWidth: number;
  x: number;
  y: number;
}

export interface BalloonLayerData {
  kind: 'balloon';
  shape: BalloonShape;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  tailEndX: number;
  tailEndY: number;
  tailBaseSize: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface PanelLayerData {
  kind: 'panel';
  rows: number;
  columns: number;
  margin: number;
  gutter: number;
  strokeColor: string;
  strokeWidth: number;
}

export interface ScreenToneLayerData {
  kind: 'screen-tone';
  pattern: ScreenTonePattern;
  frequency: number;
  angle: number;
  density: number;
  color: string;
}

export interface MangaEffectLayerData {
  kind: 'manga-effect';
  effect: MangaEffectType;
  seed: number;
  count: number;
  width: number;
  length: number;
  centerX: number;
  centerY: number;
  angle: number;
  color: string;
}

export interface MaterialAsset {
  width: number;
  height: number;
  rgba: string;
}

export interface MaterialLayerData {
  kind: 'material';
  materialType: MaterialType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  repeat: MaterialRepeat;
  asset: MaterialAsset;
}

export type EditableLayerData =
  | TextLayerData
  | BalloonLayerData
  | PanelLayerData
  | ScreenToneLayerData
  | MangaEffectLayerData
  | MaterialLayerData;

export type EditableLayerPatch = Partial<
  Omit<TextLayerData, 'kind'> &
  Omit<BalloonLayerData, 'kind'> &
  Omit<PanelLayerData, 'kind'> &
  Omit<ScreenToneLayerData, 'kind'> &
  Omit<MangaEffectLayerData, 'kind'> &
  Omit<MaterialLayerData, 'kind'>
>;

const EDITABLE_KINDS = new Set<EditableLayerKind>(['text', 'balloon', 'panel', 'screen-tone', 'manga-effect', 'material']);
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = new Map([...BASE64].map((character, index) => [character, index]));
const MAX_COORDINATE = 10_000_000;
const MAX_MATERIAL_BYTES = 64 * 1024 * 1024;

export function isEditableLayerKind(value: unknown): value is EditableLayerKind {
  return typeof value === 'string' && EDITABLE_KINDS.has(value as EditableLayerKind);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`Invalid ${label}`);
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) throw new Error(`Invalid ${label}`);
  return value;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error(`Invalid ${label}`);
  return value as T;
}

function finite(value: unknown, label: string, min = -MAX_COORDINATE, max = MAX_COORDINATE): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${label}`);
  return value;
}

function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${label}`);
  return value;
}

function decodeBase64(value: string): Uint8ClampedArray {
  if (value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('Invalid material RGBA base64');
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const byteLength = (value.length / 4) * 3 - padding;
  if (byteLength > MAX_MATERIAL_BYTES) throw new Error('Invalid material RGBA byte length');
  const output = new Uint8ClampedArray(byteLength);
  let outputIndex = 0;
  for (let index = 0; index < value.length; index += 4) {
    const a = BASE64_LOOKUP.get(value[index]!);
    const b = BASE64_LOOKUP.get(value[index + 1]!);
    const c = value[index + 2] === '=' ? 0 : BASE64_LOOKUP.get(value[index + 2]!);
    const d = value[index + 3] === '=' ? 0 : BASE64_LOOKUP.get(value[index + 3]!);
    if (a === undefined || b === undefined || c === undefined || d === undefined) throw new Error('Invalid material RGBA base64');
    const packed = (a << 18) | (b << 12) | (c << 6) | d;
    if (outputIndex < byteLength) output[outputIndex++] = (packed >>> 16) & 255;
    if (outputIndex < byteLength) output[outputIndex++] = (packed >>> 8) & 255;
    if (outputIndex < byteLength) output[outputIndex++] = packed & 255;
  }
  return output;
}

function base64ByteLength(value: string): number {
  if (value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('Invalid material RGBA base64');
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

function validateMaterialAsset(value: unknown): MaterialAsset {
  const asset = record(value, 'material asset');
  const width = integer(asset.width, 'material asset width', 1, 8192);
  const height = integer(asset.height, 'material asset height', 1, 8192);
  const expected = width * height * 4;
  if (expected > MAX_MATERIAL_BYTES) throw new Error('Invalid material RGBA byte length');
  const rgba = stringValue(asset.rgba, 'material RGBA');
  const byteLength = base64ByteLength(rgba);
  if (byteLength !== expected) throw new Error(`Invalid material RGBA byte length: expected ${expected}, got ${byteLength}`);
  return { width, height, rgba };
}

export function decodeMaterialAsset(asset: MaterialAsset): Uint8ClampedArray {
  const valid = validateMaterialAsset(asset);
  return decodeBase64(valid.rgba);
}

export function validateEditableLayerData(value: unknown): EditableLayerData {
  const data = record(value, 'editable layer data');
  const kind = enumValue(data.kind, ['text', 'balloon', 'panel', 'screen-tone', 'manga-effect', 'material'] as const, 'editable layer kind');
  if (kind === 'text') {
    return {
      kind,
      content: stringValue(data.content, 'text content', true),
      fontFamily: stringValue(data.fontFamily, 'text font family'),
      fontSize: finite(data.fontSize, 'text font size', 1, 4096),
      fontWeight: integer(data.fontWeight, 'text font weight', 100, 900),
      alignment: enumValue(data.alignment, ['left', 'center', 'right'] as const, 'text alignment'),
      lineHeight: finite(data.lineHeight, 'text line height', 0.1, 10),
      letterSpacing: finite(data.letterSpacing, 'text letter spacing', -1000, 1000),
      fillColor: stringValue(data.fillColor, 'text fill color'),
      outlineColor: stringValue(data.outlineColor, 'text outline color'),
      outlineWidth: finite(data.outlineWidth, 'text outline width', 0, 1024),
      x: finite(data.x, 'text x'),
      y: finite(data.y, 'text y')
    };
  }
  if (kind === 'balloon') {
    return {
      kind,
      shape: enumValue(data.shape, ['ellipse', 'rounded-rectangle'] as const, 'balloon shape'),
      x: finite(data.x, 'balloon x'), y: finite(data.y, 'balloon y'),
      width: finite(data.width, 'balloon width', 1, MAX_COORDINATE), height: finite(data.height, 'balloon height', 1, MAX_COORDINATE),
      cornerRadius: finite(data.cornerRadius, 'balloon corner radius', 0, MAX_COORDINATE),
      tailEndX: finite(data.tailEndX, 'balloon tail endpoint x'), tailEndY: finite(data.tailEndY, 'balloon tail endpoint y'),
      tailBaseSize: finite(data.tailBaseSize, 'balloon tail base size', 1, MAX_COORDINATE),
      fillColor: stringValue(data.fillColor, 'balloon fill color'), strokeColor: stringValue(data.strokeColor, 'balloon stroke color'),
      strokeWidth: finite(data.strokeWidth, 'balloon stroke width', 0, 1024)
    };
  }
  if (kind === 'panel') {
    return {
      kind,
      rows: integer(data.rows, 'panel rows', 1, 100), columns: integer(data.columns, 'panel columns', 1, 100),
      margin: finite(data.margin, 'panel margin', 0, MAX_COORDINATE), gutter: finite(data.gutter, 'panel gutter', 0, MAX_COORDINATE),
      strokeColor: stringValue(data.strokeColor, 'panel stroke color'), strokeWidth: finite(data.strokeWidth, 'panel stroke width', 0.1, 1024)
    };
  }
  if (kind === 'screen-tone') {
    return {
      kind,
      pattern: enumValue(data.pattern, ['dots', 'lines'] as const, 'screen tone pattern'),
      frequency: finite(data.frequency, 'screen tone frequency', 0.5, 4096),
      angle: finite(data.angle, 'screen tone angle', -360_000, 360_000),
      density: finite(data.density, 'screen tone density', 0.01, 1),
      color: stringValue(data.color, 'screen tone color')
    };
  }
  if (kind === 'manga-effect') {
    return {
      kind,
      effect: enumValue(data.effect, ['speed', 'focus'] as const, 'manga effect type'),
      seed: integer(data.seed, 'manga effect seed', 0, 0xffffffff),
      count: integer(data.count, 'manga effect count', 1, 2000),
      width: finite(data.width, 'manga effect width', 0.1, 1024), length: finite(data.length, 'manga effect length', 0.1, MAX_COORDINATE),
      centerX: finite(data.centerX, 'manga effect center x'), centerY: finite(data.centerY, 'manga effect center y'),
      angle: finite(data.angle, 'manga effect angle', -360_000, 360_000), color: stringValue(data.color, 'manga effect color')
    };
  }
  return {
    kind,
    materialType: enumValue(data.materialType, ['image', 'pattern', 'texture'] as const, 'material type'),
    x: finite(data.x, 'material x'), y: finite(data.y, 'material y'),
    scale: finite(data.scale, 'material scale', 0.001, 1000),
    rotation: finite(data.rotation, 'material rotation', -360_000, 360_000),
    repeat: enumValue(data.repeat, ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'] as const, 'material repeat'),
    asset: validateMaterialAsset(data.asset)
  };
}

export function cloneEditableLayerData<T extends EditableLayerData>(data: T): T {
  return (data.kind === 'material' ? { ...data, asset: { ...data.asset } } : { ...data }) as T;
}

type NonMaterialKind = Exclude<EditableLayerKind, 'material'>;
type NonMaterialData = Exclude<EditableLayerData, MaterialLayerData>;

export function createEditableLayerData(kind: NonMaterialKind, width: number, height: number): NonMaterialData;
export function createEditableLayerData(kind: 'material', width: number, height: number, asset: MaterialAsset): MaterialLayerData;
export function createEditableLayerData(kind: EditableLayerKind, width: number, height: number, asset?: MaterialAsset): EditableLayerData {
  const canvasWidth = finite(width, 'editable layer canvas width', 1, 100_000);
  const canvasHeight = finite(height, 'editable layer canvas height', 1, 100_000);
  if (kind === 'text') return { kind, content: 'Text', fontFamily: 'sans-serif', fontSize: 32, fontWeight: 400, alignment: 'left', lineHeight: 1.2, letterSpacing: 0, fillColor: '#000000', outlineColor: '#FFFFFF', outlineWidth: 0, x: canvasWidth / 2, y: canvasHeight / 2 };
  if (kind === 'balloon') {
    const balloonWidth = canvasWidth * 0.4; const balloonHeight = canvasHeight * 0.3;
    return { kind, shape: 'ellipse', x: (canvasWidth - balloonWidth) / 2, y: canvasHeight * 0.3, width: balloonWidth, height: balloonHeight, cornerRadius: 24, tailEndX: canvasWidth * 0.6, tailEndY: canvasHeight * 0.75, tailBaseSize: 32, fillColor: '#FFFFFF', strokeColor: '#000000', strokeWidth: 3 };
  }
  if (kind === 'panel') return { kind, rows: 2, columns: 2, margin: 24, gutter: 12, strokeColor: '#000000', strokeWidth: 4 };
  if (kind === 'screen-tone') return { kind, pattern: 'dots', frequency: 12, angle: 45, density: 0.5, color: '#000000' };
  if (kind === 'manga-effect') return { kind, effect: 'speed', seed: 1, count: 80, width: 2, length: Math.max(24, canvasWidth * 0.3), centerX: canvasWidth / 2, centerY: canvasHeight / 2, angle: 0, color: '#000000' };
  if (!asset) throw new Error('Material layer requires an imported asset');
  return { kind, materialType: 'image', x: canvasWidth / 2, y: canvasHeight / 2, scale: 1, rotation: 0, repeat: 'no-repeat', asset: validateMaterialAsset(asset) };
}
