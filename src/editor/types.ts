import type { BrushPresetId } from '../drawing/brushPresets.js';
import type { BrushTextureMap } from '../drawing/advancedBrush.js';
import type { AssistMode, GuideOrientation } from '../drawing/assist.js';
import type { PerspectiveMode, VanishingPoint } from '../drawing/perspective.js';

export type Tool = 'brush' | 'eraser' | 'smudge' | 'blur' | 'mix' | 'pan' | 'fill' | 'select' | 'transform' | 'vector' | 'eyedropper' | 'gradient' | 'shape' | 'magic-wand' | 'lasso' | 'text' | 'balloon' | 'panel' | 'tone' | 'effect' | 'material' | 'assist';
export type FillReference = 'active' | 'visible' | 'line-art';
export type FillMode = 'bucket' | 'enclose' | 'unpainted';
export type GradientMode = 'linear' | 'radial';
export type ShapeType = 'line' | 'rectangle' | 'ellipse';
export type SelectionShape = 'rectangle' | 'ellipse' | 'polygon' | 'pen';
export type SelectionMode = 'replace' | 'add' | 'subtract' | 'intersect';
export type TransformMode = 'free' | 'perspective' | 'distort' | 'mesh';
export type WorkspaceMode = 'standard' | 'advanced';
export type WorkspaceHandedness = 'right' | 'left';
export type CanvasSurround = 'neutral' | 'dark' | 'light';
export type UiDensity = 'comfortable' | 'compact';
export type ShortcutProfile = 'studio' | 'adobe' | 'clip';

export interface PanOffset {
  x: number;
  y: number;
}

export interface EditorState {
  tool: Tool;
  mode: WorkspaceMode;
  handedness: WorkspaceHandedness;
  canvasSurround: CanvasSurround;
  uiDensity: UiDensity;
  shortcutProfile: ShortcutProfile;
  collapsedPanels: string[];
  color: string;
  secondaryColor: string;
  brushPreset: BrushPresetId;
  brushSize: number;
  opacity: number;
  spacing: number;
  stabilizer: number;
  pressureResponse: number;
  pressureSize: number;
  pressureOpacity: number;
  tiltInfluence: number;
  flow: number;
  velocitySize: number;
  brushRotation: number;
  taper: number;
  taperStart: number;
  taperEnd: number;
  taperLength: number;
  scatter: number;
  sizeJitter: number;
  angleJitter: number;
  colorJitter: number;
  grain: number;
  textureStrength: number;
  textureScale: number;
  textureRotation: number;
  paperGrain: number;
  brushTextureMap: BrushTextureMap | null;
  dualBrush: number;
  wetMix: number;
  recentColors: string[];
  favoriteColors: string[];
  projectColors: string[];
  extractedColors: string[];
  fillTolerance: number;
  fillGapClosing: number;
  fillExpansion: number;
  fillAntialias: boolean;
  fillReference: FillReference;
  fillMode: FillMode;
  gradientMode: GradientMode;
  shapeType: ShapeType;
  shapeFill: boolean;
  magicWandTolerance: number;
  selectionShape: SelectionShape;
  selectionMode: SelectionMode;
  selectionFeather: number;
  selectionPenSize: number;
  transformMode: TransformMode;
  assistMode: AssistMode;
  assistSnapEnabled: boolean;
  gridSize: number;
  guideOrientation: GuideOrientation;
  guidePosition: number;
  straightAngle: number;
  parallelAngle: number;
  radialCenterX: number;
  radialCenterY: number;
  radialRays: number;
  concentricSpacing: number;
  symmetryAxes: number;
  symmetryCenterX: number;
  symmetryCenterY: number;
  perspectiveMode: PerspectiveMode;
  perspectiveHorizonY: number;
  perspectiveVanishingPoints: VanishingPoint[];
  textValue: string;
  textSize: number;
  textFont: string;
  zoom: number;
  pan: PanOffset;
}

