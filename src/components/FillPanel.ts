import type { EditorState, FillMode, FillReference } from '../editor/types.js';

export interface FillPanelCallbacks {
  onTolerance: (value: number) => void;
  onGap: (value: number) => void;
  onExpansion: (value: number) => void;
  onAntialias: (value: boolean) => void;
  onReference: (value: FillReference) => void;
  onMode: (value: FillMode) => void;
}

export class FillPanel {
  readonly element: HTMLElement;

  constructor(state: EditorState, callbacks: FillPanelCallbacks) {
    this.element = document.createElement('section');
    this.element.className = 'panel fill-panel';
    this.element.innerHTML = `
      <div class="panel-heading compact-heading"><div><span class="eyebrow">SUB TOOL</span><h2>Smart Fill</h2></div><span class="brush-engine-badge">V0.4</span></div>
      <div class="fill-mode-block"><span class="field-label">MODE</span><div class="segmented-control fill-mode-control"><button data-fill-mode="bucket">Bucket</button><button data-fill-mode="enclose">Enclose</button><button data-fill-mode="unpainted">Unpainted</button></div></div>
      <div class="fill-info-card"><b>Clean Flat</b><span>Bucket uses gap-aware flood fill. Enclose fills the current selection. Unpainted targets transparent connected pixels.</span></div>
      <div class="brush-property-block dense"><div class="property-heading"><span>Tolerance</span><output data-output="fill-tolerance"></output></div><input class="property-range" data-control="fill-tolerance" type="range" min="0" max="255"></div>
      <div class="brush-property-block dense"><div class="property-heading"><span>Gap closing</span><output data-output="fill-gap"></output></div><input class="property-range" data-control="fill-gap" type="range" min="0" max="8"></div>
      <div class="brush-property-block dense"><div class="property-heading"><span>Expand under line</span><output data-output="fill-expansion"></output></div><input class="property-range" data-control="fill-expansion" type="range" min="0" max="12"></div>
      <label class="fill-check"><input data-control="fill-antialias" type="checkbox"><span>Anti-alias edge</span></label>
      <div class="fill-reference-block" data-advanced-only>
        <span class="field-label">REFERENCE</span>
        <div class="segmented-control" data-control="fill-reference">
          <button data-reference="active">Active</button><button data-reference="visible">Visible</button><button data-reference="line-art">Line Art</button>
        </div>
      </div>`;
    const bind = (name: string, callback: (value: number) => void): void => {
      this.element.querySelector<HTMLInputElement>(`[data-control="${name}"]`)!.addEventListener('input', (event) => callback(Number((event.currentTarget as HTMLInputElement).value)));
    };
    bind('fill-tolerance', callbacks.onTolerance);
    bind('fill-gap', callbacks.onGap);
    bind('fill-expansion', callbacks.onExpansion);
    this.element.querySelector<HTMLInputElement>('[data-control="fill-antialias"]')!.addEventListener('change', (event) => callbacks.onAntialias((event.currentTarget as HTMLInputElement).checked));
    this.element.querySelectorAll<HTMLButtonElement>('[data-reference]').forEach((button) => button.addEventListener('click', () => callbacks.onReference(button.dataset.reference as FillReference)));
    this.element.querySelectorAll<HTMLButtonElement>('[data-fill-mode]').forEach((button) => button.addEventListener('click', () => callbacks.onMode(button.dataset.fillMode as FillMode)));
    this.update(state);
  }

  update(state: EditorState): void {
    const setRange = (name: string, value: number): void => {
      const input = this.element.querySelector<HTMLInputElement>(`[data-control="${name}"]`);
      const output = this.element.querySelector<HTMLOutputElement>(`[data-output="${name.replace('fill-', 'fill-')}"]`);
      if (input) input.value = String(value);
      if (output) output.value = String(Math.round(value));
    };
    setRange('fill-tolerance', state.fillTolerance);
    setRange('fill-gap', state.fillGapClosing);
    setRange('fill-expansion', state.fillExpansion);
    const antialias = this.element.querySelector<HTMLInputElement>('[data-control="fill-antialias"]');
    if (antialias) antialias.checked = state.fillAntialias;
    this.element.querySelectorAll<HTMLButtonElement>('[data-reference]').forEach((button) => button.classList.toggle('active', button.dataset.reference === state.fillReference));
    this.element.querySelectorAll<HTMLButtonElement>('[data-fill-mode]').forEach((button) => button.classList.toggle('active', button.dataset.fillMode === state.fillMode));
  }
}
