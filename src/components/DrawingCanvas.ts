import { buildDynamicDabStyle, type DynamicDabStyle } from '../drawing/brushDynamics.js';
import { buildSymmetryPoints, nearestPointOnCubic, projectPointToLine, snapToConcentric, snapToGrid, snapToGuide, snapToRadial, type AssistPoint } from '../drawing/assist.js';
import { projectToPerspective } from '../drawing/perspective.js';
import { buildAdvancedDab, strokeProgress } from '../drawing/advancedBrush.js';
import { blurPixels, mixHexColors, smudgePixels } from '../drawing/brushPixels.js';
import { getBrushPreset } from '../drawing/brushPresets.js';
import { blendModeToCompositeOperation } from '../drawing/compositing.js';
import { drawDynamicDab } from '../drawing/canvasRenderer.js';
import { HistoryStack } from '../drawing/history.js';
import {
  addLayerMask,
  addRasterLayer,
  addVectorLayer,
  addFillLayer,
  addGradientLayer,
  addCorrectionLayer,
  addSelectionLayer,
  addEditableLayer as addEditableLayerState,
  cloneLayerDocumentState,
  createInitialLayerDocument,
  deleteActiveNode,
  duplicateActiveNode,
  findLayerNode,
  getChildren,
  getMergeDownTargetId,
  isLayerExportable,
  isEditableLayerNode,
  groupActiveNode,
  moveActiveNode,
  removeLayerMask,
  renameActiveNode,
  rasterizeActiveVectorLayer,
  selectLayerContent,
  selectLayerMask,
  selectLayerNode,
  setActiveBlendMode,
  setActiveOpacity,
  setActiveColorTag,
  setActiveRasterRole,
  updateActiveSpecialLayer,
  updateActiveEditableLayer,
  toggleActiveAlphaLock,
  toggleActiveClipping,
  toggleLayerVisibility,
  type BlendMode,
  type LayerDocumentState,
  type LayerNode,
  type RasterLayerNode,
  type LayerRole,
  type LayerColorTag,
  type SpecialLayerPatch,
  type VectorLayerNode
} from '../drawing/layers.js';
import { cloneEditableLayerData, createEditableLayerData, type EditableLayerData, type EditableLayerKind, type EditableLayerPatch } from '../drawing/editableLayers.js';
import { EditableLayerRenderer } from '../drawing/editableLayerRenderer.js';
import { normalizePointerDynamics } from '../drawing/pointer.js';
import { stabilizeSample } from '../drawing/stabilizer.js';
import { antialiasFillMask, applyFillColor, createFillMask, expandFillMask, type PixelBuffer } from '../drawing/smartFill.js';
import { createUnpaintedMask } from '../drawing/advancedFill.js';
import { samplePixelHex } from '../drawing/eyedropper.js';
import {
  combineSelectionMasks,
  contractSelectionMask,
  createEllipseMask,
  createLassoMask,
  createMagicWandMask,
  createPolygonMask,
  createSelectionPenMask,
  expandSelectionMask,
  featherSelectionMask,
  invertSelectionMask,
  maskBounds,
  rectangleMask
} from '../drawing/selectionMask.js';
import { shapeBounds } from '../drawing/shapes.js';
import { normalizeTextSize } from '../drawing/textTool.js';
import { sampleStrokeSegment, type Point, type StrokeSample } from '../drawing/stroke.js';
import { clampSelectionRect, normalizeSelectionRect, rectContainsPoint, translateSelectionRect, type SelectionRect } from '../drawing/selection.js';
import {
  affineFromTriangles,
  bilinearQuadPoint,
  createMeshGrid,
  meshBounds,
  moveMeshPoint,
  quadBounds,
  quadCenter,
  rectToQuad,
  rotateQuad,
  rotatedRect90,
  scaleQuadFromHandle,
  scaleRectFromCenter,
  translateQuad,
  updateDistortCorner,
  updatePerspectiveCorner,
  type TransformCorner,
  type TransformHandle,
  type TransformMesh,
  type TransformQuad
} from '../drawing/transform.js';
import {
  appendVectorPoint,
  connectVectorStrokes,
  createVectorStroke,
  deleteVectorPoint,
  eraseVectorSegment,
  findNearestPointIndex,
  findNearestStroke,
  insertVectorPoint,
  nearestVectorSegmentIndex,
  redrawVectorSegment,
  renderVectorStrokes,
  setVectorHandle,
  simplifyVectorStroke,
  updateVectorPoint,
  updateVectorStroke,
  type VectorStroke
} from '../drawing/vector.js';
import { buildViewTransform, zoomFromWheel } from '../drawing/view.js';
import type { EditorState } from '../editor/types.js';
import { deserializeImageBytes, deserializeSelectionBytes, serializeImageBytes, serializeSelectionBytes, validateProjectDocumentDto, type ProjectDocumentDto } from '../persistence/documentDto.js';

export interface DrawingSelectionInfo {
  rect: SelectionRect | null;
  activeLayerKind: LayerNode['kind'];
  selectedVectorStroke: VectorStroke | null;
  selectedVectorPointIndex: number | null;
  polygonOpen: boolean;
  editableLayer: EditableLayerData | null;
  editableLayerLocked: boolean;
}

export type AssistDragUpdate =
  | { type: 'guide-position'; value: number }
  | { type: 'radial-center'; x: number; y: number }
  | { type: 'symmetry-center'; x: number; y: number }
  | { type: 'perspective-horizon'; value: number }
  | { type: 'perspective-vp'; index: number; x: number; y: number };

export interface DrawingCanvasOptions {
  width?: number;
  height?: number;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onPanChange?: (x: number, y: number) => void;
  onZoomChange?: (zoom: number) => void;
  onLayersChange?: (state: LayerDocumentState) => void;
  onHistoryEntry?: (label: string) => void;
  onSelectionChange?: (info: DrawingSelectionInfo) => void;
  onColorSample?: (hex: string) => void;
  onAssistChange?: (update: AssistDragUpdate) => void;
}

interface LayerSurface {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  maskCanvas: HTMLCanvasElement | null;
  maskContext: CanvasRenderingContext2D | null;
}

interface SurfaceSnapshot {
  id: string;
  content: ImageData;
  mask: ImageData | null;
}

interface VectorSnapshot { id: string; strokes: VectorStroke[]; }
interface SelectionLayerSnapshot { id: string; mask: Uint8Array; }

interface DocumentSnapshot {
  state: LayerDocumentState;
  surfaces: SurfaceSnapshot[];
  vectors: VectorSnapshot[];
  selectionLayers: SelectionLayerSnapshot[];
}

interface TransformSession {
  original: ImageData;
  source: HTMLCanvasElement;
  sourceMask: HTMLCanvasElement;
  sourceRect: { x: number; y: number; width: number; height: number };
  startQuad: TransformQuad;
  quad: TransformQuad;
  startMesh: TransformMesh | null;
  mesh: TransformMesh | null;
  pointerStart: Point;
  handle: TransformHandle | TransformCorner | 'move' | 'rotate' | `mesh-${number}`;
  startAngle: number;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

function cloneLayerState(state: LayerDocumentState): LayerDocumentState {
  return cloneLayerDocumentState(state);
}

function isRasterNode(node: LayerNode): node is RasterLayerNode {
  return node.kind === 'raster' || node.kind === 'background';
}

export class DrawingCanvas {
  readonly element: HTMLElement;
  readonly canvas: HTMLCanvasElement;

  private readonly sheet: HTMLElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly compositeCache: HTMLCanvasElement;
  private readonly compositeCacheContext: CanvasRenderingContext2D;
  private readonly history = new HistoryStack<DocumentSnapshot>(12);
  private readonly surfaces = new Map<string, LayerSurface>();
  private readonly vectors = new Map<string, VectorStroke[]>();
  private readonly selectionLayers = new Map<string, Uint8Array>();
  private readonly editableRenderer: EditableLayerRenderer;
  private readonly onHistoryChange: ((canUndo: boolean, canRedo: boolean) => void) | undefined;
  private readonly onPanChange: ((x: number, y: number) => void) | undefined;
  private readonly onZoomChange: ((zoom: number) => void) | undefined;
  private readonly onLayersChange: ((state: LayerDocumentState) => void) | undefined;
  private readonly onHistoryEntry: ((label: string) => void) | undefined;
  private readonly onSelectionChange: ((info: DrawingSelectionInfo) => void) | undefined;
  private readonly onColorSample: ((hex: string) => void) | undefined;
  private readonly onAssistChange: ((update: AssistDragUpdate) => void) | undefined;
  private state: EditorState;
  private layers: LayerDocumentState = createInitialLayerDocument();
  private drawing = false;
  private previousSample: StrokeSample | null = null;
  private activePointerId: number | null = null;
  private panning = false;
  private panPointerId: number | null = null;
  private panStartClient: Point | null = null;
  private panStartOffset: Point | null = null;
  private spacePressed = false;
  private compositeDirty = true;
  private compositeFrame: number | null = null;
  private readonly assistOverlay: HTMLCanvasElement;
  private readonly assistOverlayContext: CanvasRenderingContext2D;
  private readonly selectionOverlay: HTMLElement;
  private readonly selectionMaskOverlay: HTMLCanvasElement;
  private readonly selectionMaskOverlayContext: CanvasRenderingContext2D;
  private selectionRect: SelectionRect | null = null;
  private selectionStart: Point | null = null;
  private selecting = false;
  private transforming = false;
  private transformSession: TransformSession | null = null;
  private selectedVectorStrokeId: string | null = null;
  private activeVectorStrokeId: string | null = null;
  private activeVectorStrokeIds: string[] = [];
  private vectorStrokeCounter = 1;
  private vectorPointEditingIndex: number | null = null;
  private vectorPointEditingStrokeId: string | null = null;
  private selectedVectorPointIndex: number | null = null;
  private vectorHandleEditing: { strokeId: string; pointIndex: number; side: 'in' | 'out' } | null = null;
  private vectorRedrawPending = false;
  private vectorRedrawStrokeId: string | null = null;
  private vectorRedrawPoints: Point[] = [];
  private vectorRedrawStartSegment: number | null = null;
  private selectionMask: Uint8Array | null = null;
  private gestureStart: Point | null = null;
  private gestureEnd: Point | null = null;
  private gesturePointerId: number | null = null;
  private lassoPoints: Point[] = [];
  private polygonPoints: Point[] = [];
  private selectionPenPoints: Point[] = [];
  private strokeDabIndex = 0;
  private activeStrokeSamples: StrokeSample[] = [];
  private activeStrokeBefore: ImageData | null = null;
  private activeStrokeBeforeLayerId: string | null = null;
  private activeStrokeBeforeTarget: 'content' | 'mask' | null = null;
  private assistStrokeOrigin: StrokeSample | null = null;
  private assistDragging: 'guide' | 'radial-center' | 'symmetry-center' | 'perspective-horizon' | { vp: number } | null = null;

  constructor(state: EditorState, options: DrawingCanvasOptions = {}) {
    this.state = state;
    this.editableRenderer = new EditableLayerRenderer((width, height) => this.createCanvas(width, height));
    this.onHistoryChange = options.onHistoryChange;
    this.onPanChange = options.onPanChange;
    this.onZoomChange = options.onZoomChange;
    this.onLayersChange = options.onLayersChange;
    this.onHistoryEntry = options.onHistoryEntry;
    this.onSelectionChange = options.onSelectionChange;
    this.onColorSample = options.onColorSample;
    this.onAssistChange = options.onAssistChange;
    this.element = document.createElement('div');
    this.element.className = 'canvas-viewport';

    this.canvas = this.createCanvas(options.width ?? 1280, options.height ?? 800);
    this.canvas.className = 'drawing-canvas';
    this.canvas.setAttribute('aria-label', 'Drawing canvas');
    this.canvas.tabIndex = 0;
    const context = this.canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas 2D context is unavailable.');
    this.context = context;

    this.compositeCache = this.createCanvas(this.canvas.width, this.canvas.height);
    const cacheContext = this.compositeCache.getContext('2d', { alpha: true });
    if (!cacheContext) throw new Error('Composite cache context is unavailable.');
    this.compositeCacheContext = cacheContext;

    this.assistOverlay = this.createCanvas(this.canvas.width, this.canvas.height);
    this.assistOverlay.className = 'assist-overlay';
    const assistOverlayContext = this.assistOverlay.getContext('2d', { alpha: true });
    if (!assistOverlayContext) throw new Error('Assist overlay context is unavailable.');
    this.assistOverlayContext = assistOverlayContext;

    this.selectionMaskOverlay = this.createCanvas(this.canvas.width, this.canvas.height);
    this.selectionMaskOverlay.className = 'selection-mask-overlay';
    const selectionMaskOverlayContext = this.selectionMaskOverlay.getContext('2d', { alpha: true });
    if (!selectionMaskOverlayContext) throw new Error('Selection overlay context is unavailable.');
    this.selectionMaskOverlayContext = selectionMaskOverlayContext;

    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.className = 'selection-overlay';
    this.selectionOverlay.hidden = true;

    this.sheet = document.createElement('div');
    this.sheet.className = 'canvas-sheet';
    this.sheet.append(this.canvas, this.assistOverlay, this.selectionMaskOverlay, this.selectionOverlay);
    this.element.append(this.sheet);

    this.reconcileSurfaces();
    this.installPointerEvents();
    this.installViewEvents();
    this.renderCompositeNow();
    this.history.push(this.snapshot());
    this.updateState(state);
    this.emitHistory();
    this.emitLayers();
  }

  get layerState(): LayerDocumentState {
    return cloneLayerState(this.layers);
  }

  get selectionInfo(): DrawingSelectionInfo {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    const selectedVectorStroke = active.kind === 'vector' && this.selectedVectorStrokeId
      ? (this.vectors.get(active.id) ?? []).find((stroke) => stroke.id === this.selectedVectorStrokeId) ?? null
      : null;
    return {
      rect: this.selectionRect ? { ...this.selectionRect } : null,
      activeLayerKind: active.kind,
      selectedVectorStroke,
      selectedVectorPointIndex: this.selectedVectorPointIndex,
      polygonOpen: this.polygonPoints.length > 0,
      editableLayer: isEditableLayerNode(active) ? cloneEditableLayerData(active) : null,
      editableLayerLocked: isEditableLayerNode(active) && active.locked
    };
  }

  updateState(state: EditorState): void {
    this.state = state;
    this.canvas.dataset.tool = state.tool;
    this.canvas.dataset.preset = state.brushPreset;
    this.canvas.dataset.layerTarget = this.layers.activeTarget;
    this.sheet.style.transform = buildViewTransform(state.pan, state.zoom);
    this.syncSelectionOverlay();
    this.renderAssistOverlay();
  }

  get canUndo(): boolean { return this.history.canUndo; }
  get canRedo(): boolean { return this.history.canRedo; }

