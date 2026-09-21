import type { AssistMode, GuideOrientation } from '../drawing/assist.js';
import type { PerspectiveMode } from '../drawing/perspective.js';
import type { EditorState } from '../editor/types.js';

export interface AssistPanelCallbacks {
  onMode: (value: AssistMode) => void;
  onSnap: (value: boolean) => void;
  onGridSize: (value: number) => void;
  onGuideOrientation: (value: GuideOrientation) => void;
  onGuidePosition: (value: number) => void;
  onStraightAngle: (value: number) => void;
  onParallelAngle: (value: number) => void;
  onRadialCenter: (x: number, y: number) => void;
  onRadialRays: (value: number) => void;
  onConcentricSpacing: (value: number) => void;
  onSymmetryAxes: (value: number) => void;
  onSymmetryCenter: (x: number, y: number) => void;
  onPerspectiveMode: (value: PerspectiveMode) => void;
  onPerspectiveHorizon: (value: number) => void;
  onPerspectiveVp: (index: number, x: number, y: number) => void;
}

const modeButtons = (state: EditorState, advanced: boolean): string => {
  const modes: Array<[AssistMode, string]> = advanced
    ? [['parallel', 'Parallel'], ['curve', 'Curve'], ['radial', 'Radial'], ['concentric', 'Concentric'], ['symmetry', 'Symmetry'], ['perspective', 'Perspective']]
    : [['none', 'Off'], ['grid', 'Grid'], ['guide', 'Guide'], ['straight', 'Straight']];
  return `<div class="assist-mode-grid" ${advanced ? 'data-advanced-only' : ''}>${modes.map(([mode, label]) => `<button type="button" data-assist-mode="${mode}" class="${state.assistMode === mode ? 'active' : ''}">${label}</button>`).join('')}</div>`;
};

function percent(value: number): number { return Math.round(value * 100); }

export function assistPanelMarkup(state: EditorState): string {
  const vpRows = state.perspectiveVanishingPoints.map((point, index) => `
    <div class="assist-vp-row" data-vp-index="${index}">
      <span>VP ${index + 1}</span>
      <label>X <input data-vp-axis="x" type="number" min="0" max="100" value="${percent(point.x)}"></label>
      <label>Y <input data-vp-axis="y" type="number" min="0" max="100" value="${percent(point.y)}"></label>
    </div>`).join('');
  return `
    <div class="panel-heading compact-heading"><div><span class="eyebrow">DRAWING ASSIST</span><h2>Ruler & Assist</h2></div><span class="brush-engine-badge">V0.6.6</span></div>
    <label class="assist-snap-master"><input data-assist-control="snap" type="checkbox" ${state.assistSnapEnabled ? 'checked' : ''}><span>Snap to active assist</span></label>
    ${modeButtons(state, false)}
    ${modeButtons(state, true)}
    <div class="assist-option-stack">
      <div class="assist-options" data-assist-options="grid" ${state.assistMode === 'grid' ? '' : 'hidden'}>
        <label><span>Grid spacing</span><output>${Math.round(state.gridSize)} px</output><input data-assist-control="grid-size" type="range" min="4" max="256" value="${Math.round(state.gridSize)}"></label>
      </div>
      <div class="assist-options" data-assist-options="guide" ${state.assistMode === 'guide' ? '' : 'hidden'}>
        <div class="segmented-control"><button data-guide-orientation="vertical" class="${state.guideOrientation === 'vertical' ? 'active' : ''}">Vertical</button><button data-guide-orientation="horizontal" class="${state.guideOrientation === 'horizontal' ? 'active' : ''}">Horizontal</button></div>
        <label><span>Position</span><output>${percent(state.guidePosition)}%</output><input data-assist-control="guide-position" type="range" min="0" max="100" value="${percent(state.guidePosition)}"></label>
      </div>
      <div class="assist-options" data-assist-options="straight" ${state.assistMode === 'straight' ? '' : 'hidden'}>
        <label><span>Angle</span><output>${Math.round(state.straightAngle)}°</output><input data-assist-control="straight-angle" type="range" min="0" max="359" value="${Math.round(state.straightAngle)}"></label>
      </div>
      <div class="assist-options" data-assist-options="parallel" data-advanced-only ${state.assistMode === 'parallel' ? '' : 'hidden'}>
        <label><span>Reference angle</span><output>${Math.round(state.parallelAngle)}°</output><input data-assist-control="parallel-angle" type="range" min="0" max="359" value="${Math.round(state.parallelAngle)}"></label>
      </div>
      <div class="assist-options" data-assist-options="curve" data-advanced-only ${state.assistMode === 'curve' ? '' : 'hidden'}><div class="property-tip">Cubic curve ruler. V0.6.6 uses a centered editable-feel preset; node editing is intentionally deferred.</div></div>
      <div class="assist-options" data-assist-options="radial" data-advanced-only ${state.assistMode === 'radial' ? '' : 'hidden'}>
        <label><span>Rays</span><output>${state.radialRays}</output><input data-assist-control="radial-rays" type="range" min="2" max="72" value="${state.radialRays}"></label>
        <div class="assist-pair"><label>Center X<input data-assist-control="radial-x" type="number" min="0" max="100" value="${percent(state.radialCenterX)}"></label><label>Center Y<input data-assist-control="radial-y" type="number" min="0" max="100" value="${percent(state.radialCenterY)}"></label></div>
      </div>
      <div class="assist-options" data-assist-options="concentric" data-advanced-only ${state.assistMode === 'concentric' ? '' : 'hidden'}>
        <label><span>Circle spacing</span><output>${Math.round(state.concentricSpacing)} px</output><input data-assist-control="concentric-spacing" type="range" min="4" max="256" value="${Math.round(state.concentricSpacing)}"></label>
      </div>
      <div class="assist-options" data-assist-options="symmetry" data-advanced-only ${state.assistMode === 'symmetry' ? '' : 'hidden'}>
        <label><span>Axes</span><output>${state.symmetryAxes}</output><input data-assist-control="symmetry-axes" type="range" min="2" max="12" value="${state.symmetryAxes}"></label>
        <div class="assist-pair"><label>Center X<input data-assist-control="symmetry-x" type="number" min="0" max="100" value="${percent(state.symmetryCenterX)}"></label><label>Center Y<input data-assist-control="symmetry-y" type="number" min="0" max="100" value="${percent(state.symmetryCenterY)}"></label></div>
      </div>
      <div class="assist-options" data-assist-options="perspective" data-advanced-only ${state.assistMode === 'perspective' ? '' : 'hidden'}>
        <div class="segmented-control perspective-mode-row"><button data-perspective-mode="one" class="${state.perspectiveMode === 'one' ? 'active' : ''}">1 Point</button><button data-perspective-mode="two" class="${state.perspectiveMode === 'two' ? 'active' : ''}">2 Point</button><button data-perspective-mode="three" class="${state.perspectiveMode === 'three' ? 'active' : ''}">3 Point</button></div>
        <label><span>Horizon</span><output>${percent(state.perspectiveHorizonY)}%</output><input data-assist-control="perspective-horizon" type="range" min="0" max="100" value="${percent(state.perspectiveHorizonY)}"></label>
        <div class="assist-vp-list">${vpRows}</div>
      </div>
    </div>`;
}

