import { normalizeHex } from './color.js';

export interface RGBColor { r: number; g: number; b: number; }
export interface HSVColor { h: number; s: number; v: number; }
export type HarmonyMode = 'analogous' | 'complementary' | 'split-complementary' | 'triadic' | 'monochromatic';
export type ColorVariantKey = 'tint' | 'shade' | 'tone' | 'warm' | 'cool';
export type ColorVariants = Record<ColorVariantKey, string[]>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function wrapHue(hue: number): number {
  const wrapped = hue % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function hexToRgb(hex: string): RGBColor {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error(`Invalid HEX color: ${hex}`);
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  };
}

export function rgbToHex(rgb: RGBColor): string {
  const channel = (value: number): string => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0').toUpperCase();
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

export function rgbToHsv(rgb: RGBColor): HSVColor {
  const r = clamp(rgb.r, 0, 255) / 255;
  const g = clamp(rgb.g, 0, 255) / 255;
  const b = clamp(rgb.b, 0, 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  return { h: wrapHue(h), s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToRgb(hsv: HSVColor): RGBColor {
  const h = wrapHue(hsv.h);
  const s = clamp(hsv.s, 0, 1);
  const v = clamp(hsv.v, 0, 1);
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - chroma;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) [r1, g1, b1] = [chroma, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, chroma, 0];
  else if (h < 180) [r1, g1, b1] = [0, chroma, x];
  else if (h < 240) [r1, g1, b1] = [0, x, chroma];
  else if (h < 300) [r1, g1, b1] = [x, 0, chroma];
  else [r1, g1, b1] = [chroma, 0, x];
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  };
}

export function hexToHsv(hex: string): HSVColor {
  return rgbToHsv(hexToRgb(hex));
}

export function hsvToHex(hsv: HSVColor): string {
  return rgbToHex(hsvToRgb(hsv));
}

function hueShift(base: HSVColor, offset: number, saturation = base.s, value = base.v): string {
  return hsvToHex({ h: base.h + offset, s: saturation, v: value });
}

export function generateHarmony(hex: string, mode: HarmonyMode): string[] {
  const base = hexToHsv(hex);
  switch (mode) {
    case 'analogous':
      return [-60, -30, 0, 30, 60].map((offset) => hueShift(base, offset));
    case 'complementary':
      return [0, 180, -22, 158, 202].map((offset) => hueShift(base, offset));
    case 'split-complementary':
      return [0, 150, 210, 165, 195].map((offset) => hueShift(base, offset));
    case 'triadic':
      return [0, 120, 240, 60, 300].map((offset) => hueShift(base, offset));
    case 'monochromatic':
      return [
        hsvToHex({ ...base, s: clamp(base.s * 0.35, 0, 1), v: clamp(base.v * 1.2, 0, 1) }),
        hsvToHex({ ...base, s: clamp(base.s * 0.65, 0, 1), v: clamp(base.v * 1.08, 0, 1) }),
        hsvToHex(base),
        hsvToHex({ ...base, s: clamp(base.s * 1.05, 0, 1), v: clamp(base.v * 0.78, 0, 1) }),
        hsvToHex({ ...base, s: clamp(base.s * 1.15, 0, 1), v: clamp(base.v * 0.58, 0, 1) })
      ];
  }
}

function mixRgb(a: RGBColor, b: RGBColor, amount: number): RGBColor {
  const t = clamp(amount, 0, 1);
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  };
}

export function generateColorVariants(hex: string): ColorVariants {
  const rgb = hexToRgb(hex);
  const hsv = rgbToHsv(rgb);
  const steps = [0.16, 0.32, 0.48, 0.64, 0.8];
  const tint = steps.map((amount) => rgbToHex(mixRgb(rgb, { r: 255, g: 255, b: 255 }, amount)));
  const shade = steps.map((amount) => rgbToHex(mixRgb(rgb, { r: 0, g: 0, b: 0 }, amount)));
  const tone = steps.map((amount) => rgbToHex(mixRgb(rgb, { r: 128, g: 128, b: 128 }, amount * 0.72)));
  const warm = [-10, -5, 0, 7, 14].map((offset, index) => hsvToHex({
    h: hsv.h + offset - 4,
    s: clamp(hsv.s + index * 0.025, 0, 1),
    v: clamp(hsv.v + 0.015 * (2 - index), 0, 1)
  }));
  const cool = [-14, -7, 0, 5, 10].map((offset, index) => hsvToHex({
    h: hsv.h + 12 + offset,
    s: clamp(hsv.s + index * 0.018, 0, 1),
    v: clamp(hsv.v + 0.01 * (2 - index), 0, 1)
  }));
  return { tint, shade, tone, warm, cool };
}
