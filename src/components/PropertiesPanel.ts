import type { DrawingSelectionInfo } from './DrawingCanvas.js';
import type { AssistMode } from '../drawing/assist.js';
import type { EditableLayerPatch } from '../drawing/editableLayers.js';
import { EditableLayerProperties } from './EditableLayerProperties.js';
import type {
  EditorState,
  GradientMode,
  SelectionMode,
  SelectionShape,
  ShapeType,
  TransformMode
} from '../editor/types.js';

export interface PropertiesPanelCallbacks {
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSelectionShape: (value: SelectionShape) => void;
  onSelectionMode: (value: SelectionMode) => void;
  onSelectionFeather: (value: number) => void;
  onSelectionPenSize: (value: number) => void;
  onSelectionExpand: () => void;
  onSelectionContract: () => void;
  onSelectionInvert: () => void;
  onSelectionFeatherApply: () => void;
  onFinishPolygon: () => void;
  onTransformMode: (value: TransformMode) => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate90: () => void;
  onScale: (factor: number) => void;
  onVectorWidth: (value: number) => void;
  onVectorRecolor: () => void;
  onVectorDelete: () => void;
  onVectorRasterize: () => void;
  onVectorAddPoint: () => void;
  onVectorDeletePoint: () => void;
  onVectorHandles: () => void;
  onVectorSimplify: () => void;
  onVectorConnect: () => void;
  onVectorRedraw: () => void;
  onGradientMode: (value: GradientMode) => void;
  onSecondaryColor: (value: string) => void;
  onShapeType: (value: ShapeType) => void;
  onShapeFill: (value: boolean) => void;
  onMagicWandTolerance: (value: number) => void;
  onTextValue: (value: string) => void;
  onTextSize: (value: number) => void;
  onTextFont: (value: string) => void;
  onAssistMode: (value: AssistMode) => void;
  onAssistSnap: (value: boolean) => void;
  onEditablePatch: (patch: EditableLayerPatch) => void;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function selectionModeMarkup(state: EditorState): string {
  const modes: Array<[SelectionMode, string]> = [['replace', 'New'], ['add', 'Add'], ['subtract', 'Subtract'], ['intersect', 'Intersect']];
  return `<div class="segmented-control property-segments selection-mode-row">${modes.map(([value, label]) => `<button data-selection-mode="${value}" class="${state.selectionMode === value ? 'active' : ''}">${label}</button>`).join('')}</div>`;
}

function selectionRefineMarkup(state: EditorState): string {
  return `<div class="selection-refine-grid">
    <button data-property-action="selection-expand">Expand</button>
    <button data-property-action="selection-contract">Contract</button>
    <button data-property-action="selection-invert">Invert</button>
    <button data-property-action="selection-feather-apply">Apply Feather</button>
  </div>
  <label class="vector-width-control"><span>Feather</span><output>${Math.round(state.selectionFeather)} px</output><input data-property-control="selection-feather" type="range" min="0" max="128" value="${Math.round(state.selectionFeather)}"></label>`;
}

function vectorActionsMarkup(info: DrawingSelectionInfo): string {
  return `<div class="vector-edit-grid">
    <button data-property-action="vector-add-point">＋ Point</button>
    <button data-property-action="vector-delete-point" ${info.selectedVectorPointIndex === null ? 'disabled' : ''}>− Point</button>
    <button data-property-action="vector-handles" ${info.selectedVectorPointIndex === null ? 'disabled' : ''}>Bezier</button>
    <button data-property-action="vector-simplify">Simplify</button>
    <button data-property-action="vector-connect">Connect</button>
    <button data-property-action="vector-redraw">Redraw</button>
  </div>`;
}

export class PropertiesPanel {
  readonly element: HTMLElement;
  private state: EditorState;
  private info: DrawingSelectionInfo;
  private readonly callbacks: PropertiesPanelCallbacks;
  private readonly editableProperties: EditableLayerProperties;
  private showingEditable = false;