export class AssistPanel {
  readonly element: HTMLElement;
  private state: EditorState;
  private readonly callbacks: AssistPanelCallbacks;

  constructor(state: EditorState, callbacks: AssistPanelCallbacks) {
    this.state = state;
    this.callbacks = callbacks;
    this.element = document.createElement('section');
    this.element.className = 'panel assist-panel';
    this.render();
  }

  update(state: EditorState): void { this.state = state; this.render(); }

  private render(): void {
    this.element.innerHTML = assistPanelMarkup(this.state);
    this.installEvents();
  }

  private installEvents(): void {
    this.element.querySelector<HTMLInputElement>('[data-assist-control="snap"]')?.addEventListener('change', (event) => this.callbacks.onSnap((event.currentTarget as HTMLInputElement).checked));
    this.element.querySelectorAll<HTMLButtonElement>('[data-assist-mode]').forEach((button) => button.addEventListener('click', () => this.callbacks.onMode(button.dataset.assistMode as AssistMode)));
    this.element.querySelectorAll<HTMLButtonElement>('[data-guide-orientation]').forEach((button) => button.addEventListener('click', () => this.callbacks.onGuideOrientation(button.dataset.guideOrientation as GuideOrientation)));
    this.element.querySelectorAll<HTMLButtonElement>('[data-perspective-mode]').forEach((button) => button.addEventListener('click', () => this.callbacks.onPerspectiveMode(button.dataset.perspectiveMode as PerspectiveMode)));

    const bindNumber = (name: string, callback: (value: number) => void, scale = 1): void => {
      this.element.querySelector<HTMLInputElement>(`[data-assist-control="${name}"]`)?.addEventListener('input', (event) => callback(Number((event.currentTarget as HTMLInputElement).value) / scale));
    };
    bindNumber('grid-size', this.callbacks.onGridSize);
    bindNumber('guide-position', this.callbacks.onGuidePosition, 100);
    bindNumber('straight-angle', this.callbacks.onStraightAngle);
    bindNumber('parallel-angle', this.callbacks.onParallelAngle);
    bindNumber('radial-rays', this.callbacks.onRadialRays);
    bindNumber('concentric-spacing', this.callbacks.onConcentricSpacing);
    bindNumber('symmetry-axes', this.callbacks.onSymmetryAxes);
    bindNumber('perspective-horizon', this.callbacks.onPerspectiveHorizon, 100);

    const bindPair = (xName: string, yName: string, callback: (x: number, y: number) => void): void => {
      const xInput = this.element.querySelector<HTMLInputElement>(`[data-assist-control="${xName}"]`);
      const yInput = this.element.querySelector<HTMLInputElement>(`[data-assist-control="${yName}"]`);
      const emit = (): void => { if (xInput && yInput) callback(Number(xInput.value) / 100, Number(yInput.value) / 100); };
      xInput?.addEventListener('change', emit); yInput?.addEventListener('change', emit);
    };
    bindPair('radial-x', 'radial-y', this.callbacks.onRadialCenter);
    bindPair('symmetry-x', 'symmetry-y', this.callbacks.onSymmetryCenter);

    this.element.querySelectorAll<HTMLElement>('[data-vp-index]').forEach((row) => {
      const index = Number(row.dataset.vpIndex);
      const xInput = row.querySelector<HTMLInputElement>('[data-vp-axis="x"]');
      const yInput = row.querySelector<HTMLInputElement>('[data-vp-axis="y"]');
      const emit = (): void => { if (xInput && yInput) this.callbacks.onPerspectiveVp(index, Number(xInput.value) / 100, Number(yInput.value) / 100); };
      xInput?.addEventListener('change', emit); yInput?.addEventListener('change', emit);
    });
  }
}
