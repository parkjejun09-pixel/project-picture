import type { DynamicDabStyle } from './brushDynamics.js';
import type { StrokeSample } from './stroke.js';

export interface BrushTextureMap {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface BrushTextureSettings {
  strength: number;
  scale: number;
  rotation: number;
  paperGrain: number;
  map?: BrushTextureMap | null;
}

export interface TaperSettings {
  start: number;
  end: number;
  length: number;
}

export interface AdvancedBrushSettings {
  flow: number;
  velocitySize: number;
  rotation: number;
  taper: number;
  taperStart?: number;
  taperEnd?: number;
  taperLength?: number;
  scatter: number;
  sizeJitter: number;
  angleJitter: number;
  colorJitter: number;
  grain: number;
  textureStrength?: number;
  textureScale?: number;
  textureRotation?: number;
  paperGrain?: number;
  textureMap?: BrushTextureMap | null;
  dualBrush: number;
}

export interface AdvancedDab {
  x: number;
  y: number;
  style: DynamicDabStyle;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

function noise(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function hexRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const value = Number.parseInt(match[1]!, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function jitterColor(hex: string, amount: number, seed: number): string {
  const rgb = hexRgb(hex);
  if (!rgb || amount <= 0) return hex;
  const offsets = [noise(seed + 1), noise(seed + 2), noise(seed + 3)].map((n) => (n * 2 - 1) * 72 * amount);
  const out = rgb.map((channel, index) => Math.round(Math.min(255, Math.max(0, channel + offsets[index]!))));
  return `#${out.map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function strokeProgress(index: number, total: number): number {
  const safeTotal = Math.max(1, Math.floor(Number.isFinite(total) ? total : 1));
  if (safeTotal <= 1) return 1;
  const safeIndex = Math.max(0, Math.min(safeTotal - 1, Math.floor(Number.isFinite(index) ? index : 0)));
  return safeIndex / (safeTotal - 1);
}

export function taperEnvelope(progress: number, settings: TaperSettings): number {
  const p = clamp01(progress);
  const length = Math.max(0.02, Math.min(0.5, Number.isFinite(settings.length) ? settings.length : 0.25));
  const start = clamp01(settings.start);
  const end = clamp01(settings.end);
  const startRamp = Math.min(1, p / length);
  const endRamp = Math.min(1, (1 - p) / length);
  const startScale = 1 - start * (1 - startRamp);
  const endScale = 1 - end * (1 - endRamp);
  return Math.max(0.03, Math.min(startScale, endScale));
}

function proceduralTexture(x: number, y: number, seed: number): number {
  const a = Math.sin(x * 0.173 + y * 0.117 + seed * 0.071);
  const b = Math.sin(x * 0.047 - y * 0.193 + seed * 0.131);
  const c = Math.sin((x + y) * 0.311 + seed * 0.023);
  return Math.max(0, Math.min(1, 0.5 + a * 0.22 + b * 0.17 + c * 0.11));
}

export function textureSample(x: number, y: number, settings: BrushTextureSettings, seed = 0): number {
  const strength = clamp01(settings.strength);
  const paper = clamp01(settings.paperGrain);
  const scale = Math.max(0.15, Math.min(8, Number.isFinite(settings.scale) ? settings.scale : 1));
  const angle = (Number.isFinite(settings.rotation) ? settings.rotation : 0) * Math.PI * 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const sx = (x * cos - y * sin) / scale;
  const sy = (x * sin + y * cos) / scale;
  let source = proceduralTexture(sx, sy, seed);
  const map = settings.map;
  if (map && map.width > 0 && map.height > 0 && map.data.length >= map.width * map.height) {
    const mx = ((Math.floor(sx) % map.width) + map.width) % map.width;
    const my = ((Math.floor(sy) % map.height) + map.height) % map.height;
    source = (map.data[my * map.width + mx] ?? 255) / 255;
  }
  const paperNoise = proceduralTexture(x / 2.8, y / 2.8, seed + 193);
  const combined = source * (1 - paper * 0.55) + source * paperNoise * paper * 0.55;
  return Math.max(0.06, Math.min(1, 1 - strength * (1 - combined)));
}

export function textureMapFromRgba(data: Uint8ClampedArray, width: number, height: number): BrushTextureMap {
  const out = new Uint8Array(Math.max(0, width * height));
  for (let index = 0; index < out.length; index += 1) {
    const offset = index * 4;
    const r = data[offset] ?? 255;
    const g = data[offset + 1] ?? 255;
    const b = data[offset + 2] ?? 255;
    const a = (data[offset + 3] ?? 255) / 255;
    const luminance = Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * a + 255 * (1 - a));
    out[index] = luminance;
  }
  return { width, height, data: out };
}

export function buildAdvancedDab(
  baseStyle: DynamicDabStyle,
  sample: StrokeSample,
  previous: StrokeSample | null,
  settings: AdvancedBrushSettings,
  index: number,
  progress: number
): AdvancedDab {
  const seed = index * 97 + Math.round(sample.x * 3.1) + Math.round(sample.y * 5.7);
  const flow = clamp01(settings.flow);
  const speed = previous ? Math.min(1, Math.hypot(sample.x - previous.x, sample.y - previous.y) / 32) : 0;
  const velocityScale = 1 - clamp01(settings.velocitySize) * speed * 0.72;
  const sizeNoise = 1 + (noise(seed + 4) * 2 - 1) * clamp01(settings.sizeJitter) * 0.45;
  const taper = clamp01(settings.taper);
  const taperScale = taperEnvelope(progress, {
    start: settings.taperStart ?? taper,
    end: settings.taperEnd ?? taper,
    length: settings.taperLength ?? 0.2
  });
  const sizeScale = Math.max(0.08, velocityScale * sizeNoise * taperScale);

  const scatterAmount = clamp01(settings.scatter) * Math.max(baseStyle.radiusX, baseStyle.radiusY) * 1.8;
  const scatterAngle = noise(seed + 5) * Math.PI * 2;
  const scatterRadius = (noise(seed + 6) * 2 - 1) * scatterAmount;
  const x = sample.x + Math.cos(scatterAngle) * scatterRadius;
  const y = sample.y + Math.sin(scatterAngle) * scatterRadius;

  const angleJitter = (noise(seed + 7) * 2 - 1) * Math.PI * clamp01(settings.angleJitter);
  const rotation = baseStyle.rotation + settings.rotation * Math.PI * 2 + angleJitter;
  const grainMod = 1 - clamp01(settings.grain) * 0.22 * noise(seed + 8);
  const textureMod = textureSample(x, y, {
    strength: settings.textureStrength ?? settings.grain,
    scale: settings.textureScale ?? 1,
    rotation: settings.textureRotation ?? settings.rotation,
    paperGrain: settings.paperGrain ?? 0,
    map: settings.textureMap ?? null
  }, seed);
  const dualMod = 1 - clamp01(settings.dualBrush) * 0.3 * (0.5 + 0.5 * Math.sin(seed * 0.7));

  return {
    x,
    y,
    style: {
      ...baseStyle,
      fillStyle: jitterColor(baseStyle.fillStyle, clamp01(settings.colorJitter), seed),
      globalAlpha: Math.max(0.005, Math.min(1, baseStyle.globalAlpha * flow * grainMod * textureMod * dualMod)),
      radiusX: Math.max(0.35, baseStyle.radiusX * sizeScale),
      radiusY: Math.max(0.35, baseStyle.radiusY * sizeScale),
      rotation
    }
  };
}
