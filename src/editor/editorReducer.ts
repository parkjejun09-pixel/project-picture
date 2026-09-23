import { getBrushPreset } from '../drawing/brushPresets.js';
import { normalizeHex } from '../drawing/color.js';
import { addProjectColor, addRecentColor, toggleFavoriteColor } from '../drawing/palette.js';
import {
  clampBrushSize,
  clampFillExpansion,
  clampFillGapClosing,
  clampFillTolerance,
  clampInfluence,
  clampOpacity,
  clampPressureResponse,
  clampSpacing,
  clampStabilizer,
  clampZoom
} from '../drawing/settings.js';
import { defaultWorkspacePreferences } from './workspacePreferences.js';
import { buildDefaultPerspective } from '../drawing/perspective.js';
import type { EditorAction, EditorState } from './types.js';

const defaultPreset = getBrushPreset('inking');
const defaultPerspective = buildDefaultPerspective('two');
const clamp01 = (value: number): number => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const clampInt = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : min)));
const normalizeAngle = (value: number): number => {
  const angle = Number.isFinite(value) ? value % 360 : 0;
  return angle < 0 ? angle + 360 : angle;
};

export const initialEditorState: EditorState = {
  tool: 'brush',
  mode: 'standard',
  ...defaultWorkspacePreferences,
  color: '#232323',
  secondaryColor: '#FFFFFF',
  brushPreset: defaultPreset.id,
  brushSize: defaultPreset.size,
  opacity: defaultPreset.opacity,
  spacing: defaultPreset.spacing,
  stabilizer: defaultPreset.stabilizer,
  pressureResponse: defaultPreset.pressureResponse,
  pressureSize: defaultPreset.pressureSize,
  pressureOpacity: defaultPreset.pressureOpacity,
  tiltInfluence: defaultPreset.tiltInfluence,
  flow: defaultPreset.flow,
  velocitySize: defaultPreset.velocitySize,
  brushRotation: defaultPreset.rotation,
  taper: defaultPreset.taper,
  taperStart: defaultPreset.taperStart,
  taperEnd: defaultPreset.taperEnd,
  taperLength: defaultPreset.taperLength,
  scatter: defaultPreset.scatter,
  sizeJitter: defaultPreset.sizeJitter,
  angleJitter: defaultPreset.angleJitter,
  colorJitter: defaultPreset.colorJitter,
  grain: defaultPreset.grain,
  textureStrength: defaultPreset.textureStrength,
  textureScale: defaultPreset.textureScale,
  textureRotation: defaultPreset.textureRotation,
  paperGrain: defaultPreset.paperGrain,
  brushTextureMap: null,
  dualBrush: defaultPreset.dualBrush,
  wetMix: defaultPreset.wetMix,
  recentColors: ['#232323'],
  favoriteColors: [],
  projectColors: [],
  extractedColors: [],
  fillTolerance: 28,
  fillGapClosing: 1,
  fillExpansion: 2,
  fillAntialias: true,
  fillReference: 'visible',
  fillMode: 'bucket',
  gradientMode: 'linear',
  shapeType: 'line',
  shapeFill: false,
  magicWandTolerance: 28,
  selectionShape: 'rectangle',
  selectionMode: 'replace',
  selectionFeather: 0,
  selectionPenSize: 24,
  transformMode: 'free',
  assistMode: 'none',
  assistSnapEnabled: true,
  gridSize: 32,
  guideOrientation: 'vertical',
  guidePosition: 0.5,
  straightAngle: 0,
  parallelAngle: 0,
  radialCenterX: 0.5,
  radialCenterY: 0.5,
  radialRays: 12,
  concentricSpacing: 32,
  symmetryAxes: 2,
  symmetryCenterX: 0.5,
  symmetryCenterY: 0.5,
  perspectiveMode: 'two',
  perspectiveHorizonY: defaultPerspective.horizonY,
  perspectiveVanishingPoints: defaultPerspective.vanishingPoints.map((point) => ({ ...point })),
  textValue: 'Text',
  textSize: 48,
  textFont: 'sans-serif',
  zoom: 1,
  pan: { x: 0, y: 0 }
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'tool/set':
      return { ...state, tool: action.tool };
    case 'mode/set':
      return { ...state, mode: action.mode };
    case 'handedness/set':
      return { ...state, handedness: action.value };
    case 'canvas-surround/set':
      return { ...state, canvasSurround: action.value };
    case 'ui-density/set':
      return { ...state, uiDensity: action.value };
    case 'shortcut-profile/set':
      return { ...state, shortcutProfile: action.value };
    case 'panel/toggle': {
      const exists = state.collapsedPanels.includes(action.panelId);
      return { ...state, collapsedPanels: exists ? state.collapsedPanels.filter((id) => id !== action.panelId) : [...state.collapsedPanels, action.panelId] };
    }
    case 'workspace/reset':
      return { ...state, ...defaultWorkspacePreferences };
    case 'color/preview': {
      const color = normalizeHex(action.value);
      return color ? { ...state, color } : state;
    }
    case 'color/set':
    case 'color/commit': {
      const color = normalizeHex(action.value);
      return color ? { ...state, color, recentColors: addRecentColor(state.recentColors, color) } : state;
    }
    case 'secondary-color/set': {
      const color = normalizeHex(action.value);
      return color ? { ...state, secondaryColor: color } : state;
    }
    case 'brush-preset/set': {
      const preset = getBrushPreset(action.preset);
      return {
        ...state,
        brushPreset: preset.id,
        brushSize: preset.size,
        opacity: preset.opacity,
        spacing: preset.spacing,
        stabilizer: preset.stabilizer,
        pressureResponse: preset.pressureResponse,
        pressureSize: preset.pressureSize,
        pressureOpacity: preset.pressureOpacity,
        tiltInfluence: preset.tiltInfluence,
        flow: preset.flow,
        velocitySize: preset.velocitySize,
        brushRotation: preset.rotation,
        taper: preset.taper,
        taperStart: preset.taperStart,
        taperEnd: preset.taperEnd,
        taperLength: preset.taperLength,
        scatter: preset.scatter,
        sizeJitter: preset.sizeJitter,
        angleJitter: preset.angleJitter,
        colorJitter: preset.colorJitter,
        grain: preset.grain,
        textureStrength: preset.textureStrength,
        textureScale: preset.textureScale,
        textureRotation: preset.textureRotation,
        paperGrain: preset.paperGrain,
        brushTextureMap: null,
        dualBrush: preset.dualBrush,
        wetMix: preset.wetMix
      };
    }
    case 'brush-size/set':
      return { ...state, brushSize: clampBrushSize(action.value) };
    case 'opacity/set':
      return { ...state, opacity: clampOpacity(action.value) };
    case 'spacing/set':
      return { ...state, spacing: clampSpacing(action.value) };
    case 'stabilizer/set':
      return { ...state, stabilizer: clampStabilizer(action.value) };
    case 'pressure-response/set':
      return { ...state, pressureResponse: clampPressureResponse(action.value) };
    case 'pressure-size/set':
      return { ...state, pressureSize: clampInfluence(action.value) };
    case 'pressure-opacity/set':
      return { ...state, pressureOpacity: clampInfluence(action.value) };
    case 'tilt-influence/set':
      return { ...state, tiltInfluence: clampInfluence(action.value) };
    case 'flow/set': return { ...state, flow: clampInfluence(action.value) };
    case 'velocity-size/set': return { ...state, velocitySize: clampInfluence(action.value) };
    case 'brush-rotation/set': return { ...state, brushRotation: Math.max(-1, Math.min(1, action.value)) };
    case 'taper/set': return { ...state, taper: clampInfluence(action.value) };
    case 'taper-start/set': return { ...state, taperStart: clampInfluence(action.value) };
    case 'taper-end/set': return { ...state, taperEnd: clampInfluence(action.value) };
    case 'taper-length/set': return { ...state, taperLength: Math.max(.02, Math.min(.5, action.value)) };
    case 'scatter/set': return { ...state, scatter: clampInfluence(action.value) };
    case 'size-jitter/set': return { ...state, sizeJitter: clampInfluence(action.value) };
    case 'angle-jitter/set': return { ...state, angleJitter: clampInfluence(action.value) };
    case 'color-jitter/set': return { ...state, colorJitter: clampInfluence(action.value) };
    case 'grain/set': return { ...state, grain: clampInfluence(action.value) };
    case 'texture-strength/set': return { ...state, textureStrength: clampInfluence(action.value) };
    case 'texture-scale/set': return { ...state, textureScale: Math.max(.15, Math.min(8, action.value)) };
    case 'texture-rotation/set': return { ...state, textureRotation: clampInfluence(action.value) };
    case 'paper-grain/set': return { ...state, paperGrain: clampInfluence(action.value) };
    case 'brush-texture-map/set': return { ...state, brushTextureMap: action.value };
    case 'dual-brush/set': return { ...state, dualBrush: clampInfluence(action.value) };
    case 'wet-mix/set': return { ...state, wetMix: clampInfluence(action.value) };
    case 'favorite-color/toggle': {
      const color = normalizeHex(action.value);
      return color ? { ...state, favoriteColors: toggleFavoriteColor(state.favoriteColors, color) } : state;
    }
    case 'project-color/add': {
      const color = normalizeHex(action.value);
      return color ? { ...state, projectColors: addProjectColor(state.projectColors, color) } : state;
    }
    case 'extracted-colors/set': {
      const values = action.values.map((value) => normalizeHex(value)).filter((value): value is string => Boolean(value));
      return { ...state, extractedColors: values.slice(0, 8) };
    }
    case 'fill-tolerance/set':
      return { ...state, fillTolerance: clampFillTolerance(action.value) };
    case 'fill-gap/set':
      return { ...state, fillGapClosing: clampFillGapClosing(action.value) };
    case 'fill-expansion/set':
      return { ...state, fillExpansion: clampFillExpansion(action.value) };
    case 'fill-antialias/set':
      return { ...state, fillAntialias: action.value };
    case 'fill-reference/set':
      return { ...state, fillReference: action.value };
    case 'fill-mode/set':
      return { ...state, fillMode: action.value };
    case 'gradient-mode/set':
      return { ...state, gradientMode: action.value };
    case 'shape-type/set':
      return { ...state, shapeType: action.value };
    case 'shape-fill/set':
      return { ...state, shapeFill: action.value };
    case 'magic-wand-tolerance/set':
      return { ...state, magicWandTolerance: Math.max(0, Math.min(255, action.value)) };
    case 'selection-shape/set':
      return { ...state, selectionShape: action.value };
    case 'selection-mode/set':
      return { ...state, selectionMode: action.value };
    case 'selection-feather/set':
      return { ...state, selectionFeather: Math.max(0, Math.min(128, Math.round(action.value))) };
    case 'selection-pen-size/set':
      return { ...state, selectionPenSize: Math.max(1, Math.min(256, action.value)) };
    case 'transform-mode/set':
      return { ...state, transformMode: action.value };
    case 'assist-mode/set':
      return { ...state, assistMode: action.value };
    case 'assist-snap/set':
      return { ...state, assistSnapEnabled: action.value };
    case 'grid-size/set':
      return { ...state, gridSize: clampInt(action.value, 4, 512) };
    case 'guide-orientation/set':
      return { ...state, guideOrientation: action.value };
    case 'guide-position/set':
      return { ...state, guidePosition: clamp01(action.value) };
    case 'straight-angle/set':
      return { ...state, straightAngle: normalizeAngle(action.value) };
    case 'parallel-angle/set':
      return { ...state, parallelAngle: normalizeAngle(action.value) };
    case 'radial-center/set':
      return { ...state, radialCenterX: clamp01(action.x), radialCenterY: clamp01(action.y) };
    case 'radial-rays/set':
      return { ...state, radialRays: clampInt(action.value, 2, 72) };
    case 'concentric-spacing/set':
      return { ...state, concentricSpacing: clampInt(action.value, 4, 512) };
    case 'symmetry-axes/set':
      return { ...state, symmetryAxes: clampInt(action.value, 2, 12) };
    case 'symmetry-center/set':
      return { ...state, symmetryCenterX: clamp01(action.x), symmetryCenterY: clamp01(action.y) };
    case 'perspective-mode/set': {
      const perspective = buildDefaultPerspective(action.value);
      return {
        ...state,
        perspectiveMode: action.value,
        perspectiveHorizonY: perspective.horizonY,
        perspectiveVanishingPoints: perspective.vanishingPoints.map((point) => ({ ...point }))
      };
    }
    case 'perspective-horizon/set':
      return { ...state, perspectiveHorizonY: clamp01(action.value) };
    case 'perspective-vp/set': {
      if (action.index < 0 || action.index >= state.perspectiveVanishingPoints.length) return state;
      const points = state.perspectiveVanishingPoints.map((point, index) => index === action.index
        ? { x: clamp01(action.x), y: clamp01(action.y) }
        : { ...point });
      return { ...state, perspectiveVanishingPoints: points };
    }
    case 'text-value/set':
      return { ...state, textValue: action.value.slice(0, 1000) };
    case 'text-size/set':
      return { ...state, textSize: Math.max(6, Math.min(300, action.value)) };
    case 'text-font/set':
      return { ...state, textFont: action.value || 'sans-serif' };
    case 'zoom/set':
      return { ...state, zoom: clampZoom(action.value) };
    case 'pan/set':
      return { ...state, pan: { x: action.x, y: action.y } };
    case 'view/reset':
      return { ...state, zoom: 1, pan: { x: 0, y: 0 } };
    default:
      return state;
  }
}