export type EditorAction =
  | { type: 'tool/set'; tool: Tool }
  | { type: 'mode/set'; mode: WorkspaceMode }
  | { type: 'handedness/set'; value: WorkspaceHandedness }
  | { type: 'canvas-surround/set'; value: CanvasSurround }
  | { type: 'ui-density/set'; value: UiDensity }
  | { type: 'shortcut-profile/set'; value: ShortcutProfile }
  | { type: 'panel/toggle'; panelId: string }
  | { type: 'workspace/reset' }
  | { type: 'color/set'; value: string }
  | { type: 'secondary-color/set'; value: string }
  | { type: 'brush-preset/set'; preset: BrushPresetId }
  | { type: 'brush-size/set'; value: number }
  | { type: 'opacity/set'; value: number }
  | { type: 'spacing/set'; value: number }
  | { type: 'stabilizer/set'; value: number }
  | { type: 'pressure-response/set'; value: number }
  | { type: 'pressure-size/set'; value: number }
  | { type: 'pressure-opacity/set'; value: number }
  | { type: 'tilt-influence/set'; value: number }
  | { type: 'flow/set'; value: number }
  | { type: 'velocity-size/set'; value: number }
  | { type: 'brush-rotation/set'; value: number }
  | { type: 'taper/set'; value: number }
  | { type: 'taper-start/set'; value: number }
  | { type: 'taper-end/set'; value: number }
  | { type: 'taper-length/set'; value: number }
  | { type: 'scatter/set'; value: number }
  | { type: 'size-jitter/set'; value: number }
  | { type: 'angle-jitter/set'; value: number }
  | { type: 'color-jitter/set'; value: number }
  | { type: 'grain/set'; value: number }
  | { type: 'texture-strength/set'; value: number }
  | { type: 'texture-scale/set'; value: number }
  | { type: 'texture-rotation/set'; value: number }
  | { type: 'paper-grain/set'; value: number }
  | { type: 'brush-texture-map/set'; value: BrushTextureMap | null }
  | { type: 'dual-brush/set'; value: number }
  | { type: 'wet-mix/set'; value: number }
  | { type: 'favorite-color/toggle'; value: string }
  | { type: 'project-color/add'; value: string }
  | { type: 'extracted-colors/set'; values: string[] }
  | { type: 'fill-tolerance/set'; value: number }
  | { type: 'fill-gap/set'; value: number }
  | { type: 'fill-expansion/set'; value: number }
  | { type: 'fill-antialias/set'; value: boolean }
  | { type: 'fill-reference/set'; value: FillReference }
  | { type: 'fill-mode/set'; value: FillMode }
  | { type: 'gradient-mode/set'; value: GradientMode }
  | { type: 'shape-type/set'; value: ShapeType }
  | { type: 'shape-fill/set'; value: boolean }
  | { type: 'magic-wand-tolerance/set'; value: number }
  | { type: 'selection-shape/set'; value: SelectionShape }
  | { type: 'selection-mode/set'; value: SelectionMode }
  | { type: 'selection-feather/set'; value: number }
  | { type: 'selection-pen-size/set'; value: number }
  | { type: 'transform-mode/set'; value: TransformMode }
  | { type: 'assist-mode/set'; value: AssistMode }
  | { type: 'assist-snap/set'; value: boolean }
  | { type: 'grid-size/set'; value: number }
  | { type: 'guide-orientation/set'; value: GuideOrientation }
  | { type: 'guide-position/set'; value: number }
  | { type: 'straight-angle/set'; value: number }
  | { type: 'parallel-angle/set'; value: number }
  | { type: 'radial-center/set'; x: number; y: number }
  | { type: 'radial-rays/set'; value: number }
  | { type: 'concentric-spacing/set'; value: number }
  | { type: 'symmetry-axes/set'; value: number }
  | { type: 'symmetry-center/set'; x: number; y: number }
  | { type: 'perspective-mode/set'; value: PerspectiveMode }
  | { type: 'perspective-horizon/set'; value: number }
  | { type: 'perspective-vp/set'; index: number; x: number; y: number }
  | { type: 'text-value/set'; value: string }
  | { type: 'text-size/set'; value: number }
  | { type: 'text-font/set'; value: string }
  | { type: 'zoom/set'; value: number }
  | { type: 'pan/set'; x: number; y: number }
  | { type: 'view/reset' };