  constructor(state: EditorState, info: DrawingSelectionInfo, callbacks: PropertiesPanelCallbacks) {
    this.state = state;
    this.info = info;
    this.callbacks = callbacks;
    this.editableProperties = new EditableLayerProperties({ onCommit: callbacks.onEditablePatch });
    this.element = document.createElement('section');
    this.element.className = 'panel properties-panel';
    this.render();
  }

  update(state: EditorState, info: DrawingSelectionInfo): void {
    this.state = state;
    this.info = info;
    this.render();
  }

  private render(): void {
    if (this.info.editableLayer) {
      if (!this.showingEditable) {
        this.element.innerHTML = `<div class="panel-heading compact-heading"><div><span class="eyebrow">SELECTION</span><h2>Properties</h2></div><span class="brush-engine-badge">V0.6.7</span></div>`;
        this.element.append(this.editableProperties.element);
        this.showingEditable = true;
      }
      this.editableProperties.update(this.info.editableLayer, this.info.editableLayerLocked);
      return;
    }
    this.showingEditable = false;
    const { tool } = this.state;
    const rect = this.info.rect;
    const stroke = this.info.selectedVectorStroke;
    const selectionLabel = rect ? `${Math.round(rect.width)} × ${Math.round(rect.height)} px` : 'No active selection';
    let body = `<div class="property-empty"><b>Tool Properties</b><span>Select a drawing tool to see its primary controls.</span></div>`;

    if (tool === 'assist') {
      const quickModes: Array<[AssistMode, string]> = [['grid', 'Grid'], ['guide', 'Guide'], ['straight', 'Straight'], ['symmetry', 'Symmetry'], ['perspective', 'Perspective']];
      body = `<div class="context-hero"><span class="context-icon">⌖</span><div><b>Ruler & Assist</b><span>${this.state.assistMode === 'none' ? 'Assist off' : this.state.assistMode}</span></div></div>
      <label class="fill-check"><input data-property-control="assist-snap" type="checkbox" ${this.state.assistSnapEnabled ? 'checked' : ''}><span>Snap enabled</span></label>
      <div class="segmented-control property-segments assist-quick-modes">${quickModes.map(([value, label]) => `<button data-assist-mode="${value}" class="${this.state.assistMode === value ? 'active' : ''}">${label}</button>`).join('')}</div>
      <div class="property-tip">Use the Ruler & Assist palette for detailed grid, radial, concentric, symmetry and perspective controls.</div>`;
    } else if (tool === 'select') {
      if (this.info.activeLayerKind === 'vector') {
        body = `<div class="context-hero"><span class="context-icon vector">◇</span><div><b>Vector Select</b><span>${stroke ? 'Editable vector path selected' : 'Tap a vector line to select it'}</span></div></div>
        ${stroke ? `<label class="vector-width-control"><span>Line width</span><output>${Math.round(stroke.size)} px</output><input data-property-control="vector-width" type="range" min="1" max="120" value="${Math.round(stroke.size)}"></label>
        ${vectorActionsMarkup(this.info)}
        <div class="context-actions"><button data-property-action="vector-color">Use current color</button><button class="danger-soft" data-property-action="vector-delete">Delete line</button></div>` : `<div class="property-tip">Vector strokes remain editable after drawing. Tap near a line to select it.</div>`}`;
      } else {
        const shapes: Array<[SelectionShape, string]> = [['rectangle', 'Rect'], ['ellipse', 'Ellipse'], ['polygon', 'Polygon'], ['pen', 'Pen']];
        body = `<div class="context-hero"><span class="context-icon">▱</span><div><b>Select Area</b><span>${selectionLabel}</span></div></div>
        <div class="segmented-control property-segments selection-shape-row">${shapes.map(([value, label]) => `<button data-selection-shape="${value}" class="${this.state.selectionShape === value ? 'active' : ''}">${label}</button>`).join('')}</div>
        ${selectionModeMarkup(this.state)}
        ${this.state.selectionShape === 'pen' ? `<label class="vector-width-control"><span>Selection pen</span><output>${Math.round(this.state.selectionPenSize)} px</output><input data-property-control="selection-pen-size" type="range" min="1" max="256" value="${Math.round(this.state.selectionPenSize)}"></label>` : ''}
        ${this.state.selectionShape === 'polygon' ? `<button class="detail-action-button" data-property-action="finish-polygon" ${this.info.polygonOpen ? '' : 'disabled'}>Finish polygon</button>` : ''}
        ${selectionRefineMarkup(this.state)}
        <div class="context-actions"><button data-property-action="select-all">Select All</button><button data-property-action="clear">Clear</button></div>`;
      }
    } else if (tool === 'magic-wand') {
      body = `<div class="context-hero"><span class="context-icon">✦</span><div><b>Magic Wand</b><span>${selectionLabel}</span></div></div>
      ${selectionModeMarkup(this.state)}
      <label class="vector-width-control"><span>Tolerance</span><output>${Math.round(this.state.magicWandTolerance)}</output><input data-property-control="wand-tolerance" type="range" min="0" max="255" value="${this.state.magicWandTolerance}"></label>
      ${selectionRefineMarkup(this.state)}
      <div class="property-tip">Tap a connected color region in the visible composite.</div>`;
    } else if (tool === 'lasso') {
      body = `<div class="context-hero"><span class="context-icon">⌁</span><div><b>Lasso Select</b><span>${selectionLabel}</span></div></div>
      ${selectionModeMarkup(this.state)}
      ${selectionRefineMarkup(this.state)}
      <div class="context-actions"><button data-property-action="select-all">Select All</button><button data-property-action="clear">Clear</button></div>
      <div class="property-tip">Draw a freehand loop around the area you want to select.</div>`;
    } else if (tool === 'transform') {
      body = `<div class="context-hero"><span class="context-icon">↗</span><div><b>Transform</b><span>${selectionLabel}</span></div></div>
      <div class="segmented-control property-segments transform-mode-row"><button data-transform-mode="free" class="${this.state.transformMode === 'free' ? 'active' : ''}">Free</button><button data-transform-mode="perspective" class="${this.state.transformMode === 'perspective' ? 'active' : ''}">Perspective</button><button data-transform-mode="distort" class="${this.state.transformMode === 'distort' ? 'active' : ''}">Distort</button><button data-transform-mode="mesh" class="${this.state.transformMode === 'mesh' ? 'active' : ''}">Mesh</button></div>
      <div class="transform-grid"><button data-property-action="flip-h">↔<span>Flip H</span></button><button data-property-action="flip-v">↕<span>Flip V</span></button><button data-property-action="rotate">↻<span>Rotate 90°</span></button><button data-property-action="scale-down">−<span>Scale 90%</span></button><button data-property-action="scale-up">＋<span>Scale 110%</span></button></div>
      <div class="property-tip">Drag inside to move. Free uses corner/edge handles plus rotation; Perspective/Distort use corner cages; Mesh exposes a 3 × 3 warp grid.</div>`;
    } else if (tool === 'vector') {
      body = `<div class="context-hero"><span class="context-icon vector">◇</span><div><b>Vector Pen</b><span>${this.info.activeLayerKind === 'vector' ? 'Drawing editable paths' : 'Creates a vector layer automatically'}</span></div></div>
      ${stroke ? `<label class="vector-width-control"><span>Selected line width</span><output>${Math.round(stroke.size)} px</output><input data-property-control="vector-width" type="range" min="1" max="120" value="${Math.round(stroke.size)}"></label>
      ${vectorActionsMarkup(this.info)}
      <div class="context-actions"><button data-property-action="vector-color">Use current color</button><button class="danger-soft" data-property-action="vector-delete">Delete line</button></div>` : `<div class="property-tip">Draw with Vector Pen, then use Select and tap a vector line to edit anchors and Bezier handles.</div>`}
      <details class="property-details"><summary>Vector layer actions</summary><button class="detail-action-button" data-property-action="vector-rasterize">Rasterize current vector layer</button></details>`;
    } else if (tool === 'eyedropper') {
      body = `<div class="context-hero"><span class="context-icon">⌁</span><div><b>Eyedropper</b><span>Sample from visible composite</span></div></div><div class="property-tip">Tap the canvas to make that pixel the foreground color. Shortcut: I.</div>`;
    } else if (tool === 'gradient') {
      body = `<div class="context-hero"><span class="context-icon">◩</span><div><b>Gradient</b><span>Foreground → background color</span></div></div>
      <div class="segmented-control property-segments"><button data-gradient-mode="linear" class="${this.state.gradientMode === 'linear' ? 'active' : ''}">Linear</button><button data-gradient-mode="radial" class="${this.state.gradientMode === 'radial' ? 'active' : ''}">Radial</button></div>
      <label class="property-field"><span>End color</span><input data-property-control="secondary-color" type="text" value="${escapeHtml(this.state.secondaryColor)}" maxlength="7"></label>
      <div class="property-tip">Drag on the canvas to define direction and length. Active selections constrain the result.</div>`;
    } else if (tool === 'shape') {
      body = `<div class="context-hero"><span class="context-icon">□</span><div><b>Line / Shape</b><span>${this.state.shapeType}</span></div></div>
      <div class="segmented-control property-segments"><button data-shape-type="line" class="${this.state.shapeType === 'line' ? 'active' : ''}">Line</button><button data-shape-type="rectangle" class="${this.state.shapeType === 'rectangle' ? 'active' : ''}">Rect</button><button data-shape-type="ellipse" class="${this.state.shapeType === 'ellipse' ? 'active' : ''}">Ellipse</button></div>
      <label class="fill-check"><input data-property-control="shape-fill" type="checkbox" ${this.state.shapeFill ? 'checked' : ''}><span>Fill closed shape</span></label>
      <div class="property-tip">Uses current color, brush size and opacity. Drag from start to end.</div>`;
    } else if (tool === 'text') {
      body = `<div class="context-hero"><span class="context-icon">T</span><div><b>Text Foundation</b><span>Raster text placement</span></div></div>
      <label class="property-field"><span>Text</span><textarea data-property-control="text-value" rows="3">${escapeHtml(this.state.textValue)}</textarea></label>
      <label class="property-field"><span>Size</span><input data-property-control="text-size" type="number" min="6" max="300" value="${Math.round(this.state.textSize)}"></label>
      <label class="property-field"><span>Font</span><select data-property-control="text-font"><option value="sans-serif" ${this.state.textFont === 'sans-serif' ? 'selected' : ''}>Sans</option><option value="serif" ${this.state.textFont === 'serif' ? 'selected' : ''}>Serif</option><option value="monospace" ${this.state.textFont === 'monospace' ? 'selected' : ''}>Mono</option></select></label>
      <div class="property-tip">Set text here, then tap the canvas to place it. Editable text layers arrive in V0.6.7.</div>`;
    }

    this.element.innerHTML = `<div class="panel-heading compact-heading"><div><span class="eyebrow">CONTEXT</span><h2>Properties</h2></div><span class="brush-engine-badge">V0.6.3</span></div>${body}`;
    this.installEvents();
  }

