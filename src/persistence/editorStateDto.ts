import { BRUSH_PRESETS } from '../drawing/brushPresets.js';
import { normalizeHex } from '../drawing/color.js';
import { initialEditorState } from '../editor/editorReducer.js';
import type { EditorState } from '../editor/types.js';
import { base64ToBytes, bytesToBase64 } from './projectFormat.js';

export interface SerializedBrushTextureMap {
  width: number;
  height: number;
  data: string;
}

export type SerializedEditorState = Omit<EditorState, 'brushTextureMap'> & {
  brushTextureMap: SerializedBrushTextureMap | null;
};

function cloneInitialState(): EditorState {
  return {
    ...initialEditorState,
    pan: { ...initialEditorState.pan },
    collapsedPanels: [...initialEditorState.collapsedPanels],
    recentColors: [...initialEditorState.recentColors],
    favoriteColors: [...initialEditorState.favoriteColors],
    projectColors: [...initialEditorState.projectColors],
    extractedColors: [...initialEditorState.extractedColors],
    perspectiveVanishingPoints: initialEditorState.perspectiveVanishingPoints.map((point) => ({ ...point })),
    brushTextureMap: null
  };
}

function cloneState(state: EditorState): EditorState {
  return {
    ...state,
    pan: { ...state.pan },
    collapsedPanels: [...state.collapsedPanels],
    recentColors: [...state.recentColors],
    favoriteColors: [...state.favoriteColors],
    projectColors: [...state.projectColors],
    extractedColors: [...state.extractedColors],
    perspectiveVanishingPoints: state.perspectiveVanishingPoints.map((point) => ({ ...point })),
    brushTextureMap: state.brushTextureMap ? {
      width: state.brushTextureMap.width,
      height: state.brushTextureMap.height,
      data: state.brushTextureMap.data.slice()
    } : null
  };
}

export function serializeEditorState(state: EditorState): SerializedEditorState {
  const cloned = cloneState(state);
  return {
    ...cloned,
    brushTextureMap: cloned.brushTextureMap ? {
      width: cloned.brushTextureMap.width,
      height: cloned.brushTextureMap.height,
      data: bytesToBase64(cloned.brushTextureMap.data)
    } : null
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) return null;
  return [...value];
}

const enumValues: Partial<Record<keyof EditorState, readonly string[]>> = {
  tool: ['brush','eraser','smudge','blur','mix','pan','fill','select','transform','vector','eyedropper','gradient','shape','magic-wand','lasso','text','balloon','panel','tone','effect','material','assist'],
  mode: ['standard','advanced'],
  handedness: ['right','left'],
  canvasSurround: ['neutral','dark','light'],
  uiDensity: ['comfortable','compact'],
  shortcutProfile: ['studio','adobe','clip'],
  fillReference: ['active','visible','line-art'],
  fillMode: ['bucket','enclose','unpainted'],
  gradientMode: ['linear','radial'],
  shapeType: ['line','rectangle','ellipse'],
  selectionShape: ['rectangle','ellipse','polygon','pen'],
  selectionMode: ['replace','add','subtract','intersect'],
  transformMode: ['free','perspective','distort','mesh'],
  assistMode: ['none','grid','guide','straight','parallel','curve','radial','concentric','symmetry','perspective'],
  guideOrientation: ['vertical','horizontal'],
  perspectiveMode: ['one','two','three']
};

const numericKeys: readonly (keyof EditorState)[] = [
  'brushSize','opacity','spacing','stabilizer','pressureResponse','pressureSize','pressureOpacity','tiltInfluence',
  'flow','velocitySize','brushRotation','taper','taperStart','taperEnd','taperLength','scatter','sizeJitter','angleJitter',
  'colorJitter','grain','textureStrength','textureScale','textureRotation','paperGrain','dualBrush','wetMix','fillTolerance',
  'fillGapClosing','fillExpansion','magicWandTolerance','selectionFeather','selectionPenSize','gridSize','guidePosition',
  'straightAngle','parallelAngle','radialCenterX','radialCenterY','radialRays','concentricSpacing','symmetryAxes','symmetryCenterX',
  'symmetryCenterY','perspectiveHorizonY','textSize','zoom'
];

const booleanKeys: readonly (keyof EditorState)[] = [
  'fillAntialias','shapeFill','assistSnapEnabled'
];

export function deserializeEditorState(value: unknown): EditorState {
  const result = cloneInitialState();
  if (!isRecord(value)) return result;
  const output = result as unknown as Record<string, unknown>;

  for (const [key, allowed] of Object.entries(enumValues)) {
    const candidate = value[key];
    if (typeof candidate === 'string' && allowed?.includes(candidate)) output[key] = candidate;
  }

  const preset = value.brushPreset;
  if (typeof preset === 'string' && BRUSH_PRESETS.some((item) => item.id === preset)) output.brushPreset = preset;

  for (const key of numericKeys) {
    const candidate = value[key];
    if (isFiniteNumber(candidate)) output[key] = candidate;
  }
  for (const key of booleanKeys) {
    const candidate = value[key];
    if (typeof candidate === 'boolean') output[key] = candidate;
  }

  for (const key of ['color','secondaryColor'] as const) {
    const candidate = value[key];
    if (typeof candidate === 'string') {
      const normalized = normalizeHex(candidate);
      if (normalized) output[key] = normalized;
    }
  }

  for (const key of ['textValue','textFont'] as const) {
    const candidate = value[key];
    if (typeof candidate === 'string') output[key] = candidate;
  }

  for (const key of ['collapsedPanels','recentColors','favoriteColors','projectColors','extractedColors'] as const) {
    const candidate = stringArray(value[key]);
    if (candidate) output[key] = candidate;
  }

  if (isRecord(value.pan) && isFiniteNumber(value.pan.x) && isFiniteNumber(value.pan.y)) {
    result.pan = { x: value.pan.x, y: value.pan.y };
  }

  if (Array.isArray(value.perspectiveVanishingPoints)) {
    const points = value.perspectiveVanishingPoints;
    if (points.length >= 1 && points.length <= 3 && points.every((point) => isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y))) {
      result.perspectiveVanishingPoints = points.map((point) => ({ x: Number((point as Record<string, unknown>).x), y: Number((point as Record<string, unknown>).y) }));
    }
  }

  if (isRecord(value.brushTextureMap)) {
    const width = value.brushTextureMap.width;
    const height = value.brushTextureMap.height;
    const data = value.brushTextureMap.data;
    if (Number.isInteger(width) && Number.isInteger(height) && Number(width) > 0 && Number(height) > 0 && typeof data === 'string') {
      try {
        const bytes = base64ToBytes(data);
        if (bytes.length === Number(width) * Number(height)) {
          result.brushTextureMap = { width: Number(width), height: Number(height), data: bytes };
        }
      } catch {
        result.brushTextureMap = null;
      }
    }
  }

  return result;
}