  get canvasSize(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  exportProjectDocument(): ProjectDocumentDto {
    return {
      layers: cloneLayerState(this.layers),
      surfaces: [...this.surfaces.entries()].map(([id, surface]) => {
        const content = surface.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const mask = surface.maskContext ? surface.maskContext.getImageData(0, 0, this.canvas.width, this.canvas.height) : null;
        return {
          id,
          content: serializeImageBytes(content.width, content.height, content.data),
          mask: mask ? serializeImageBytes(mask.width, mask.height, mask.data) : null
        };
      }),
      vectors: [...this.vectors.entries()].map(([id, strokes]) => ({
        id,
        strokes: strokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({
          ...point,
          ...(point.inHandle ? { inHandle: { ...point.inHandle } } : {}),
          ...(point.outHandle ? { outHandle: { ...point.outHandle } } : {})
        })) }))
      })),
      selectionLayers: [...this.selectionLayers.entries()].map(([id, mask]) => ({ id, mask: serializeSelectionBytes(mask) }))
    };
  }

  importProjectDocument(document: ProjectDocumentDto, width: number, height: number): void {
    const stagedDocument = validateProjectDocumentDto(document, width, height);
    document = stagedDocument;
    this.resizeProjectCanvas(width, height);
    const pixelCount = width * height;
    const snapshot: DocumentSnapshot = {
      state: cloneLayerState(document.layers),
      surfaces: document.surfaces.map((item) => {
        const content = deserializeImageBytes(item.content);
        if (content.width !== width || content.height !== height) throw new Error(`Surface ${item.id} does not match project canvas`);
        const mask = item.mask ? deserializeImageBytes(item.mask) : null;
        if (mask && (mask.width !== width || mask.height !== height)) throw new Error(`Mask ${item.id} does not match project canvas`);
        return {
          id: item.id,
          content: new ImageData(content.data, width, height),
          mask: mask ? new ImageData(mask.data, width, height) : null
        };
      }),
      vectors: document.vectors.map((item) => ({
        id: item.id,
        strokes: item.strokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({
          ...point,
          ...(point.inHandle ? { inHandle: { ...point.inHandle } } : {}),
          ...(point.outHandle ? { outHandle: { ...point.outHandle } } : {})
        })) }))
      })),
      selectionLayers: document.selectionLayers.map((item) => ({ id: item.id, mask: deserializeSelectionBytes(item.mask, pixelCount) }))
    };
    this.selectionRect = null;
    this.selectionMask = null;
    this.restore(snapshot);
    this.history.clear();
    this.history.push(this.snapshot());
    this.emitHistory();
    this.emitSelection();
  }

  private resizeProjectCanvas(width: number, height: number): void {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > 100_000 || height > 100_000) {
      throw new Error('Invalid project canvas dimensions');
    }
    for (const canvas of [this.canvas, this.compositeCache, this.assistOverlay, this.selectionMaskOverlay]) {
      canvas.width = width;
      canvas.height = height;
    }
    this.sheet.style.aspectRatio = `${width} / ${height}`;
  }

  undo(): void {
    const snapshot = this.history.undo();
    if (snapshot) { this.restore(snapshot); this.onHistoryEntry?.('Undo'); }
    this.emitHistory();
  }

  redo(): void {
    const snapshot = this.history.redo();
    if (snapshot) { this.restore(snapshot); this.onHistoryEntry?.('Redo'); }
    this.emitHistory();
  }

  copyCompositeTo(target: HTMLCanvasElement): void {
    this.renderCompositeNow();
    const context = target.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, target.width, target.height);
    context.drawImage(this.compositeCache, 0, 0, target.width, target.height);
  }

  exportPng(filename = 'drawing-v0.6.7-restored.png'): void {
    const exportCanvas = this.createCanvas(this.canvas.width, this.canvas.height);
    const exportContext = exportCanvas.getContext('2d', { alpha: true });
    if (!exportContext) return;
    this.renderSiblingSet(null, exportContext, null, true);
    const anchor = document.createElement('a');
    anchor.download = filename;
    anchor.href = exportCanvas.toDataURL('image/png');
    anchor.click();
  }

  addLayer(): void {
    this.commitLayerState(addRasterLayer(this.layers), 'New raster layer');
  }

  addFillLayer(color = this.state.color): void {
    this.commitLayerState(addFillLayer(this.layers, color), 'New fill layer');
  }

  addGradientLayer(startColor = this.state.color, endColor = this.state.secondaryColor): void {
    this.commitLayerState(addGradientLayer(this.layers, startColor, endColor), 'New gradient layer');
  }

  addCorrectionLayer(type: 'brightness-contrast' | 'hue-saturation' = 'brightness-contrast'): void {
    this.commitLayerState(addCorrectionLayer(this.layers, type), 'New correction layer');
  }

  addSelectionLayer(): void {
    this.layers = addSelectionLayer(this.layers);
    const mask = this.selectionMask?.slice() ?? new Uint8Array(this.canvas.width * this.canvas.height);
    this.selectionLayers.set(this.layers.activeLayerId, mask);
    this.finishDocumentMutation('New selection layer');
  }

  setLayerRole(role: LayerRole): void {
    this.commitLayerState(setActiveRasterRole(this.layers, role), `Layer role: ${role}`);
  }

  setLayerColorTag(tag: LayerColorTag): void {
    this.commitLayerState(setActiveColorTag(this.layers, tag), `Layer color tag: ${tag}`);
  }

  updateSpecialLayer(patch: SpecialLayerPatch): void {
    this.commitLayerState(updateActiveSpecialLayer(this.layers, patch), 'Edit generated layer');
  }

  addVectorLayer(): void {
    this.commitLayerState(addVectorLayer(this.layers), 'New vector layer');
    this.vectors.set(this.layers.activeLayerId, []);
    this.markCompositeDirty();
    this.emitSelection();
  }

  selectAll(): void {
    this.selectionRect = { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
    this.selectionMask = rectangleMask(this.canvas.width, this.canvas.height, this.selectionRect);
    this.selectedVectorStrokeId = null;
    this.syncSelectionOverlay();
    this.compositeDirty = true;
    this.renderCompositeNow();
    this.emitSelection();
  }

  clearSelection(): void {
    this.selectionRect = null;
    this.selectionMask = null;
    this.selectedVectorStrokeId = null;
    this.selectedVectorPointIndex = null;
    this.polygonPoints = [];
    this.syncSelectionOverlay();
    this.compositeDirty = true;
    this.renderCompositeNow();
    this.emitSelection();
  }

  expandSelection(radius = 2): void {
    if (!this.selectionMask) return;
    this.selectionMask = expandSelectionMask(this.selectionMask, this.canvas.width, this.canvas.height, Math.max(1, radius));
    this.selectionRect = maskBounds(this.selectionMask, this.canvas.width, this.canvas.height);
    this.syncSelectionOverlay();
    this.emitSelection();
  }

  contractSelection(radius = 2): void {
    if (!this.selectionMask) return;
    this.selectionMask = contractSelectionMask(this.selectionMask, this.canvas.width, this.canvas.height, Math.max(1, radius));
    this.selectionRect = maskBounds(this.selectionMask, this.canvas.width, this.canvas.height);
    this.syncSelectionOverlay();
    this.emitSelection();
  }

  invertSelection(): void {
    const base = this.selectionMask ?? new Uint8Array(this.canvas.width * this.canvas.height);
    this.selectionMask = invertSelectionMask(base);
    this.selectionRect = maskBounds(this.selectionMask, this.canvas.width, this.canvas.height);
    this.syncSelectionOverlay();
    this.emitSelection();
  }

  featherSelection(radius = this.state.selectionFeather): void {
    if (!this.selectionMask || radius <= 0) return;
    this.selectionMask = featherSelectionMask(this.selectionMask, this.canvas.width, this.canvas.height, radius);
    this.selectionRect = maskBounds(this.selectionMask, this.canvas.width, this.canvas.height);
    this.syncSelectionOverlay();
    this.emitSelection();
  }

  finishPolygonSelection(): void {
    if (this.polygonPoints.length < 3) { this.polygonPoints = []; this.emitSelection(); return; }
    const incoming = createPolygonMask(this.canvas.width, this.canvas.height, this.polygonPoints);
    this.polygonPoints = [];
    this.applyIncomingSelectionMask(incoming);
  }

  addVectorControlPoint(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (active.kind !== 'vector' || !this.selectedVectorStrokeId) return;
    const strokes = this.vectors.get(active.id) ?? [];
    const stroke = strokes.find((candidate) => candidate.id === this.selectedVectorStrokeId);
    if (!stroke || stroke.points.length < 2) return;
    let segmentIndex = this.selectedVectorPointIndex ?? 0;
    segmentIndex = Math.max(0, Math.min(stroke.points.length - 2, segmentIndex));
    const a = stroke.points[segmentIndex]!;
    const b = stroke.points[segmentIndex + 1]!;
    const point = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const next = insertVectorPoint(stroke, segmentIndex, point);
    this.vectors.set(active.id, strokes.map((candidate) => candidate.id === stroke.id ? next : candidate));
    this.selectedVectorPointIndex = segmentIndex + 1;
    this.finishPixelMutation('Add vector control point');
    this.emitSelection();
  }

  deleteVectorControlPoint(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (active.kind !== 'vector' || !this.selectedVectorStrokeId || this.selectedVectorPointIndex === null) return;
    const strokes = this.vectors.get(active.id) ?? [];
    const stroke = strokes.find((candidate) => candidate.id === this.selectedVectorStrokeId);
    if (!stroke) return;
    const next = deleteVectorPoint(stroke, this.selectedVectorPointIndex);
    if (next === stroke) return;
    this.vectors.set(active.id, strokes.map((candidate) => candidate.id === stroke.id ? next : candidate));
    this.selectedVectorPointIndex = Math.min(this.selectedVectorPointIndex, next.points.length - 1);
    this.finishPixelMutation('Delete vector control point');
    this.emitSelection();
  }

  toggleVectorHandles(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (active.kind !== 'vector' || !this.selectedVectorStrokeId || this.selectedVectorPointIndex === null) return;
    const strokes = this.vectors.get(active.id) ?? [];
    const stroke = strokes.find((candidate) => candidate.id === this.selectedVectorStrokeId);
    if (!stroke) return;
    const index = this.selectedVectorPointIndex;
    const anchor = stroke.points[index]!;
    const has = Boolean(anchor.inHandle || anchor.outHandle);
    let next = setVectorHandle(stroke, index, 'in', null);
    next = setVectorHandle(next, index, 'out', null);
    if (!has) {
      const prev = stroke.points[Math.max(0, index - 1)]!;
      const following = stroke.points[Math.min(stroke.points.length - 1, index + 1)]!;
      let dx = following.x - prev.x;
      let dy = following.y - prev.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      dx /= length; dy /= length;
      const handleLength = Math.max(12, Math.min(60, length * 0.25));
      next = setVectorHandle(next, index, 'in', { x: anchor.x - dx * handleLength, y: anchor.y - dy * handleLength });
      next = setVectorHandle(next, index, 'out', { x: anchor.x + dx * handleLength, y: anchor.y + dy * handleLength });
    }
    this.vectors.set(active.id, strokes.map((candidate) => candidate.id === stroke.id ? next : candidate));
    this.finishPixelMutation(has ? 'Remove Bezier handles' : 'Add Bezier handles');
    this.emitSelection();
  }

  simplifySelectedVectorStroke(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (active.kind !== 'vector' || !this.selectedVectorStrokeId) return;
    const strokes = this.vectors.get(active.id) ?? [];
    const next = strokes.map((stroke) => stroke.id === this.selectedVectorStrokeId ? simplifyVectorStroke(stroke, 2) : stroke);
    this.vectors.set(active.id, next);
    this.selectedVectorPointIndex = null;
    this.finishPixelMutation('Simplify vector stroke');
    this.emitSelection();
  }

  connectSelectedVectorStroke(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (active.kind !== 'vector' || !this.selectedVectorStrokeId) return;
    const strokes = this.vectors.get(active.id) ?? [];
    const selected = strokes.find((stroke) => stroke.id === this.selectedVectorStrokeId);
    if (!selected) return;
    const others = strokes.filter((stroke) => stroke.id !== selected.id);
    if (others.length === 0) return;
    const endpoint = selected.points.at(-1)!;
    const other = others.reduce((best, stroke) => {
      const d = Math.min(
        Math.hypot(endpoint.x - stroke.points[0]!.x, endpoint.y - stroke.points[0]!.y),
        Math.hypot(endpoint.x - stroke.points.at(-1)!.x, endpoint.y - stroke.points.at(-1)!.y)
      );
      return !best || d < best.distance ? { stroke, distance: d } : best;
    }, null as { stroke: VectorStroke; distance: number } | null)?.stroke;
    if (!other) return;
    const joined = connectVectorStrokes(selected, other, `stroke-${this.vectorStrokeCounter++}`);
    this.vectors.set(active.id, [...strokes.filter((stroke) => stroke.id !== selected.id && stroke.id !== other.id), joined]);
    this.selectedVectorStrokeId = joined.id;
    this.selectedVectorPointIndex = null;
    this.finishPixelMutation('Connect vector strokes');
    this.emitSelection();
  }

  beginVectorRedraw(): void {
    if (!this.selectedVectorStrokeId) return;
    this.vectorRedrawPending = true;
    this.onHistoryEntry?.('Vector redraw ready');
  }

  flipSelection(axis: 'horizontal' | 'vertical'): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!this.selectionRect || !isRasterNode(active) || active.kind === 'background') return;
    const surface = this.surfaces.get(active.id);
    if (!surface) return;
    const rect = this.integerSelectionRect(this.selectionRect);
    if (!rect) return;
    const temp = this.createCanvas(rect.width, rect.height);
    temp.getContext('2d')!.drawImage(surface.canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    surface.context.clearRect(rect.x, rect.y, rect.width, rect.height);
    surface.context.save();
    surface.context.translate(rect.x + (axis === 'horizontal' ? rect.width : 0), rect.y + (axis === 'vertical' ? rect.height : 0));
    surface.context.scale(axis === 'horizontal' ? -1 : 1, axis === 'vertical' ? -1 : 1);
    surface.context.drawImage(temp, 0, 0);
    surface.context.restore();
    this.finishPixelMutation(axis === 'horizontal' ? 'Flip horizontal' : 'Flip vertical');
  }

  rotateSelection90(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!this.selectionRect || !isRasterNode(active) || active.kind === 'background') return;
    const surface = this.surfaces.get(active.id);
    if (!surface) return;
    const rect = this.integerSelectionRect(this.selectionRect);
    if (!rect) return;
    const source = this.createCanvas(rect.width, rect.height);
    source.getContext('2d')!.drawImage(surface.canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    const nextRect = clampSelectionRect(rotatedRect90(rect), this.canvas.width, this.canvas.height);
    const next = this.integerSelectionRect(nextRect);
    if (!next) return;
    const rotated = this.createCanvas(rect.height, rect.width);
    const rctx = rotated.getContext('2d')!;
    rctx.translate(rotated.width / 2, rotated.height / 2);
    rctx.rotate(Math.PI / 2);
    rctx.drawImage(source, -source.width / 2, -source.height / 2);
    surface.context.clearRect(rect.x, rect.y, rect.width, rect.height);
    surface.context.drawImage(rotated, 0, 0, rotated.width, rotated.height, next.x, next.y, next.width, next.height);
    this.selectionRect = nextRect;
    this.syncSelectionOverlay();
    this.finishPixelMutation('Rotate selection 90°');
    this.emitSelection();
  }

  scaleSelection(factor: number): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!this.selectionRect || !isRasterNode(active) || active.kind === 'background') return;
    const surface = this.surfaces.get(active.id);
    if (!surface) return;
    const rect = this.integerSelectionRect(this.selectionRect);
    if (!rect) return;
    const temp = this.createCanvas(rect.width, rect.height);
    temp.getContext('2d')!.drawImage(surface.canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    const nextRect = clampSelectionRect(scaleRectFromCenter(rect, factor), this.canvas.width, this.canvas.height);
    const next = this.integerSelectionRect(nextRect);
    if (!next) return;
    surface.context.clearRect(rect.x, rect.y, rect.width, rect.height);
    surface.context.drawImage(temp, 0, 0, rect.width, rect.height, next.x, next.y, next.width, next.height);
    this.selectionRect = nextRect;
    this.syncSelectionOverlay();
    this.finishPixelMutation(`Scale selection ${Math.round(factor * 100)}%`);
    this.emitSelection();
  }

  rasterizeVectorLayer(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (active.kind !== 'vector') return;
    const strokes = this.vectors.get(active.id) ?? [];
    this.layers = rasterizeActiveVectorLayer(this.layers);
    this.reconcileSurfaces();
    const surface = this.surfaces.get(active.id);
    if (!surface) return;
    renderVectorStrokes(surface.context, strokes);
    this.vectors.delete(active.id);
    this.selectedVectorStrokeId = null;
    this.finishDocumentMutation('Rasterize vector layer');
    this.emitSelection();
  }

  setSelectedVectorStrokeWidth(size: number): void {
    this.updateSelectedVectorStroke({ size }, 'Vector stroke width');
  }

  recolorSelectedVectorStroke(): void {
    this.updateSelectedVectorStroke({ color: this.state.color }, 'Recolor vector stroke');
  }

  deleteSelectedVectorStroke(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (active.kind !== 'vector' || !this.selectedVectorStrokeId) return;
    const strokes = this.vectors.get(active.id) ?? [];
    const next = strokes.filter((stroke) => stroke.id !== this.selectedVectorStrokeId);
    if (next.length === strokes.length) return;
    this.vectors.set(active.id, next);
    this.selectedVectorStrokeId = null;
    this.finishPixelMutation('Delete vector stroke');
    this.emitSelection();
  }

  selectLayer(id: string): void {
    const previous = findLayerNode(this.layers, this.layers.activeLayerId);
    if (previous.kind === 'selection' && this.selectionMask) this.selectionLayers.set(previous.id, this.selectionMask.slice());
    this.layers = selectLayerNode(this.layers, id);
    const active = findLayerNode(this.layers, id);
    if (active.kind === 'selection') {
      this.selectionMask = this.selectionLayers.get(id)?.slice() ?? new Uint8Array(this.canvas.width * this.canvas.height);
      this.selectionRect = maskBounds(this.selectionMask, this.canvas.width, this.canvas.height);
      this.syncSelectionOverlay();
    }
    this.canvas.dataset.layerTarget = this.layers.activeTarget;
    this.selectedVectorStrokeId = null;
    this.compositeDirty = true;
    this.renderCompositeNow();
    this.emitLayers();
    this.emitSelection();
  }

  toggleLayerVisibility(id: string): void {
    this.commitLayerState(toggleLayerVisibility(this.layers, id), 'Toggle layer visibility');
  }

  moveLayer(direction: 'up' | 'down'): void {
    this.commitLayerState(moveActiveNode(this.layers, direction), direction === 'up' ? 'Move layer up' : 'Move layer down');
  }

  renameLayer(name: string): void {
    this.commitLayerState(renameActiveNode(this.layers, name), 'Rename layer');
  }

  setLayerOpacity(opacity: number): void {
    this.commitLayerState(setActiveOpacity(this.layers, opacity), 'Layer opacity');
  }

  setLayerBlendMode(mode: BlendMode): void {
    this.commitLayerState(setActiveBlendMode(this.layers, mode), 'Blend mode');
  }

  toggleAlphaLock(): void {
    this.commitLayerState(toggleActiveAlphaLock(this.layers), 'Toggle alpha lock');
  }

  toggleClipping(): void {
    this.commitLayerState(toggleActiveClipping(this.layers), 'Toggle clipping');
  }

  toggleMask(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!isRasterNode(active) || active.kind === 'background') return;
    if (active.hasMask) {
      this.commitLayerState(removeLayerMask(this.layers), 'Remove layer mask');
    } else {
      this.commitLayerState(addLayerMask(this.layers), 'Add layer mask');
    }
  }

  editMask(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!isRasterNode(active) || !active.hasMask) return;
    this.layers = this.layers.activeTarget === 'mask' ? selectLayerContent(this.layers) : selectLayerMask(this.layers);
    this.canvas.dataset.layerTarget = this.layers.activeTarget;
    this.emitLayers();
  }

  groupLayer(): void {
    this.commitLayerState(groupActiveNode(this.layers), 'Group layer');
  }

  duplicateLayer(): void {
    const result = duplicateActiveNode(this.layers);
    if (result.idMap.size === 0) return;
    const previousSurfaces = new Map(this.surfaces);
    this.layers = result.state;
    this.reconcileSurfaces();
    for (const [sourceId, copyId] of result.idMap) {
      const source = previousSurfaces.get(sourceId);
      const copy = this.surfaces.get(copyId);
      if (!source || !copy) continue;
      copy.context.clearRect(0, 0, copy.canvas.width, copy.canvas.height);
      copy.context.drawImage(source.canvas, 0, 0);
      if (source.maskCanvas && copy.maskContext) {
        copy.maskContext.clearRect(0, 0, copy.canvas.width, copy.canvas.height);
        copy.maskContext.drawImage(source.maskCanvas, 0, 0);
      }
    }
    for (const [sourceId, copyId] of result.idMap) {
      const sourceVectors = this.vectors.get(sourceId);
      if (sourceVectors) this.vectors.set(copyId, sourceVectors.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point, ...(point.inHandle ? { inHandle: { ...point.inHandle } } : {}), ...(point.outHandle ? { outHandle: { ...point.outHandle } } : {}) })) })));
    }
    for (const [sourceId, copyId] of result.idMap) {
      const sourceSelection = this.selectionLayers.get(sourceId);
      if (sourceSelection) this.selectionLayers.set(copyId, sourceSelection.slice());
    }
    this.finishDocumentMutation('Duplicate layer');
  }

  addEditableLayer(data: EditableLayerData): void {
    this.commitLayerState(addEditableLayerState(this.layers, data), `Add ${data.kind} layer`);
  }

  updateEditableLayer(patch: EditableLayerPatch): void {
    this.commitLayerState(updateActiveEditableLayer(this.layers, patch), 'Update editable layer');
  }

  deleteLayer(): void {
    const next = deleteActiveNode(this.layers);
    if (next === this.layers) return;
    this.commitLayerState(next, 'Delete layer');
  }

  mergeLayerDown(): void {
    const sourceNode = findLayerNode(this.layers, this.layers.activeLayerId);
    const targetId = getMergeDownTargetId(this.layers);
    if (!targetId || !isRasterNode(sourceNode) || sourceNode.kind === 'background') return;
    const targetNode = findLayerNode(this.layers, targetId);
    if (!isRasterNode(targetNode) || targetNode.kind === 'background') return;
    const sourceSurface = this.surfaces.get(sourceNode.id);
    const targetSurface = this.surfaces.get(targetNode.id);
    if (!sourceSurface || !targetSurface) return;

    const prepared = this.prepareRaster(sourceNode);
    if (sourceNode.clipping) {
      prepared.getContext('2d')!.globalCompositeOperation = 'destination-in';
      prepared.getContext('2d')!.drawImage(targetSurface.canvas, 0, 0);
      prepared.getContext('2d')!.globalCompositeOperation = 'source-over';
    }
    targetSurface.context.save();
    targetSurface.context.globalAlpha = sourceNode.opacity;
    targetSurface.context.globalCompositeOperation = blendModeToCompositeOperation(sourceNode.blendMode);
    targetSurface.context.drawImage(prepared, 0, 0);
    targetSurface.context.restore();

    this.layers = {
      ...this.layers,
      nodes: this.layers.nodes.filter((node) => node.id !== sourceNode.id),
      activeLayerId: targetNode.id,
      activeTarget: 'content'
    };
    this.reconcileSurfaces();
    this.finishDocumentMutation('Merge layer down');
  }


  flattenVisibleLayers(): void {
    this.renderCompositeNow();
    const flattened = this.compositeCacheContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const id = `paint-${this.layers.nextRasterNumber}`;
    const node: RasterLayerNode = {
      id,
      name: 'Flattened Visible',
      kind: 'raster',
      parentId: null,
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
      colorTag: 'none',
      alphaLock: false,
      clipping: false,
      hasMask: false,
      role: 'normal'
    };
    this.layers = { ...this.layers, nodes: [node], activeLayerId: id, activeTarget: 'content', nextRasterNumber: this.layers.nextRasterNumber + 1 };
    this.surfaces.clear(); this.vectors.clear(); this.selectionLayers.clear(); this.reconcileSurfaces();
    this.surfaces.get(id)?.context.putImageData(flattened, 0, 0);
    this.selectionRect = null; this.selectionMask = null; this.selectedVectorStrokeId = null;
    this.finishDocumentMutation('Flatten visible layers');
    this.emitSelection();
  }

  private createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  private createSurface(node: RasterLayerNode): LayerSurface {
    const canvas = this.createCanvas(this.canvas.width, this.canvas.height);
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Layer context is unavailable.');
    if (node.kind === 'background') {
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    return { canvas, context, maskCanvas: null, maskContext: null };
  }

  private ensureMask(surface: LayerSurface): void {
    if (surface.maskCanvas && surface.maskContext) return;
    const mask = this.createCanvas(this.canvas.width, this.canvas.height);
    const context = mask.getContext('2d', { alpha: true });
    if (!context) throw new Error('Mask context is unavailable.');
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, mask.width, mask.height);
    surface.maskCanvas = mask;
    surface.maskContext = context;
  }

  private reconcileSurfaces(): void {
    const validIds = new Set<string>();
    const validVectorIds = new Set<string>();
    const validSelectionIds = new Set<string>();
    for (const node of this.layers.nodes) {
      if (node.kind === 'selection') { validSelectionIds.add(node.id); if (!this.selectionLayers.has(node.id)) this.selectionLayers.set(node.id, new Uint8Array(this.canvas.width * this.canvas.height)); continue; }
      if (node.kind === 'vector') {
        validVectorIds.add(node.id);
        if (!this.vectors.has(node.id)) this.vectors.set(node.id, []);
        continue;
      }
      if (!isRasterNode(node)) continue;
      validIds.add(node.id);
      let surface = this.surfaces.get(node.id);
      if (!surface) {
        surface = this.createSurface(node);
        this.surfaces.set(node.id, surface);
      }
      if (node.hasMask) this.ensureMask(surface);
      else {
        surface.maskCanvas = null;
        surface.maskContext = null;
      }
    }
    for (const id of [...this.surfaces.keys()]) {
      if (!validIds.has(id)) this.surfaces.delete(id);
    }
    for (const id of [...this.vectors.keys()]) { if (!validVectorIds.has(id)) this.vectors.delete(id); }
    for (const id of [...this.selectionLayers.keys()]) { if (!validSelectionIds.has(id)) this.selectionLayers.delete(id); }
  }

  private installPointerEvents(): void {
    this.canvas.addEventListener('pointerdown', (event) => this.handleDrawPointerDown(event));
    this.canvas.addEventListener('pointermove', (event) => this.handleDrawPointerMove(event));
    this.canvas.addEventListener('pointerup', (event) => this.handleDrawPointerUp(event));
    this.canvas.addEventListener('pointercancel', (event) => this.handleDrawPointerUp(event));
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private installViewEvents(): void {
    this.element.addEventListener('pointerdown', (event) => this.handlePanPointerDown(event));
    this.element.addEventListener('pointermove', (event) => this.handlePanPointerMove(event));
    this.element.addEventListener('pointerup', (event) => this.handlePanPointerUp(event));
    this.element.addEventListener('pointercancel', (event) => this.handlePanPointerUp(event));
    this.element.addEventListener('wheel', (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      this.onZoomChange?.(zoomFromWheel(this.state.zoom, event.deltaY));
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
      if (event.code !== 'Space' || isEditableTarget(event.target)) return;
      this.spacePressed = true;
      this.element.classList.add('space-pan-ready');
      event.preventDefault();
    });
    window.addEventListener('keyup', (event) => {
      if (event.code !== 'Space') return;
      this.spacePressed = false;
      this.element.classList.remove('space-pan-ready');
    });
    window.addEventListener('blur', () => {
      this.spacePressed = false;
      this.element.classList.remove('space-pan-ready');
    });
  }

  private canDrawActiveLayer(): boolean {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!isRasterNode(active) || active.locked || active.kind === 'background' || !active.visible) return false;
    if (this.layers.activeTarget === 'mask') return active.hasMask;
    if (active.alphaLock && this.state.tool === 'eraser') return false;
    return true;
  }

  private canFillActiveLayer(): boolean {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    return isRasterNode(active) && active.kind !== 'background' && !active.locked && active.visible && this.layers.activeTarget === 'content';
  }

  private getFillReference(activeId: string): PixelBuffer {
    if (this.state.fillReference === 'active') {
      const surface = this.surfaces.get(activeId);
      if (surface) return surface.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.state.fillReference === 'line-art') {
      const referenceCanvas = this.createCanvas(this.canvas.width, this.canvas.height);
      const referenceContext = referenceCanvas.getContext('2d', { alpha: true })!;
      const references = this.layers.nodes.filter((node): node is RasterLayerNode => isRasterNode(node) && node.kind === 'raster' && node.role === 'reference' && node.visible);
      if (references.length > 0) {
        for (const node of references) referenceContext.drawImage(this.prepareRaster(node), 0, 0);
      } else {
        this.renderSiblingSet(null, referenceContext, activeId);
      }
      return referenceContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
    this.renderCompositeNow();
    return this.compositeCacheContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  private performSmartFill(x: number, y: number): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!isRasterNode(active) || !this.canFillActiveLayer()) return;
    const surface = this.surfaces.get(active.id);
    if (!surface) return;
    const target = surface.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    let mask: Uint8Array;
    if (this.state.fillMode === 'unpainted') {
      mask = createUnpaintedMask(target, x, y, 16);
    } else if (this.state.fillMode === 'enclose') {
      if (this.selectionMask) mask = this.selectionMask.slice();
      else if (this.selectionRect) mask = rectangleMask(this.canvas.width, this.canvas.height, this.selectionRect);
      else return;
    } else {
      const reference = this.getFillReference(active.id);
      mask = createFillMask(reference, x, y, { tolerance: this.state.fillTolerance, gapClosing: this.state.fillGapClosing });
      mask = expandFillMask(mask, reference.width, reference.height, this.state.fillExpansion);
      if (this.state.fillAntialias) mask = antialiasFillMask(mask, reference.width, reference.height);
    }
    applyFillColor(target, mask, this.state.color, this.state.opacity);
    surface.context.putImageData(target, 0, 0);
    this.markCompositeDirty();
    this.renderCompositeNow();
    this.history.push(this.snapshot());
    const label = this.state.fillMode === 'bucket' ? 'Smart Fill' : this.state.fillMode === 'enclose' ? 'Enclose & Fill' : 'Fill unpainted area';
    this.onHistoryEntry?.(label);
    this.emitHistory();
  }

  private sampleCompositeColor(x: number, y: number): void {
    this.renderCompositeNow();
    const buffer = this.compositeCacheContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.onColorSample?.(samplePixelHex(buffer, x, y));
  }

  private editableRasterSurface(): { node: RasterLayerNode; surface: LayerSurface } | null {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!isRasterNode(active) || active.kind === 'background' || active.locked || !active.visible || this.layers.activeTarget !== 'content') return null;
    const surface = this.surfaces.get(active.id);
    return surface ? { node: active, surface } : null;
  }

  private applyToolCanvas(toolCanvas: HTMLCanvasElement, label: string): void {
    const target = this.editableRasterSurface();
    if (!target) return;
    if (this.selectionMask) {
      const maskCanvas = this.createCanvas(this.canvas.width, this.canvas.height);
      const maskContext = maskCanvas.getContext('2d')!;
      const image = maskContext.createImageData(this.canvas.width, this.canvas.height);
      for (let index = 0; index < this.selectionMask.length; index += 1) {
        if (!this.selectionMask[index]) continue;
        image.data[index * 4] = 255;
        image.data[index * 4 + 1] = 255;
        image.data[index * 4 + 2] = 255;
        image.data[index * 4 + 3] = 255;
      }
      maskContext.putImageData(image, 0, 0);
      const masked = this.createCanvas(this.canvas.width, this.canvas.height);
      const maskedContext = masked.getContext('2d')!;
      maskedContext.drawImage(toolCanvas, 0, 0);
      maskedContext.globalCompositeOperation = 'destination-in';
      maskedContext.drawImage(maskCanvas, 0, 0);
      toolCanvas = masked;
    }
    target.surface.context.save();
    target.surface.context.globalCompositeOperation = target.node.alphaLock ? 'source-atop' : 'source-over';
    target.surface.context.drawImage(toolCanvas, 0, 0);
    target.surface.context.restore();
    this.finishPixelMutation(label);
  }

  private performGradient(start: Point, end: Point): void {
    if (!this.editableRasterSurface()) return;
    const toolCanvas = this.createCanvas(this.canvas.width, this.canvas.height);
    const ctx = toolCanvas.getContext('2d')!;
    const radius = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
    const gradient = this.state.gradientMode === 'radial'
      ? ctx.createRadialGradient(start.x, start.y, 0, start.x, start.y, radius)
      : ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    gradient.addColorStop(0, this.state.color);
    gradient.addColorStop(1, this.state.secondaryColor);
    ctx.globalAlpha = this.state.opacity;
    ctx.fillStyle = gradient;
    const rect = this.selectionRect ?? { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    this.applyToolCanvas(toolCanvas, `${this.state.gradientMode === 'radial' ? 'Radial' : 'Linear'} gradient`);
  }

  private performShape(start: Point, end: Point): void {
    if (!this.editableRasterSurface()) return;
    const toolCanvas = this.createCanvas(this.canvas.width, this.canvas.height);
    const ctx = toolCanvas.getContext('2d')!;
    const bounds = shapeBounds(start, end);
    ctx.save();
    ctx.globalAlpha = this.state.opacity;
    ctx.strokeStyle = this.state.color;
    ctx.fillStyle = this.state.color;
    ctx.lineWidth = this.state.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (this.state.shapeType === 'line') {
      ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
    } else if (this.state.shapeType === 'rectangle') {
      ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    } else {
      ctx.ellipse(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, bounds.width / 2, bounds.height / 2, 0, 0, Math.PI * 2);
    }
    if (this.state.shapeFill && this.state.shapeType !== 'line') ctx.fill();
    else ctx.stroke();
    ctx.restore();
    this.applyToolCanvas(toolCanvas, `${this.state.shapeType} shape`);
  }

  private performText(x: number, y: number): void {
    if (!this.state.textValue.trim()) return;
    const size = normalizeTextSize(this.state.textSize);
    const data = {
      ...createEditableLayerData('text', this.canvas.width, this.canvas.height),
      content: this.state.textValue, fontFamily: this.state.textFont, fontSize: size,
      fillColor: this.state.color, x, y
    };
    this.layers = addEditableLayerState(this.layers, data);
    if (this.state.opacity !== 1) this.layers = setActiveOpacity(this.layers, this.state.opacity);
    this.finishDocumentMutation('Add editable text');
  }

  private performEditablePlacement(kind: Exclude<EditableLayerKind, 'text' | 'material'>, x: number, y: number): void {
    let data = createEditableLayerData(kind, this.canvas.width, this.canvas.height);
    if (data.kind === 'balloon') {
      data = { ...data, x: x - data.width / 2, y: y - data.height / 2, tailEndX: x + data.width * .2, tailEndY: y + data.height * .75 };
    } else if (data.kind === 'manga-effect') {
      data = { ...data, centerX: x, centerY: y };
    }
    this.layers = addEditableLayerState(this.layers, data);
    this.finishDocumentMutation(`Add editable ${kind}`);
  }

  private performMagicWand(x: number, y: number): void {
    this.renderCompositeNow();
    const source = this.compositeCacheContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const incoming = createMagicWandMask(source, x, y, this.state.magicWandTolerance);
    this.applyIncomingSelectionMask(incoming);
  }

  private handleDrawPointerDown(event: PointerEvent): void {
    if (this.spacePressed || this.state.tool === 'pan') return;
    if (event.button !== 0) return;
    const rawSample = this.toCanvasSample(event);

    if (this.state.tool === 'assist') {
      event.preventDefault();
      event.stopPropagation();
      this.assistDragging = this.hitAssistHandle(rawSample);
      if (this.assistDragging) {
        this.activePointerId = event.pointerId;
        this.canvas.setPointerCapture?.(event.pointerId);
      }
      return;
    }

    this.assistStrokeOrigin = rawSample;
    const sample = this.applyAssistToSample(rawSample);

    if (this.state.tool === 'eyedropper') {
      event.preventDefault();
      event.stopPropagation();
      this.sampleCompositeColor(sample.x, sample.y);
      return;
    }

    if (this.state.tool === 'magic-wand') {
      event.preventDefault();
      event.stopPropagation();
      this.performMagicWand(sample.x, sample.y);
      return;
    }

    if (this.state.tool === 'text') {
      event.preventDefault();
      event.stopPropagation();
      this.performText(sample.x, sample.y);
      return;
    }

    const editableToolKinds = { balloon: 'balloon', panel: 'panel', tone: 'screen-tone', effect: 'manga-effect' } as const;
    const editableKind = editableToolKinds[this.state.tool as keyof typeof editableToolKinds];
    if (editableKind) {
      event.preventDefault();
      event.stopPropagation();
      this.performEditablePlacement(editableKind, sample.x, sample.y);
      return;
    }

    if (this.state.tool === 'lasso') {
      event.preventDefault();
      event.stopPropagation();
      this.gesturePointerId = event.pointerId;
      this.lassoPoints = [{ x: sample.x, y: sample.y }];
      this.canvas.setPointerCapture?.(event.pointerId);
      return;
    }

    if (this.state.tool === 'gradient' || this.state.tool === 'shape') {
      if (!this.editableRasterSurface()) return;
      event.preventDefault();
      event.stopPropagation();
      this.gesturePointerId = event.pointerId;
      this.gestureStart = { x: sample.x, y: sample.y };
      this.gestureEnd = { x: sample.x, y: sample.y };
      this.canvas.setPointerCapture?.(event.pointerId);
      return;
    }

    const pointerLayer = findLayerNode(this.layers, this.layers.activeLayerId);
    if (this.state.tool === 'eraser' && pointerLayer.kind === 'vector') {
      const strokes = this.vectors.get(pointerLayer.id) ?? [];
      const nearest = findNearestStroke(strokes, sample, Math.max(10, this.state.brushSize));
      if (!nearest) return;
      event.preventDefault();
      event.stopPropagation();
      const pieces = eraseVectorSegment(nearest, sample, Math.max(10, this.state.brushSize));
      if (pieces.length === 1 && pieces[0] === nearest) return;
      this.vectors.set(pointerLayer.id, [...strokes.filter((stroke) => stroke.id !== nearest.id), ...pieces]);
      if (this.selectedVectorStrokeId === nearest.id) {
        this.selectedVectorStrokeId = pieces[0]?.id ?? null;
        this.selectedVectorPointIndex = null;
      }
      this.finishPixelMutation('Partial vector eraser');
      this.emitSelection();
      return;
    }

    if (this.state.tool === 'select') {
      event.preventDefault();
      event.stopPropagation();
      const active = findLayerNode(this.layers, this.layers.activeLayerId);
      if (active.kind === 'vector') {
        const strokes = this.vectors.get(active.id) ?? [];
        if (this.selectedVectorStrokeId) {
          const selected = strokes.find((stroke) => stroke.id === this.selectedVectorStrokeId);
          if (selected) {
            if (this.selectedVectorPointIndex !== null) {
              const anchor = selected.points[this.selectedVectorPointIndex];
              if (anchor?.inHandle && Math.hypot(sample.x - anchor.inHandle.x, sample.y - anchor.inHandle.y) <= 12) {
                this.vectorHandleEditing = { strokeId: selected.id, pointIndex: this.selectedVectorPointIndex, side: 'in' };
                this.activePointerId = event.pointerId;
                this.canvas.setPointerCapture?.(event.pointerId);
                return;
              }
              if (anchor?.outHandle && Math.hypot(sample.x - anchor.outHandle.x, sample.y - anchor.outHandle.y) <= 12) {
                this.vectorHandleEditing = { strokeId: selected.id, pointIndex: this.selectedVectorPointIndex, side: 'out' };
                this.activePointerId = event.pointerId;
                this.canvas.setPointerCapture?.(event.pointerId);
                return;
              }
            }
            const pointIndex = findNearestPointIndex(selected, sample, 12);
            if (pointIndex !== null) {
              this.selectedVectorPointIndex = pointIndex;
              this.vectorPointEditingIndex = pointIndex;
              this.vectorPointEditingStrokeId = selected.id;
              this.activePointerId = event.pointerId;
              this.canvas.setPointerCapture?.(event.pointerId);
              this.compositeDirty = true;
              this.renderCompositeNow();
              this.emitSelection();
              return;
            }
          }
        }
        const nearest = findNearestStroke(strokes, sample, Math.max(8, this.state.brushSize));
        this.selectedVectorStrokeId = nearest?.id ?? null;
        this.selectedVectorPointIndex = null;
        this.selectionRect = null;
        this.selectionMask = null;
        this.syncSelectionOverlay();
        this.compositeDirty = true;
        this.renderCompositeNow();
        this.emitSelection();
        return;
      }

      if (this.state.selectionShape === 'polygon') {
        const first = this.polygonPoints[0];
        if (first && this.polygonPoints.length >= 3 && Math.hypot(sample.x - first.x, sample.y - first.y) <= 12) {
          this.finishPolygonSelection();
          return;
        }
        this.polygonPoints.push({ x: sample.x, y: sample.y });
        this.syncSelectionOverlay();
        this.emitSelection();
        return;
      }

      if (this.state.selectionShape === 'pen') {
        this.gesturePointerId = event.pointerId;
        this.selectionPenPoints = [{ x: sample.x, y: sample.y }];
        this.canvas.setPointerCapture?.(event.pointerId);
        return;
      }

      this.selecting = true;
      this.activePointerId = event.pointerId;
      this.selectionStart = { x: sample.x, y: sample.y };
      this.selectionRect = { x: sample.x, y: sample.y, width: 0, height: 0 };
      this.selectedVectorStrokeId = null;
      this.selectedVectorPointIndex = null;
      this.canvas.setPointerCapture?.(event.pointerId);
      this.syncSelectionOverlay();
      this.emitSelection();
      return;
    }

    if (this.state.tool === 'transform') {
      const active = findLayerNode(this.layers, this.layers.activeLayerId);
      if (!this.selectionRect || !isRasterNode(active) || active.kind === 'background') return;
      const surface = this.surfaces.get(active.id);
      const rect = this.integerSelectionRect(this.selectionRect);
      if (!surface || !rect) return;
      const quad = rectToQuad(this.selectionRect);
      const mesh = this.state.transformMode === 'mesh' ? createMeshGrid(this.selectionRect, 3, 3) : null;
      const handle = this.hitTransformHandle(sample, quad, mesh);
      if (!handle) return;
      const source = this.createCanvas(rect.width, rect.height);
      source.getContext('2d')!.drawImage(surface.canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      const sourceMask = this.createSelectionMaskCanvas(rect);
      source.getContext('2d')!.save();
      source.getContext('2d')!.globalCompositeOperation = 'destination-in';
      source.getContext('2d')!.drawImage(sourceMask, 0, 0);
      source.getContext('2d')!.restore();
      event.preventDefault();
      event.stopPropagation();
      this.transforming = true;
      this.activePointerId = event.pointerId;
      const center = quadCenter(quad);
      this.transformSession = {
        original: surface.context.getImageData(0, 0, this.canvas.width, this.canvas.height),
        source,
        sourceMask,
        sourceRect: rect,
        startQuad: quad,
        quad,
        startMesh: mesh ? { ...mesh, points: mesh.points.map((point) => ({ ...point })) } : null,
        mesh,
        pointerStart: { x: sample.x, y: sample.y },
        handle,
        startAngle: Math.atan2(sample.y - center.y, sample.x - center.x)
      };
      this.canvas.setPointerCapture?.(event.pointerId);
      this.syncSelectionOverlay();
      return;
    }

    if (this.state.tool === 'vector') {
      let active = findLayerNode(this.layers, this.layers.activeLayerId);
      if (this.vectorRedrawPending && active.kind === 'vector' && this.selectedVectorStrokeId) {
        const stroke = (this.vectors.get(active.id) ?? []).find((candidate) => candidate.id === this.selectedVectorStrokeId);
        if (stroke) {
          const segment = nearestVectorSegmentIndex(stroke, sample, 32);
          if (segment !== null) {
            event.preventDefault();
            event.stopPropagation();
            this.vectorRedrawStrokeId = stroke.id;
            this.vectorRedrawStartSegment = segment;
            this.vectorRedrawPoints = [{ x: sample.x, y: sample.y }];
            this.gesturePointerId = event.pointerId;
            this.canvas.setPointerCapture?.(event.pointerId);
            return;
          }
        }
        this.vectorRedrawPending = false;
      }
      if (active.kind !== 'vector') {
        this.layers = addVectorLayer(this.layers);
        this.reconcileSurfaces();
        active = findLayerNode(this.layers, this.layers.activeLayerId);
        this.emitLayers();
      }
      if (active.kind !== 'vector' || active.locked || !active.visible) return;
      event.preventDefault();
      event.stopPropagation();
      const starts = this.symmetryPointsFor(sample);
      const created = starts.map((start) => {
        const id = `stroke-${this.vectorStrokeCounter++}`;
        return createVectorStroke(id, start, this.state.color, this.state.brushSize, this.state.opacity);
      });
      this.vectors.set(active.id, [...(this.vectors.get(active.id) ?? []), ...created]);
      this.activeVectorStrokeIds = created.map((stroke) => stroke.id);
      this.activeVectorStrokeId = this.activeVectorStrokeIds[0] ?? null;
      this.selectedVectorStrokeId = this.activeVectorStrokeId;
      this.drawing = true;
      this.activePointerId = event.pointerId;
      this.previousSample = sample;
      this.canvas.setPointerCapture?.(event.pointerId);
      this.markCompositeDirty();
      this.emitSelection();
      return;
    }

    if (this.state.tool === 'fill') {
      if (!this.canFillActiveLayer()) return;
      event.preventDefault();
      event.stopPropagation();
      this.performSmartFill(sample.x, sample.y);
      return;
    }
    if (!['brush', 'eraser', 'smudge', 'blur', 'mix'].includes(this.state.tool)) return;
    if (!this.canDrawActiveLayer()) return;
    event.preventDefault();
    event.stopPropagation();
    this.drawing = true;
    this.strokeDabIndex = 0;
    this.activePointerId = event.pointerId;
    this.canvas.setPointerCapture?.(event.pointerId);
    this.previousSample = sample;
    if (this.state.tool === 'brush' || this.state.tool === 'eraser') {
      this.beginBufferedStroke();
      this.paintSamples([sample]);
    }
    else this.paintPixelTool(sample, null);
  }

  private handleDrawPointerMove(event: PointerEvent): void {
    if (this.state.tool === 'assist' && this.assistDragging && this.activePointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      this.updateAssistDrag(this.toCanvasSample(event));
      return;
    }
    if (this.gesturePointerId === event.pointerId && (this.state.tool === 'gradient' || this.state.tool === 'shape')) {
      event.preventDefault();
      const sample = this.toCanvasSample(event);
      this.gestureEnd = { x: sample.x, y: sample.y };
      return;
    }

    if (this.gesturePointerId === event.pointerId && this.state.tool === 'select' && this.state.selectionShape === 'pen') {
      event.preventDefault();
      const sample = this.toCanvasSample(event);
      const previous = this.selectionPenPoints[this.selectionPenPoints.length - 1];
      if (!previous || Math.hypot(sample.x - previous.x, sample.y - previous.y) >= 1.5) this.selectionPenPoints.push({ x: sample.x, y: sample.y });
      return;
    }

    if (this.gesturePointerId === event.pointerId && this.state.tool === 'vector' && this.vectorRedrawStrokeId) {
      event.preventDefault();
      const sample = this.toCanvasSample(event);
      const previous = this.vectorRedrawPoints[this.vectorRedrawPoints.length - 1];
      if (!previous || Math.hypot(sample.x - previous.x, sample.y - previous.y) >= 2) this.vectorRedrawPoints.push({ x: sample.x, y: sample.y });
      return;
    }

    if (this.gesturePointerId === event.pointerId && this.state.tool === 'lasso') {
      event.preventDefault();
      const sample = this.toCanvasSample(event);
      const previous = this.lassoPoints[this.lassoPoints.length - 1];
      if (!previous || Math.hypot(sample.x - previous.x, sample.y - previous.y) >= 2) this.lassoPoints.push({ x: sample.x, y: sample.y });
      return;
    }
    if (this.vectorHandleEditing && this.activePointerId === event.pointerId) {
      event.preventDefault();
      const active = findLayerNode(this.layers, this.layers.activeLayerId);
      if (active.kind !== 'vector') return;
      const sample = this.toCanvasSample(event);
      const edit = this.vectorHandleEditing;
      const strokes = this.vectors.get(active.id) ?? [];
      this.vectors.set(active.id, strokes.map((stroke) => stroke.id === edit.strokeId ? setVectorHandle(stroke, edit.pointIndex, edit.side, sample) : stroke));
      this.compositeDirty = true;
      this.renderCompositeNow();
      this.emitSelection();
      return;
    }

    if (this.vectorPointEditingIndex !== null && this.vectorPointEditingStrokeId && this.activePointerId === event.pointerId) {
      event.preventDefault();
      const active = findLayerNode(this.layers, this.layers.activeLayerId);
      if (active.kind !== 'vector') return;
      const sample = this.toCanvasSample(event);
      const strokes = this.vectors.get(active.id) ?? [];
      this.vectors.set(active.id, strokes.map((stroke) => stroke.id === this.vectorPointEditingStrokeId ? updateVectorPoint(stroke, this.vectorPointEditingIndex!, sample) : stroke));
      this.compositeDirty = true;
      this.renderCompositeNow();
      this.emitSelection();
      return;
    }

    if (this.selecting && this.activePointerId === event.pointerId && this.selectionStart) {
      event.preventDefault();
      const sample = this.toCanvasSample(event);
      this.selectionRect = clampSelectionRect(normalizeSelectionRect(this.selectionStart, sample), this.canvas.width, this.canvas.height);
      this.syncSelectionOverlay();
      this.emitSelection();
      return;
    }

    if (this.transforming && this.activePointerId === event.pointerId && this.transformSession) {
      event.preventDefault();
      const active = findLayerNode(this.layers, this.layers.activeLayerId);
      if (!isRasterNode(active)) return;
      const surface = this.surfaces.get(active.id);
      if (!surface) return;
      const sample = this.toCanvasSample(event);
      const session = this.transformSession;
      const dx = sample.x - session.pointerStart.x;
      const dy = sample.y - session.pointerStart.y;
      if (session.handle === 'move') {
        session.quad = translateQuad(session.startQuad, dx, dy);
        if (session.startMesh) session.mesh = { ...session.startMesh, points: session.startMesh.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
      } else if (session.handle === 'rotate') {
        const center = quadCenter(session.startQuad);
        const angle = Math.atan2(sample.y - center.y, sample.x - center.x) - session.startAngle;
        session.quad = rotateQuad(session.startQuad, angle, center);
      } else if (typeof session.handle === 'string' && session.handle.startsWith('mesh-') && session.startMesh) {
        const index = Number(session.handle.slice(5));
        session.mesh = moveMeshPoint(session.startMesh, index, sample);
      } else if (this.state.transformMode === 'perspective') {
        session.quad = updatePerspectiveCorner(session.startQuad, session.handle as TransformCorner, sample);
      } else if (this.state.transformMode === 'distort') {
        session.quad = updateDistortCorner(session.startQuad, session.handle as TransformCorner, sample);
      } else {
        session.quad = scaleQuadFromHandle(session.startQuad, session.handle as TransformHandle, sample, event.shiftKey);
      }
      this.previewTransform(surface, session);
      this.selectionRect = session.mesh ? meshBounds(session.mesh) : quadBounds(session.quad);
      this.syncSelectionOverlay();
      this.markCompositeDirty();
      return;
    }

    if (!this.drawing || this.activePointerId !== event.pointerId || !this.previousSample) return;
    event.preventDefault();
    const coalesced = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
    const events = coalesced.length > 0 ? coalesced : [event];
    for (const pointerEvent of events) {
      const rawSample = this.toCanvasSample(pointerEvent);
      const assistedSample = this.applyAssistToSample(rawSample);
      const stabilized = stabilizeSample(this.previousSample, assistedSample, this.state.stabilizer);
      if (this.state.tool === 'vector') {
        const active = findLayerNode(this.layers, this.layers.activeLayerId);
        if (active.kind !== 'vector' || this.activeVectorStrokeIds.length === 0) continue;
        const points = this.symmetryPointsFor(stabilized);
        const strokes = this.vectors.get(active.id) ?? [];
        const pointById = new Map(this.activeVectorStrokeIds.map((id, index) => [id, points[index] ?? stabilized]));
        this.vectors.set(active.id, strokes.map((stroke) => pointById.has(stroke.id) ? appendVectorPoint(stroke, pointById.get(stroke.id)!) : stroke));
        this.markCompositeDirty();
        this.previousSample = stabilized;
        continue;
      }
      const spacing = Math.max(0.6, this.state.brushSize * (this.state.spacing / 100));
      if (this.state.tool === 'brush' || this.state.tool === 'eraser') this.paintSamples(sampleStrokeSegment(this.previousSample, stabilized, spacing));
      else if (this.state.tool === 'smudge' || this.state.tool === 'blur' || this.state.tool === 'mix') this.paintPixelTool(stabilized, this.previousSample);
      this.previousSample = stabilized;
    }
  }

  private handleDrawPointerUp(event: PointerEvent): void {
    if (this.state.tool === 'assist' && this.activePointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      this.assistDragging = null;
      this.activePointerId = null;
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
      return;
    }
    if (this.gesturePointerId === event.pointerId && (this.state.tool === 'gradient' || this.state.tool === 'shape')) {
      event.preventDefault();
      event.stopPropagation();
      const start = this.gestureStart;
      const end = this.gestureEnd ?? (start ? { ...start } : null);
      const tool = this.state.tool;
      this.gesturePointerId = null;
      this.gestureStart = null;
      this.gestureEnd = null;
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
      if (start && end && Math.hypot(end.x - start.x, end.y - start.y) >= 1) {
        if (tool === 'gradient') this.performGradient(start, end);
        else this.performShape(start, end);
      }
      return;
    }

    if (this.gesturePointerId === event.pointerId && this.state.tool === 'select' && this.state.selectionShape === 'pen') {
      event.preventDefault();
      event.stopPropagation();
      const sample = this.toCanvasSample(event);
      this.selectionPenPoints.push({ x: sample.x, y: sample.y });
      const incoming = createSelectionPenMask(this.canvas.width, this.canvas.height, this.selectionPenPoints, this.state.selectionPenSize);
      this.selectionPenPoints = [];
      this.gesturePointerId = null;
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
      this.applyIncomingSelectionMask(incoming);
      return;
    }

    if (this.gesturePointerId === event.pointerId && this.state.tool === 'vector' && this.vectorRedrawStrokeId) {
      event.preventDefault();
      event.stopPropagation();
      const active = findLayerNode(this.layers, this.layers.activeLayerId);
      const sample = this.toCanvasSample(event);
      this.vectorRedrawPoints.push({ x: sample.x, y: sample.y });
      if (active.kind === 'vector') {
        const strokes = this.vectors.get(active.id) ?? [];
        const stroke = strokes.find((candidate) => candidate.id === this.vectorRedrawStrokeId);
        if (stroke && this.vectorRedrawStartSegment !== null) {
          const endSegment = nearestVectorSegmentIndex(stroke, sample, 40) ?? this.vectorRedrawStartSegment;
          const next = redrawVectorSegment(stroke, this.vectorRedrawStartSegment, endSegment + 1, this.vectorRedrawPoints);
          this.vectors.set(active.id, strokes.map((candidate) => candidate.id === stroke.id ? next : candidate));
          this.finishPixelMutation('Redraw vector segment');
        }
      }
      this.vectorRedrawPending = false;
      this.vectorRedrawStrokeId = null;
      this.vectorRedrawStartSegment = null;
      this.vectorRedrawPoints = [];
      this.gesturePointerId = null;
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
      this.emitSelection();
      return;
    }

    if (this.gesturePointerId === event.pointerId && this.state.tool === 'lasso') {
      event.preventDefault();
      event.stopPropagation();
      const sample = this.toCanvasSample(event);
      this.lassoPoints.push({ x: sample.x, y: sample.y });
      const incoming = createLassoMask(this.canvas.width, this.canvas.height, this.lassoPoints);
      this.gesturePointerId = null;
      this.lassoPoints = [];
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
      this.applyIncomingSelectionMask(incoming);
      return;
    }
    if (this.vectorHandleEditing && this.activePointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      this.vectorHandleEditing = null;
      this.activePointerId = null;
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
      this.history.push(this.snapshot());
      this.onHistoryEntry?.('Edit Bezier handle');
      this.emitHistory();
      this.emitSelection();
      return;
    }

    if (this.vectorPointEditingIndex !== null && this.vectorPointEditingStrokeId && this.activePointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      this.vectorPointEditingIndex = null;
      this.vectorPointEditingStrokeId = null;
      this.activePointerId = null;
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
      this.history.push(this.snapshot());
      this.onHistoryEntry?.('Edit vector control point');
      this.emitHistory();
      this.emitSelection();
      return;
    }

    if (this.selecting && this.activePointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      this.selecting = false;
      this.activePointerId = null;
      this.selectionStart = null;
      const completedRect = this.selectionRect && this.selectionRect.width >= 2 && this.selectionRect.height >= 2 ? { ...this.selectionRect } : null;
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
      if (!completedRect) { this.selectionRect = maskBounds(this.selectionMask ?? new Uint8Array(0), this.canvas.width, this.canvas.height); this.syncSelectionOverlay(); this.emitSelection(); return; }
      const incoming = this.state.selectionShape === 'ellipse'
        ? createEllipseMask(this.canvas.width, this.canvas.height, completedRect)
        : rectangleMask(this.canvas.width, this.canvas.height, completedRect);
      this.applyIncomingSelectionMask(incoming);
      return;
    }

    if (this.transforming && this.activePointerId === event.pointerId && this.transformSession) {
      event.preventDefault();
      event.stopPropagation();
      const session = this.transformSession;
      this.selectionMask = this.renderTransformedMask(session);
      this.selectionRect = maskBounds(this.selectionMask, this.canvas.width, this.canvas.height);
      this.transforming = false;
      this.activePointerId = null;
      this.transformSession = null;
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
      this.syncSelectionOverlay();
      this.history.push(this.snapshot());
      this.onHistoryEntry?.(`Transform · ${this.state.transformMode}`);
      this.emitHistory();
      this.emitSelection();
      return;
    }

    if (!this.drawing || this.activePointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const wasVector = this.state.tool === 'vector';
    if (this.state.tool === 'brush' || this.state.tool === 'eraser') this.replayBufferedStroke();
    this.drawing = false;
    this.previousSample = null;
    this.activePointerId = null;
    this.activeVectorStrokeId = null;
    this.activeVectorStrokeIds = [];
    this.assistStrokeOrigin = null;
    if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
    this.history.push(this.snapshot());
    const target = wasVector ? 'Vector stroke' : this.layers.activeTarget === 'mask' ? 'Mask stroke' : this.state.tool === 'eraser' ? 'Eraser stroke' : this.state.tool === 'smudge' ? 'Smudge stroke' : this.state.tool === 'blur' ? 'Blur stroke' : this.state.tool === 'mix' ? 'Wet mix stroke' : 'Brush stroke';
    this.onHistoryEntry?.(target);
    this.emitHistory();
    this.emitSelection();
    this.clearBufferedStroke();
  }

  private handlePanPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || (!this.spacePressed && this.state.tool !== 'pan')) return;
    event.preventDefault();
    this.panning = true;
    this.panPointerId = event.pointerId;
    this.panStartClient = { x: event.clientX, y: event.clientY };
    this.panStartOffset = { ...this.state.pan };
    this.element.classList.add('is-panning');
    this.element.setPointerCapture?.(event.pointerId);
  }

  private handlePanPointerMove(event: PointerEvent): void {
    if (!this.panning || this.panPointerId !== event.pointerId || !this.panStartClient || !this.panStartOffset) return;
    event.preventDefault();
    const x = this.panStartOffset.x + event.clientX - this.panStartClient.x;
    const y = this.panStartOffset.y + event.clientY - this.panStartClient.y;
    this.onPanChange?.(x, y);
  }

  private handlePanPointerUp(event: PointerEvent): void {
    if (!this.panning || this.panPointerId !== event.pointerId) return;
    event.preventDefault();
    this.panning = false;
    this.panPointerId = null;
    this.panStartClient = null;
    this.panStartOffset = null;
    this.element.classList.remove('is-panning');
    if (this.element.hasPointerCapture?.(event.pointerId)) this.element.releasePointerCapture?.(event.pointerId);
  }

  private beginBufferedStroke(): void {
    this.activeStrokeSamples = [];
    this.activeStrokeBefore = null;
    this.activeStrokeBeforeLayerId = null;
    this.activeStrokeBeforeTarget = null;
    if (this.state.taperStart <= 0 && this.state.taperEnd <= 0) return;
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!isRasterNode(active)) return;
    const surface = this.surfaces.get(active.id);
    if (!surface) return;
    const target = this.layers.activeTarget === 'mask' ? 'mask' : 'content';
    const targetContext = target === 'mask' ? surface.maskContext : surface.context;
    if (!targetContext) return;
    this.activeStrokeBefore = targetContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.activeStrokeBeforeLayerId = active.id;
    this.activeStrokeBeforeTarget = target;
  }

  private replayBufferedStroke(): void {
    if (!this.activeStrokeBefore || !this.activeStrokeBeforeLayerId || !this.activeStrokeBeforeTarget || this.activeStrokeSamples.length === 0) return;
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!isRasterNode(active) || active.id !== this.activeStrokeBeforeLayerId) return;
    const surface = this.surfaces.get(active.id);
    if (!surface) return;
    const targetContext = this.activeStrokeBeforeTarget === 'mask' ? surface.maskContext : surface.context;
    if (!targetContext) return;
    targetContext.putImageData(this.activeStrokeBefore, 0, 0);
    const samples = this.activeStrokeSamples.slice();
    this.strokeDabIndex = 0;
    this.previousSample = null;
    this.paintSamples(samples, samples.length, false);
  }

  private clearBufferedStroke(): void {
    this.activeStrokeSamples = [];
    this.activeStrokeBefore = null;
    this.activeStrokeBeforeLayerId = null;
    this.activeStrokeBeforeTarget = null;
  }

  private normalizedCanvasPoint(x: number, y: number): AssistPoint {
    return { x: x * this.canvas.width, y: y * this.canvas.height };
  }

  private curveRulerPoints(): [AssistPoint, AssistPoint, AssistPoint, AssistPoint] {
    return [
      this.normalizedCanvasPoint(0.12, 0.64),
      this.normalizedCanvasPoint(0.34, 0.18),
      this.normalizedCanvasPoint(0.66, 0.82),
      this.normalizedCanvasPoint(0.88, 0.36)
    ];
  }

  private applyAssistToSample(sample: StrokeSample): StrokeSample {
    if (!this.state.assistSnapEnabled || this.state.assistMode === 'none' || this.state.assistMode === 'symmetry') return sample;
    const point: AssistPoint = { x: sample.x, y: sample.y };
    const origin = this.assistStrokeOrigin ?? sample;
    let snapped: AssistPoint = point;
    switch (this.state.assistMode) {
      case 'grid':
        snapped = snapToGrid(point, this.state.gridSize);
        break;
      case 'guide':
        snapped = snapToGuide(point, this.state.guideOrientation, (this.state.guideOrientation === 'vertical' ? this.canvas.width : this.canvas.height) * this.state.guidePosition);
        break;
      case 'straight':
        snapped = projectPointToLine(point, origin, this.state.straightAngle);
        break;
      case 'parallel':
        snapped = projectPointToLine(point, origin, this.state.parallelAngle);
        break;
      case 'curve': {
        const [p0, p1, p2, p3] = this.curveRulerPoints();
        snapped = nearestPointOnCubic(point, p0, p1, p2, p3);
        break;
      }
      case 'radial':
        snapped = snapToRadial(point, this.normalizedCanvasPoint(this.state.radialCenterX, this.state.radialCenterY), this.state.radialRays);
        break;
      case 'concentric':
        snapped = snapToConcentric(point, this.normalizedCanvasPoint(this.state.radialCenterX, this.state.radialCenterY), this.state.concentricSpacing);
        break;
      case 'perspective': {
        const vanishingPoints = this.state.perspectiveVanishingPoints.map((vp) => this.normalizedCanvasPoint(vp.x, vp.y));
        snapped = projectToPerspective(point, origin, vanishingPoints);
        break;
      }
      default:
        break;
    }
    return { ...sample, x: snapped.x, y: snapped.y };
  }

  private symmetryPointsFor(sample: StrokeSample): StrokeSample[] {
    if (this.state.assistMode !== 'symmetry' || !this.state.assistSnapEnabled) return [sample];
    const center = this.normalizedCanvasPoint(this.state.symmetryCenterX, this.state.symmetryCenterY);
    return buildSymmetryPoints(sample, center, this.state.symmetryAxes).map((point) => ({ ...sample, ...point }));
  }

  private renderAssistOverlay(): void {
    const ctx = this.assistOverlayContext;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (this.state.assistMode === 'none') return;
    ctx.save();
    ctx.lineWidth = Math.max(1, 1 / Math.max(0.25, this.state.zoom));
    ctx.strokeStyle = 'rgba(96, 172, 224, 0.72)';
    ctx.fillStyle = 'rgba(240, 248, 255, 0.96)';
    ctx.setLineDash([7, 5]);
    const line = (a: AssistPoint, b: AssistPoint): void => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    const handle = (p: AssistPoint, radius = 6): void => { ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
    const center = this.normalizedCanvasPoint(this.state.radialCenterX, this.state.radialCenterY);
    switch (this.state.assistMode) {
      case 'grid':
        ctx.globalAlpha = 0.42;
        for (let x = 0; x <= w; x += this.state.gridSize) line({ x, y: 0 }, { x, y: h });
        for (let y = 0; y <= h; y += this.state.gridSize) line({ x: 0, y }, { x: w, y });
        break;
      case 'guide': {
        const p = this.state.guidePosition;
        this.state.guideOrientation === 'vertical' ? line({ x: w * p, y: 0 }, { x: w * p, y: h }) : line({ x: 0, y: h * p }, { x: w, y: h * p });
        handle(this.state.guideOrientation === 'vertical' ? { x: w * p, y: h * 0.5 } : { x: w * 0.5, y: h * p });
        break;
      }
      case 'straight':
      case 'parallel': {
        const angle = (this.state.assistMode === 'straight' ? this.state.straightAngle : this.state.parallelAngle) * Math.PI / 180;
        const c = { x: w / 2, y: h / 2 }; const r = Math.hypot(w, h);
        line({ x: c.x - Math.cos(angle) * r, y: c.y - Math.sin(angle) * r }, { x: c.x + Math.cos(angle) * r, y: c.y + Math.sin(angle) * r });
        break;
      }
      case 'curve': {
        const [p0, p1, p2, p3] = this.curveRulerPoints();
        ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y); ctx.stroke();
        break;
      }
      case 'radial': {
        const radius = Math.hypot(w, h);
        for (let i = 0; i < this.state.radialRays; i += 1) { const a = i * Math.PI * 2 / this.state.radialRays; line(center, { x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius }); }
        handle(center); break;
      }
      case 'concentric': {
        ctx.setLineDash([]); const max = Math.hypot(w, h);
        for (let r = this.state.concentricSpacing; r < max; r += this.state.concentricSpacing) { ctx.beginPath(); ctx.arc(center.x, center.y, r, 0, Math.PI * 2); ctx.stroke(); }
        handle(center); break;
      }
      case 'symmetry': {
        const c = this.normalizedCanvasPoint(this.state.symmetryCenterX, this.state.symmetryCenterY); const radius = Math.hypot(w, h);
        for (let i = 0; i < this.state.symmetryAxes; i += 1) { const a = i * Math.PI * 2 / this.state.symmetryAxes; line(c, { x: c.x + Math.cos(a) * radius, y: c.y + Math.sin(a) * radius }); }
        handle(c); break;
      }
      case 'perspective': {
        const horizonY = h * this.state.perspectiveHorizonY;
        line({ x: 0, y: horizonY }, { x: w, y: horizonY });
        const corners = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
        this.state.perspectiveVanishingPoints.forEach((vp) => { const p = this.normalizedCanvasPoint(vp.x, vp.y); corners.forEach((corner) => line(p, corner)); handle(p, 7); });
        handle({ x: 18, y: horizonY }, 5);
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }

  private hitAssistHandle(point: AssistPoint): DrawingCanvas['assistDragging'] {
    const near = (candidate: AssistPoint, radius = 14): boolean => Math.hypot(point.x - candidate.x, point.y - candidate.y) <= radius;
    const w = this.canvas.width, h = this.canvas.height;
    if (this.state.assistMode === 'guide') {
      const p = this.state.guidePosition;
      const candidate = this.state.guideOrientation === 'vertical' ? { x: w * p, y: h * 0.5 } : { x: w * 0.5, y: h * p };
      return near(candidate, 18) ? 'guide' : null;
    }
    if (this.state.assistMode === 'radial' || this.state.assistMode === 'concentric') return near(this.normalizedCanvasPoint(this.state.radialCenterX, this.state.radialCenterY), 18) ? 'radial-center' : null;
    if (this.state.assistMode === 'symmetry') return near(this.normalizedCanvasPoint(this.state.symmetryCenterX, this.state.symmetryCenterY), 18) ? 'symmetry-center' : null;
    if (this.state.assistMode === 'perspective') {
      for (let index = 0; index < this.state.perspectiveVanishingPoints.length; index += 1) if (near(this.normalizedCanvasPoint(this.state.perspectiveVanishingPoints[index]!.x, this.state.perspectiveVanishingPoints[index]!.y), 20)) return { vp: index };
      if (Math.abs(point.y - h * this.state.perspectiveHorizonY) <= 12) return 'perspective-horizon';
    }
    return null;
  }

  private updateAssistDrag(point: AssistPoint): void {
    if (!this.assistDragging) return;
    const nx = Math.max(0, Math.min(1, point.x / this.canvas.width));
    const ny = Math.max(0, Math.min(1, point.y / this.canvas.height));
    if (this.assistDragging === 'guide') this.onAssistChange?.({ type: 'guide-position', value: this.state.guideOrientation === 'vertical' ? nx : ny });
    else if (this.assistDragging === 'radial-center') this.onAssistChange?.({ type: 'radial-center', x: nx, y: ny });
    else if (this.assistDragging === 'symmetry-center') this.onAssistChange?.({ type: 'symmetry-center', x: nx, y: ny });
    else if (this.assistDragging === 'perspective-horizon') this.onAssistChange?.({ type: 'perspective-horizon', value: ny });
    else this.onAssistChange?.({ type: 'perspective-vp', index: this.assistDragging.vp, x: nx, y: ny });
  }

  private paintSamples(samples: StrokeSample[], replayTotal: number | null = null, record = true): void {
    if (this.state.tool !== 'brush' && this.state.tool !== 'eraser') return;
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!isRasterNode(active)) return;
    const surface = this.surfaces.get(active.id);
    if (!surface) return;
    const targetContext = this.layers.activeTarget === 'mask' ? surface.maskContext : surface.context;
    if (!targetContext) return;
    if (record) this.activeStrokeSamples.push(...samples.map((sample) => ({ ...sample })));

    const preset = getBrushPreset(this.state.brushPreset);
    const settings = {
      size: this.state.brushSize,
      opacity: this.state.opacity,
      pressureResponse: this.state.pressureResponse,
      pressureSize: this.state.pressureSize,
      pressureOpacity: this.state.pressureOpacity,
      tiltInfluence: this.state.tiltInfluence,
      hardness: preset.hardness
    };

    let previous = this.previousSample;
    for (const sample of samples) {
      let paintColor = this.state.color;
      if (this.state.tool === 'brush' && this.state.wetMix > 0 && this.layers.activeTarget !== 'mask') {
        const sx=Math.max(0,Math.min(this.canvas.width-1,Math.round(sample.x))), sy=Math.max(0,Math.min(this.canvas.height-1,Math.round(sample.y)));
        const pixel=targetContext.getImageData(sx,sy,1,1).data;
        if ((pixel[3] ?? 0) > 0) {
          const sampled=`#${[pixel[0],pixel[1],pixel[2]].map(v=>(v??0).toString(16).padStart(2,'0')).join('')}`;
          paintColor=mixHexColors(sampled,this.state.color,1-this.state.wetMix*.55);
        }
      }
      let style: DynamicDabStyle = buildDynamicDabStyle(this.state.tool, paintColor, settings, sample);
      const advanced = buildAdvancedDab(style, sample, previous, {
        flow: this.state.flow,
        velocitySize: this.state.velocitySize,
        rotation: this.state.brushRotation,
        taper: this.state.taper,
        taperStart: this.state.taperStart,
        taperEnd: replayTotal === null ? 0 : this.state.taperEnd,
        taperLength: this.state.taperLength,
        scatter: this.state.scatter,
        sizeJitter: this.state.sizeJitter,
        angleJitter: this.state.angleJitter,
        colorJitter: this.state.colorJitter,
        grain: this.state.grain,
        textureStrength: this.state.textureStrength,
        textureScale: this.state.textureScale,
        textureRotation: this.state.textureRotation,
        paperGrain: this.state.paperGrain,
        textureMap: this.state.brushTextureMap,
        dualBrush: this.state.dualBrush
      }, this.strokeDabIndex, replayTotal === null ? Math.min(1, this.strokeDabIndex / 48) : strokeProgress(this.strokeDabIndex, replayTotal));
      this.strokeDabIndex += 1;
      style = advanced.style;
      if (this.layers.activeTarget === 'mask') {
        style = { ...style, compositeOperation: 'source-over', fillStyle: this.state.tool === 'eraser' ? '#FFFFFF' : this.maskColor(this.state.color) };
      } else if (active.alphaLock && this.state.tool === 'brush') {
        style = { ...style, compositeOperation: 'source-atop' };
      }
      const dabPoints = this.symmetryPointsFor({ ...sample, x: advanced.x, y: advanced.y });
      for (const dab of dabPoints) {
        drawDynamicDab(targetContext, dab.x, dab.y, style);
        if (this.state.tool === 'brush' && this.state.dualBrush > 0 && this.layers.activeTarget !== 'mask') {
          const offset=Math.max(1,style.radiusX*.28*this.state.dualBrush);
          drawDynamicDab(targetContext, dab.x+Math.cos(style.rotation+Math.PI/2)*offset, dab.y+Math.sin(style.rotation+Math.PI/2)*offset, { ...style, radiusX:style.radiusX*(.45+.25*this.state.dualBrush), radiusY:style.radiusY*(.45+.25*this.state.dualBrush), globalAlpha:style.globalAlpha*.55*this.state.dualBrush });
        }
      }
      previous = sample;
    }
    this.markCompositeDirty();
  }

  private paintPixelTool(sample: StrokeSample, previous: StrokeSample | null): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (!isRasterNode(active) || active.kind === 'background' || this.layers.activeTarget === 'mask') return;
    const surface = this.surfaces.get(active.id); if (!surface) return;
    const radius = Math.max(1, Math.round(this.state.brushSize / 2));
    const strength = Math.max(0.02, Math.min(1, this.state.opacity));
    if (this.state.tool === 'blur') {
      const pad=radius+2, x0=Math.max(0,Math.floor(sample.x-pad)), y0=Math.max(0,Math.floor(sample.y-pad));
      const w=Math.min(this.canvas.width-x0,pad*2+1), h=Math.min(this.canvas.height-y0,pad*2+1);
      const image=surface.context.getImageData(x0,y0,w,h);
      image.data.set(blurPixels(image.data,w,h,sample.x-x0,sample.y-y0,radius,strength));
      surface.context.putImageData(image,x0,y0);
    } else if (this.state.tool === 'smudge' && previous) {
      const minX=Math.min(previous.x,sample.x)-radius-2, minY=Math.min(previous.y,sample.y)-radius-2;
      const maxX=Math.max(previous.x,sample.x)+radius+2, maxY=Math.max(previous.y,sample.y)+radius+2;
      const x0=Math.max(0,Math.floor(minX)), y0=Math.max(0,Math.floor(minY));
      const w=Math.min(this.canvas.width-x0,Math.ceil(maxX)-x0), h=Math.min(this.canvas.height-y0,Math.ceil(maxY)-y0);
      if(w>0&&h>0){ const image=surface.context.getImageData(x0,y0,w,h); image.data.set(smudgePixels(image.data,w,h,{x:previous.x-x0,y:previous.y-y0},{x:sample.x-x0,y:sample.y-y0},radius,strength)); surface.context.putImageData(image,x0,y0); }
    } else if (this.state.tool === 'mix') {
      const x=Math.max(0,Math.min(this.canvas.width-1,Math.round(sample.x))), y=Math.max(0,Math.min(this.canvas.height-1,Math.round(sample.y)));
      const pixel=surface.context.getImageData(x,y,1,1).data;
      const sampled=`#${[pixel[0],pixel[1],pixel[2]].map(v=>(v??0).toString(16).padStart(2,'0')).join('')}`;
      const mixed=mixHexColors(sampled,this.state.color,Math.max(.08,1-this.state.wetMix*.65));
      let style=buildDynamicDabStyle('brush',mixed,{size:this.state.brushSize,opacity:this.state.opacity,pressureResponse:this.state.pressureResponse,pressureSize:this.state.pressureSize,pressureOpacity:this.state.pressureOpacity,tiltInfluence:this.state.tiltInfluence,hardness:getBrushPreset(this.state.brushPreset).hardness},sample);
      style={...style,globalAlpha:Math.min(1,style.globalAlpha*Math.max(.2,this.state.flow))}; drawDynamicDab(surface.context,sample.x,sample.y,style);
    }
    this.markCompositeDirty();
  }

  private createSelectionMaskCanvas(rect: { x: number; y: number; width: number; height: number }): HTMLCanvasElement {
    const canvas = this.createCanvas(rect.width, rect.height);
    const context = canvas.getContext('2d', { alpha: true })!;
    const image = context.createImageData(rect.width, rect.height);
    for (let y = 0; y < rect.height; y += 1) {
      for (let x = 0; x < rect.width; x += 1) {
        const sourceX = rect.x + x;
        const sourceY = rect.y + y;
        const alpha = this.selectionMask ? this.selectionMask[sourceY * this.canvas.width + sourceX] ?? 0 : 255;
        const offset = (y * rect.width + x) * 4;
        image.data[offset] = 255;
        image.data[offset + 1] = 255;
        image.data[offset + 2] = 255;
        image.data[offset + 3] = alpha;
      }
    }
    context.putImageData(image, 0, 0);
    return canvas;
  }

  private hitTransformHandle(point: Point, quad: TransformQuad, mesh: TransformMesh | null): TransformSession['handle'] | null {
    const near = (candidate: Point, radius = 13): boolean => Math.hypot(point.x - candidate.x, point.y - candidate.y) <= radius;
    if (this.state.transformMode === 'mesh' && mesh) {
      for (let index = 0; index < mesh.points.length; index += 1) if (near(mesh.points[index]!, 14)) return `mesh-${index}`;
      return rectContainsPoint(meshBounds(mesh), point) ? 'move' : null;
    }
    const corners: Array<[TransformCorner, Point]> = [['tl', quad.tl], ['tr', quad.tr], ['br', quad.br], ['bl', quad.bl]];
    for (const [name, candidate] of corners) if (near(candidate)) return name;
    if (this.state.transformMode === 'perspective' || this.state.transformMode === 'distort') return rectContainsPoint(quadBounds(quad), point) ? 'move' : null;
    const mids: Array<[TransformHandle, Point]> = [
      ['n', { x: (quad.tl.x + quad.tr.x) / 2, y: (quad.tl.y + quad.tr.y) / 2 }],
      ['e', { x: (quad.tr.x + quad.br.x) / 2, y: (quad.tr.y + quad.br.y) / 2 }],
      ['s', { x: (quad.bl.x + quad.br.x) / 2, y: (quad.bl.y + quad.br.y) / 2 }],
      ['w', { x: (quad.tl.x + quad.bl.x) / 2, y: (quad.tl.y + quad.bl.y) / 2 }]
    ];
    for (const [name, candidate] of mids) if (near(candidate)) return name;
    const center = quadCenter(quad);
    const top = mids[0]![1];
    const vx = top.x - center.x;
    const vy = top.y - center.y;
    const length = Math.max(1, Math.hypot(vx, vy));
    const rotate = { x: top.x + vx / length * 28, y: top.y + vy / length * 28 };
    if (near(rotate, 14)) return 'rotate';
    return rectContainsPoint(quadBounds(quad), point) ? 'move' : null;
  }

  private drawTriangleWarp(context: CanvasRenderingContext2D, source: HTMLCanvasElement, src: readonly [Point, Point, Point], dst: readonly [Point, Point, Point]): void {
    const matrix = affineFromTriangles(src, dst);
    context.save();
    context.beginPath();
    context.moveTo(dst[0].x, dst[0].y);
    context.lineTo(dst[1].x, dst[1].y);
    context.lineTo(dst[2].x, dst[2].y);
    context.closePath();
    context.clip();
    context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    context.drawImage(source, 0, 0);
    context.restore();
  }

  private drawCanvasToQuad(context: CanvasRenderingContext2D, source: HTMLCanvasElement, quad: TransformQuad, divisions = 8): void {
    const cols = Math.max(2, divisions);
    const rows = Math.max(2, divisions);
    for (let row = 0; row < rows; row += 1) {
      const v0 = row / rows;
      const v1 = (row + 1) / rows;
      for (let col = 0; col < cols; col += 1) {
        const u0 = col / cols;
        const u1 = (col + 1) / cols;
        const s00 = { x: source.width * u0, y: source.height * v0 };
        const s10 = { x: source.width * u1, y: source.height * v0 };
        const s11 = { x: source.width * u1, y: source.height * v1 };
        const s01 = { x: source.width * u0, y: source.height * v1 };
        const d00 = bilinearQuadPoint(quad, u0, v0);
        const d10 = bilinearQuadPoint(quad, u1, v0);
        const d11 = bilinearQuadPoint(quad, u1, v1);
        const d01 = bilinearQuadPoint(quad, u0, v1);
        this.drawTriangleWarp(context, source, [s00, s10, s11], [d00, d10, d11]);
        this.drawTriangleWarp(context, source, [s00, s11, s01], [d00, d11, d01]);
      }
    }
  }

  private drawCanvasToMesh(context: CanvasRenderingContext2D, source: HTMLCanvasElement, mesh: TransformMesh): void {
    for (let row = 0; row < mesh.rows - 1; row += 1) {
      for (let col = 0; col < mesh.columns - 1; col += 1) {
        const i00 = row * mesh.columns + col;
        const i10 = i00 + 1;
        const i01 = (row + 1) * mesh.columns + col;
        const i11 = i01 + 1;
        const u0 = col / (mesh.columns - 1);
        const u1 = (col + 1) / (mesh.columns - 1);
        const v0 = row / (mesh.rows - 1);
        const v1 = (row + 1) / (mesh.rows - 1);
        const s00 = { x: source.width * u0, y: source.height * v0 };
        const s10 = { x: source.width * u1, y: source.height * v0 };
        const s11 = { x: source.width * u1, y: source.height * v1 };
        const s01 = { x: source.width * u0, y: source.height * v1 };
        this.drawTriangleWarp(context, source, [s00, s10, s11], [mesh.points[i00]!, mesh.points[i10]!, mesh.points[i11]!]);
        this.drawTriangleWarp(context, source, [s00, s11, s01], [mesh.points[i00]!, mesh.points[i11]!, mesh.points[i01]!]);
      }
    }
  }

  private clearTransformSource(context: CanvasRenderingContext2D, session: TransformSession): void {
    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.drawImage(session.sourceMask, session.sourceRect.x, session.sourceRect.y);
    context.restore();
  }

  private previewTransform(surface: LayerSurface, session: TransformSession): void {
    surface.context.putImageData(session.original, 0, 0);
    this.clearTransformSource(surface.context, session);
    if (session.mesh) this.drawCanvasToMesh(surface.context, session.source, session.mesh);
    else this.drawCanvasToQuad(surface.context, session.source, session.quad);
  }

  private renderTransformedMask(session: TransformSession): Uint8Array {
    const canvas = this.createCanvas(this.canvas.width, this.canvas.height);
    const context = canvas.getContext('2d', { alpha: true })!;
    if (session.mesh) this.drawCanvasToMesh(context, session.sourceMask, session.mesh);
    else this.drawCanvasToQuad(context, session.sourceMask, session.quad);
    const image = context.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    const mask = new Uint8Array(this.canvas.width * this.canvas.height);
    for (let index = 0; index < mask.length; index += 1) mask[index] = image[index * 4 + 3] ?? 0;
    return mask;
  }

  private integerSelectionRect(rect: SelectionRect): { x: number; y: number; width: number; height: number } | null {
    const x = Math.max(0, Math.floor(rect.x));
    const y = Math.max(0, Math.floor(rect.y));
    const right = Math.min(this.canvas.width, Math.ceil(rect.x + rect.width));
    const bottom = Math.min(this.canvas.height, Math.ceil(rect.y + rect.height));
    const width = Math.max(0, right - x);
    const height = Math.max(0, bottom - y);
    return width > 0 && height > 0 ? { x, y, width, height } : null;
  }

  private syncSelectionOverlay(): void {
    const context = this.selectionMaskOverlayContext;
    context.clearRect(0, 0, this.selectionMaskOverlay.width, this.selectionMaskOverlay.height);
    this.selectionOverlay.hidden = true;

    if (this.selectionMask) {
      const image = context.createImageData(this.canvas.width, this.canvas.height);
      const width = this.canvas.width;
      const height = this.canvas.height;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = y * width + x;
          const value = this.selectionMask[index] ?? 0;
          if (value < 12) continue;
          const left = x > 0 ? this.selectionMask[index - 1] ?? 0 : 0;
          const right = x + 1 < width ? this.selectionMask[index + 1] ?? 0 : 0;
          const top = y > 0 ? this.selectionMask[index - width] ?? 0 : 0;
          const bottom = y + 1 < height ? this.selectionMask[index + width] ?? 0 : 0;
          if (left >= 12 && right >= 12 && top >= 12 && bottom >= 12) continue;
          const offset = index * 4;
          const phase = ((x + y) >> 2) & 1;
          image.data[offset] = phase ? 245 : 35;
          image.data[offset + 1] = phase ? 248 : 116;
          image.data[offset + 2] = phase ? 250 : 170;
          image.data[offset + 3] = 235;
        }
      }
      context.putImageData(image, 0, 0);
    }

    if (this.polygonPoints.length > 0) {
      context.save();
      context.strokeStyle = 'rgba(117, 184, 228, .95)';
      context.fillStyle = '#f4f8fb';
      context.lineWidth = 2;
      context.setLineDash([6, 4]);
      context.beginPath();
      context.moveTo(this.polygonPoints[0]!.x, this.polygonPoints[0]!.y);
      for (let index = 1; index < this.polygonPoints.length; index += 1) context.lineTo(this.polygonPoints[index]!.x, this.polygonPoints[index]!.y);
      context.stroke();
      context.setLineDash([]);
      for (const point of this.polygonPoints) { context.beginPath(); context.arc(point.x, point.y, 4, 0, Math.PI * 2); context.fill(); context.stroke(); }
      context.restore();
    }

    if (this.state.tool === 'transform' && this.selectionRect) {
      const quad = this.transformSession?.quad ?? rectToQuad(this.selectionRect);
      const mesh = this.transformSession?.mesh ?? (this.state.transformMode === 'mesh' ? createMeshGrid(this.selectionRect, 3, 3) : null);
      context.save();
      context.strokeStyle = 'rgba(106, 178, 226, .98)';
      context.fillStyle = '#f5f8fa';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(quad.tl.x, quad.tl.y); context.lineTo(quad.tr.x, quad.tr.y); context.lineTo(quad.br.x, quad.br.y); context.lineTo(quad.bl.x, quad.bl.y); context.closePath(); context.stroke();
      if (mesh) {
        for (let row = 0; row < mesh.rows; row += 1) { context.beginPath(); for (let col = 0; col < mesh.columns; col += 1) { const point = mesh.points[row * mesh.columns + col]!; if (col === 0) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y); } context.stroke(); }
        for (let col = 0; col < mesh.columns; col += 1) { context.beginPath(); for (let row = 0; row < mesh.rows; row += 1) { const point = mesh.points[row * mesh.columns + col]!; if (row === 0) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y); } context.stroke(); }
        for (const point of mesh.points) { context.beginPath(); context.arc(point.x, point.y, 5, 0, Math.PI * 2); context.fill(); context.stroke(); }
      } else {
        const points = [quad.tl, quad.tr, quad.br, quad.bl];
        for (const point of points) { context.fillRect(point.x - 5, point.y - 5, 10, 10); context.strokeRect(point.x - 5, point.y - 5, 10, 10); }
        if (this.state.transformMode === 'free') {
          const center = quadCenter(quad);
          const top = { x: (quad.tl.x + quad.tr.x) / 2, y: (quad.tl.y + quad.tr.y) / 2 };
          const dx = top.x - center.x; const dy = top.y - center.y; const length = Math.max(1, Math.hypot(dx, dy));
          const rotate = { x: top.x + dx / length * 28, y: top.y + dy / length * 28 };
          context.beginPath(); context.moveTo(top.x, top.y); context.lineTo(rotate.x, rotate.y); context.stroke(); context.beginPath(); context.arc(rotate.x, rotate.y, 6, 0, Math.PI * 2); context.fill(); context.stroke();
        }
      }
      context.restore();
    }
  }

  private applyIncomingSelectionMask(incoming: Uint8Array): void {
    let next = incoming;
    if (this.state.selectionFeather > 0) next = featherSelectionMask(next, this.canvas.width, this.canvas.height, this.state.selectionFeather);
    this.selectionMask = combineSelectionMasks(this.selectionMask, next, this.state.selectionMode);
    this.selectionRect = maskBounds(this.selectionMask, this.canvas.width, this.canvas.height);
    this.selectedVectorStrokeId = null;
    this.selectedVectorPointIndex = null;
    this.syncSelectionOverlay();
    this.emitSelection();
  }

  private finishPixelMutation(label: string): void {
    this.markCompositeDirty();
    this.renderCompositeNow();
    this.history.push(this.snapshot());
    this.onHistoryEntry?.(label);
    this.emitHistory();
  }

  private updateSelectedVectorStroke(patch: Partial<Pick<VectorStroke, 'color' | 'size' | 'opacity'>>, label: string): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (active.kind !== 'vector' || !this.selectedVectorStrokeId) return;
    const strokes = this.vectors.get(active.id) ?? [];
    let changed = false;
    const next = strokes.map((stroke) => {
      if (stroke.id !== this.selectedVectorStrokeId) return stroke;
      changed = true;
      return updateVectorStroke(stroke, patch);
    });
    if (!changed) return;
    this.vectors.set(active.id, next);
    this.finishPixelMutation(label);
    this.emitSelection();
  }

  private emitSelection(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (active.kind === 'selection' && this.selectionMask) this.selectionLayers.set(active.id, this.selectionMask.slice());
    const selectedVectorStroke = active.kind === 'vector' && this.selectedVectorStrokeId
      ? (this.vectors.get(active.id) ?? []).find((stroke) => stroke.id === this.selectedVectorStrokeId) ?? null
      : null;
    this.onSelectionChange?.({
      rect: this.selectionRect ? { ...this.selectionRect } : null,
      activeLayerKind: active.kind,
      selectedVectorStroke,
      selectedVectorPointIndex: this.selectedVectorPointIndex,
      polygonOpen: this.polygonPoints.length > 0,
      editableLayer: isEditableLayerNode(active) ? cloneEditableLayerData(active) : null,
      editableLayerLocked: isEditableLayerNode(active) && active.locked
    });
  }

  private maskColor(hex: string): string {
    const value = hex.replace('#', '');
    const r = Number.parseInt(value.slice(0, 2), 16);
    const g = Number.parseInt(value.slice(2, 4), 16);
    const b = Number.parseInt(value.slice(4, 6), 16);
    const luminance = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    return `rgb(${luminance}, ${luminance}, ${luminance})`;
  }

  private prepareRaster(node: RasterLayerNode): HTMLCanvasElement {
    const surface = this.surfaces.get(node.id);
    const prepared = this.createCanvas(this.canvas.width, this.canvas.height);
    const context = prepared.getContext('2d', { alpha: true })!;
    if (!surface) return prepared;
    context.drawImage(surface.canvas, 0, 0);
    if (node.hasMask && surface.maskCanvas) {
      context.globalCompositeOperation = 'destination-in';
      context.drawImage(surface.maskCanvas, 0, 0);
      context.globalCompositeOperation = 'source-over';
    }
    return prepared;
  }

  private renderSiblingSet(parentId: string | null, output: CanvasRenderingContext2D, skipId: string | null = null, exportMode = false): void {
    let baseForClipping: HTMLCanvasElement | null = null;
    for (const node of getChildren(this.layers, parentId)) {
      if (!node.visible || node.id === skipId || (exportMode && !isLayerExportable(node))) continue;
      if (node.kind === 'group') {
        const groupCanvas = this.createCanvas(this.canvas.width, this.canvas.height);
        const groupContext = groupCanvas.getContext('2d', { alpha: true })!;
        this.renderSiblingSet(node.id, groupContext, skipId, exportMode);
        output.save();
        output.globalAlpha = node.opacity;
        output.globalCompositeOperation = blendModeToCompositeOperation(node.blendMode);
        output.drawImage(groupCanvas, 0, 0);
        output.restore();
        baseForClipping = groupCanvas;
        continue;
      }

      if (node.kind === 'vector') {
        const vectorCanvas = this.createCanvas(this.canvas.width, this.canvas.height);
        const vectorContext = vectorCanvas.getContext('2d', { alpha: true })!;
        renderVectorStrokes(vectorContext, this.vectors.get(node.id) ?? []);
        output.save();
        output.globalAlpha = node.opacity;
        output.globalCompositeOperation = blendModeToCompositeOperation(node.blendMode);
        output.drawImage(vectorCanvas, 0, 0);
        output.restore();
        baseForClipping = vectorCanvas;
        continue;
      }

      if (node.kind === 'selection') continue;

      if (node.kind === 'fill' || node.kind === 'gradient') {
        const generated = this.createCanvas(this.canvas.width, this.canvas.height);
        const generatedContext = generated.getContext('2d', { alpha: true })!;
        if (node.kind === 'fill') {
          generatedContext.fillStyle = node.color;
        } else if (node.radial) {
          const radius = Math.hypot(this.canvas.width, this.canvas.height) / 2;
          const gradient = generatedContext.createRadialGradient(this.canvas.width / 2, this.canvas.height / 2, 0, this.canvas.width / 2, this.canvas.height / 2, radius);
          gradient.addColorStop(0, node.startColor); gradient.addColorStop(1, node.endColor); generatedContext.fillStyle = gradient;
        } else {
          const angle = node.angle * Math.PI / 180; const cx = this.canvas.width / 2; const cy = this.canvas.height / 2; const radius = Math.hypot(this.canvas.width, this.canvas.height) / 2;
          const dx = Math.cos(angle) * radius; const dy = Math.sin(angle) * radius;
          const gradient = generatedContext.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy); gradient.addColorStop(0, node.startColor); gradient.addColorStop(1, node.endColor); generatedContext.fillStyle = gradient;
        }
        generatedContext.fillRect(0, 0, generated.width, generated.height);
        output.save(); output.globalAlpha = node.opacity; output.globalCompositeOperation = blendModeToCompositeOperation(node.blendMode); output.drawImage(generated, 0, 0); output.restore(); baseForClipping = generated; continue;
      }

      if (node.kind === 'correction') {
        this.applyCorrectionLayer(output, node);
        continue;
      }

      if (isEditableLayerNode(node)) {
        const generated = this.editableRenderer.render(node, this.canvas.width, this.canvas.height);
        output.save(); output.globalAlpha = node.opacity; output.globalCompositeOperation = blendModeToCompositeOperation(node.blendMode);
        output.drawImage(generated, 0, 0); output.restore(); baseForClipping = generated; continue;
      }

      let prepared = this.prepareRaster(node);
      if (node.clipping && baseForClipping) {
        const clipped = this.createCanvas(this.canvas.width, this.canvas.height);
        const clippedContext = clipped.getContext('2d', { alpha: true })!;
        clippedContext.drawImage(prepared, 0, 0);
        clippedContext.globalCompositeOperation = 'destination-in';
        clippedContext.drawImage(baseForClipping, 0, 0);
        clippedContext.globalCompositeOperation = 'source-over';
        prepared = clipped;
      }

      output.save();
      output.globalAlpha = node.opacity;
      output.globalCompositeOperation = blendModeToCompositeOperation(node.blendMode);
      output.drawImage(prepared, 0, 0);
      output.restore();
      if (!node.clipping) baseForClipping = prepared;
    }
  }

  private applyCorrectionLayer(output: CanvasRenderingContext2D, node: Extract<LayerNode, { kind: 'correction' }>): void {
    const image = output.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = image.data; const mix = Math.max(0, Math.min(1, node.opacity));
    const hueShift = node.hue / 360; const saturationScale = 1 + node.saturation / 100;
    const contrastValue = Math.max(-255, Math.min(255, node.contrast * 2.55));
    const contrastFactor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
    const brightness = node.brightness * 2.55;
    const rgbToHsl = (r:number,g:number,b:number):[number,number,number] => { r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;let h=0,s=0;const delta=max-min;if(delta!==0){s=delta/(1-Math.abs(2*l-1));if(max===r)h=((g-b)/delta)%6;else if(max===g)h=(b-r)/delta+2;else h=(r-g)/delta+4;h/=6;if(h<0)h+=1;}return[h,s,l];};
    const hslToRgb = (h:number,s:number,l:number):[number,number,number] => { const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h*6)%2-1)),m=l-c/2;let rr=0,gg=0,bb=0;const sector=Math.floor((h%1+1)%1*6);if(sector===0)[rr,gg,bb]=[c,x,0];else if(sector===1)[rr,gg,bb]=[x,c,0];else if(sector===2)[rr,gg,bb]=[0,c,x];else if(sector===3)[rr,gg,bb]=[0,x,c];else if(sector===4)[rr,gg,bb]=[x,0,c];else [rr,gg,bb]=[c,0,x];return[(rr+m)*255,(gg+m)*255,(bb+m)*255];};
    for (let i=0;i<data.length;i+=4) {
      const or=data[i]??0, og=data[i+1]??0, ob=data[i+2]??0; let nr=or,ng=og,nb=ob;
      if (node.correctionType === 'brightness-contrast') { nr=contrastFactor*(or-128)+128+brightness; ng=contrastFactor*(og-128)+128+brightness; nb=contrastFactor*(ob-128)+128+brightness; }
      else { const [h,s,l]=rgbToHsl(or,og,ob); [nr,ng,nb]=hslToRgb((h+hueShift+1)%1,Math.max(0,Math.min(1,s*saturationScale)),l); }
      data[i]=Math.round(or+(Math.max(0,Math.min(255,nr))-or)*mix); data[i+1]=Math.round(og+(Math.max(0,Math.min(255,ng))-og)*mix); data[i+2]=Math.round(ob+(Math.max(0,Math.min(255,nb))-ob)*mix);
    }
    output.putImageData(image,0,0);
  }

  private markCompositeDirty(): void {
    this.compositeDirty = true;
    if (this.compositeFrame !== null) return;
    const render = (): void => {
      this.compositeFrame = null;
      this.renderCompositeNow();
    };
    if (typeof requestAnimationFrame === 'function') this.compositeFrame = requestAnimationFrame(render);
    else render();
  }

  private renderCompositeNow(): void {
    if (!this.compositeDirty) return;
    this.compositeCacheContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.editableRenderer.evictUnusedMaterials(this.layers.nodes.filter(isEditableLayerNode));
    this.renderSiblingSet(null, this.compositeCacheContext);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.drawImage(this.compositeCache, 0, 0);
    this.renderSelectedVectorStroke();
    this.compositeDirty = false;
  }

  private renderSelectedVectorStroke(): void {
    const active = findLayerNode(this.layers, this.layers.activeLayerId);
    if (active.kind !== 'vector' || !this.selectedVectorStrokeId) return;
    const stroke = (this.vectors.get(active.id) ?? []).find((candidate) => candidate.id === this.selectedVectorStrokeId);
    if (!stroke || stroke.points.length === 0) return;
    this.context.save();
    this.context.strokeStyle = 'rgba(119, 183, 230, .95)';
    this.context.lineWidth = Math.max(2, stroke.size + 3);
    this.context.setLineDash([7, 5]);
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    this.context.beginPath();
    this.context.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
    for (let index = 1; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1]!;
      const point = stroke.points[index]!;
      if (previous.outHandle || point.inHandle) {
        const c1 = previous.outHandle ?? previous;
        const c2 = point.inHandle ?? point;
        this.context.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, point.x, point.y);
      } else this.context.lineTo(point.x, point.y);
    }
    this.context.stroke();
    this.context.setLineDash([]);

    stroke.points.forEach((point, index) => {
      const selected = this.selectedVectorPointIndex === index;
      if (point.inHandle) {
        this.context.strokeStyle = 'rgba(116, 160, 192, .8)';
        this.context.beginPath(); this.context.moveTo(point.x, point.y); this.context.lineTo(point.inHandle.x, point.inHandle.y); this.context.stroke();
        this.context.fillStyle = '#d6edf9'; this.context.beginPath(); this.context.arc(point.inHandle.x, point.inHandle.y, 3.5, 0, Math.PI * 2); this.context.fill();
      }
      if (point.outHandle) {
        this.context.strokeStyle = 'rgba(116, 160, 192, .8)';
        this.context.beginPath(); this.context.moveTo(point.x, point.y); this.context.lineTo(point.outHandle.x, point.outHandle.y); this.context.stroke();
        this.context.fillStyle = '#d6edf9'; this.context.beginPath(); this.context.arc(point.outHandle.x, point.outHandle.y, 3.5, 0, Math.PI * 2); this.context.fill();
      }
      this.context.fillStyle = selected ? '#79bce8' : '#e9f4fb';
      this.context.strokeStyle = '#31526b';
      this.context.lineWidth = selected ? 2.5 : 1.5;
      this.context.beginPath(); this.context.arc(point.x, point.y, selected ? 6 : 4.5, 0, Math.PI * 2); this.context.fill(); this.context.stroke();
    });
    this.context.restore();
  }

  private toCanvasSample(event: PointerEvent): StrokeSample {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const dynamics = normalizePointerDynamics(event.pointerType, event.pressure, event.tiltX, event.tiltY);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
      ...dynamics
    };
  }

  private commitLayerState(next: LayerDocumentState, label = 'Layer change'): void {
    if (next === this.layers) return;
    this.layers = next;
    this.reconcileSurfaces();
    this.finishDocumentMutation(label);
  }

  private finishDocumentMutation(label = 'Document change'): void {
    this.canvas.dataset.layerTarget = this.layers.activeTarget;
    this.markCompositeDirty();
    this.renderCompositeNow();
    this.history.push(this.snapshot());
    this.onHistoryEntry?.(label);
    this.emitHistory();
    this.emitLayers();
  }

  private snapshot(): DocumentSnapshot {
    return {
      state: cloneLayerState(this.layers),
      surfaces: [...this.surfaces.entries()].map(([id, surface]) => ({
        id,
        content: surface.context.getImageData(0, 0, this.canvas.width, this.canvas.height),
        mask: surface.maskContext ? surface.maskContext.getImageData(0, 0, this.canvas.width, this.canvas.height) : null
      })),
      vectors: [...this.vectors.entries()].map(([id, strokes]) => ({
        id,
        strokes: strokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point, ...(point.inHandle ? { inHandle: { ...point.inHandle } } : {}), ...(point.outHandle ? { outHandle: { ...point.outHandle } } : {}) })) }))
      })),
      selectionLayers: [...this.selectionLayers.entries()].map(([id, mask]) => ({ id, mask: mask.slice() }))
    };
  }

  private restore(snapshot: DocumentSnapshot): void {
    this.layers = cloneLayerState(snapshot.state);
    this.surfaces.clear();
    this.vectors.clear();
    this.selectionLayers.clear();
    this.reconcileSurfaces();
    for (const item of snapshot.surfaces) {
      const surface = this.surfaces.get(item.id);
      if (!surface) continue;
      surface.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      surface.context.putImageData(item.content, 0, 0);
      if (item.mask) {
        this.ensureMask(surface);
        surface.maskContext!.putImageData(item.mask, 0, 0);
      }
    }
    for (const item of snapshot.vectors ?? []) { this.vectors.set(item.id, item.strokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point, ...(point.inHandle ? { inHandle: { ...point.inHandle } } : {}), ...(point.outHandle ? { outHandle: { ...point.outHandle } } : {}) })) }))); }
    for (const item of snapshot.selectionLayers ?? []) this.selectionLayers.set(item.id, item.mask.slice());
    this.canvas.dataset.layerTarget = this.layers.activeTarget;
    this.compositeDirty = true;
    this.renderCompositeNow();
    this.emitLayers();
  }

  private emitHistory(): void {
    this.onHistoryChange?.(this.canUndo, this.canRedo);
  }

  private emitLayers(): void {
    this.onLayersChange?.(this.layerState);
  }
}