  private installEvents(): void {
    this.element.querySelectorAll<HTMLButtonElement>('[data-property-action]').forEach((button) => button.addEventListener('click', () => {
      switch (button.dataset.propertyAction) {
        case 'select-all': this.callbacks.onSelectAll(); break;
        case 'clear': this.callbacks.onClearSelection(); break;
        case 'selection-expand': this.callbacks.onSelectionExpand(); break;
        case 'selection-contract': this.callbacks.onSelectionContract(); break;
        case 'selection-invert': this.callbacks.onSelectionInvert(); break;
        case 'selection-feather-apply': this.callbacks.onSelectionFeatherApply(); break;
        case 'finish-polygon': this.callbacks.onFinishPolygon(); break;
        case 'flip-h': this.callbacks.onFlipHorizontal(); break;
        case 'flip-v': this.callbacks.onFlipVertical(); break;
        case 'rotate': this.callbacks.onRotate90(); break;
        case 'scale-down': this.callbacks.onScale(0.9); break;
        case 'scale-up': this.callbacks.onScale(1.1); break;
        case 'vector-color': this.callbacks.onVectorRecolor(); break;
        case 'vector-delete': this.callbacks.onVectorDelete(); break;
        case 'vector-rasterize': this.callbacks.onVectorRasterize(); break;
        case 'vector-add-point': this.callbacks.onVectorAddPoint(); break;
        case 'vector-delete-point': this.callbacks.onVectorDeletePoint(); break;
        case 'vector-handles': this.callbacks.onVectorHandles(); break;
        case 'vector-simplify': this.callbacks.onVectorSimplify(); break;
        case 'vector-connect': this.callbacks.onVectorConnect(); break;
        case 'vector-redraw': this.callbacks.onVectorRedraw(); break;
      }
    }));
    this.element.querySelectorAll<HTMLButtonElement>('[data-selection-shape]').forEach((button) => button.addEventListener('click', () => this.callbacks.onSelectionShape(button.dataset.selectionShape as SelectionShape)));
    this.element.querySelectorAll<HTMLButtonElement>('[data-selection-mode]').forEach((button) => button.addEventListener('click', () => this.callbacks.onSelectionMode(button.dataset.selectionMode as SelectionMode)));
    this.element.querySelector<HTMLInputElement>('[data-property-control="selection-feather"]')?.addEventListener('input', (event) => this.callbacks.onSelectionFeather(Number((event.currentTarget as HTMLInputElement).value)));
    this.element.querySelector<HTMLInputElement>('[data-property-control="selection-pen-size"]')?.addEventListener('input', (event) => this.callbacks.onSelectionPenSize(Number((event.currentTarget as HTMLInputElement).value)));
    this.element.querySelectorAll<HTMLButtonElement>('[data-transform-mode]').forEach((button) => button.addEventListener('click', () => this.callbacks.onTransformMode(button.dataset.transformMode as TransformMode)));
    this.element.querySelector<HTMLInputElement>('[data-property-control="vector-width"]')?.addEventListener('input', (event) => this.callbacks.onVectorWidth(Number((event.currentTarget as HTMLInputElement).value)));
    this.element.querySelector<HTMLInputElement>('[data-property-control="wand-tolerance"]')?.addEventListener('input', (event) => this.callbacks.onMagicWandTolerance(Number((event.currentTarget as HTMLInputElement).value)));
    this.element.querySelectorAll<HTMLButtonElement>('[data-gradient-mode]').forEach((button) => button.addEventListener('click', () => this.callbacks.onGradientMode(button.dataset.gradientMode as GradientMode)));
    this.element.querySelector<HTMLInputElement>('[data-property-control="secondary-color"]')?.addEventListener('change', (event) => this.callbacks.onSecondaryColor((event.currentTarget as HTMLInputElement).value));
    this.element.querySelectorAll<HTMLButtonElement>('[data-shape-type]').forEach((button) => button.addEventListener('click', () => this.callbacks.onShapeType(button.dataset.shapeType as ShapeType)));
    this.element.querySelector<HTMLInputElement>('[data-property-control="shape-fill"]')?.addEventListener('change', (event) => this.callbacks.onShapeFill((event.currentTarget as HTMLInputElement).checked));
    this.element.querySelector<HTMLTextAreaElement>('[data-property-control="text-value"]')?.addEventListener('input', (event) => this.callbacks.onTextValue((event.currentTarget as HTMLTextAreaElement).value));
    this.element.querySelector<HTMLInputElement>('[data-property-control="text-size"]')?.addEventListener('input', (event) => this.callbacks.onTextSize(Number((event.currentTarget as HTMLInputElement).value)));
    this.element.querySelector<HTMLSelectElement>('[data-property-control="text-font"]')?.addEventListener('change', (event) => this.callbacks.onTextFont((event.currentTarget as HTMLSelectElement).value));
    this.element.querySelectorAll<HTMLButtonElement>('[data-assist-mode]').forEach((button) => button.addEventListener('click', () => this.callbacks.onAssistMode(button.dataset.assistMode as AssistMode)));
    this.element.querySelector<HTMLInputElement>('[data-property-control="assist-snap"]')?.addEventListener('change', (event) => this.callbacks.onAssistSnap((event.currentTarget as HTMLInputElement).checked));
  }
}
