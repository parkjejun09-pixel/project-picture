export interface CommandBarState {
  brushSize: number;
  opacity: number;
  stabilizer: number;
  zoom: number;
  assistSnapEnabled: boolean;
}

export interface CommandBarCallbacks {
  onOpenProject: () => void;
  onSaveProject: () => void;
  onSaveAsProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onResetView: () => void;
  onSize: (value: number) => void;
  onOpacity: (value: number) => void;
  onStabilizer: (value: number) => void;
  onZoom: (value: number) => void;
  onSnapToggle: () => void;
}

export function commandBarMarkup(state: CommandBarState): string {
  return `
    <div class="command-group command-project">
      <button class="command-button" data-action="open-project">Open</button>
      <button class="command-button" data-action="save-project">Save</button>
      <button class="command-button" data-action="save-as-project">Save As</button>
      <button class="command-button" data-action="export">Export PNG</button>
    </div>
    <span class="command-separator"></span>
    <div class="command-group command-history">
      <button class="command-icon" data-action="undo" title="Undo">↶</button>
      <button class="command-icon" data-action="redo" title="Redo">↷</button>
    </div>
    <span class="command-separator"></span>
    <div class="command-group">
      <button class="command-button" data-action="reset-view">Fit Canvas</button>
    </div>
    <span class="command-separator"></span>
    <div class="command-group command-tool-state">
      <button class="command-toggle${state.assistSnapEnabled ? ' is-on' : ''}" type="button" data-action="snap-toggle" aria-pressed="${state.assistSnapEnabled}" title="Toggle snapping to the active ruler / assist"><i></i>Snap</button>
      <span class="command-assist-label">Ruler Assist</span>
    </div>
    <span class="command-spacer"></span>
    <label class="command-value"><span>Size</span><input data-command="brush-size" type="number" min="1" max="200" value="${Math.round(state.brushSize)}"><b>px</b></label>
    <label class="command-value"><span>Opacity</span><input data-command="opacity" type="number" min="1" max="100" value="${Math.round(state.opacity * 100)}"><b>%</b></label>
    <label class="command-value"><span>Stabilizer</span><input data-command="stabilizer" type="number" min="0" max="100" value="${Math.round(state.stabilizer)}"></label>
    <span class="command-separator"></span>
    <label class="command-value compact"><span>Zoom</span><input data-command="zoom" type="number" min="25" max="400" value="${Math.round(state.zoom * 100)}"><b>%</b></label>`;
}

export function createCommandBar(state: CommandBarState, callbacks: CommandBarCallbacks): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'command-bar';
  bar.setAttribute('aria-label', 'Drawing command bar');
  bar.innerHTML = commandBarMarkup(state);
  bar.querySelector<HTMLButtonElement>('[data-action="open-project"]')?.addEventListener('click', callbacks.onOpenProject);
  bar.querySelector<HTMLButtonElement>('[data-action="save-project"]')?.addEventListener('click', callbacks.onSaveProject);
  bar.querySelector<HTMLButtonElement>('[data-action="save-as-project"]')?.addEventListener('click', callbacks.onSaveAsProject);
  bar.querySelector<HTMLButtonElement>('[data-action="undo"]')?.addEventListener('click', callbacks.onUndo);
  bar.querySelector<HTMLButtonElement>('[data-action="redo"]')?.addEventListener('click', callbacks.onRedo);
  bar.querySelector<HTMLButtonElement>('[data-action="export"]')?.addEventListener('click', callbacks.onExport);
  bar.querySelector<HTMLButtonElement>('[data-action="reset-view"]')?.addEventListener('click', callbacks.onResetView);
  bar.querySelector<HTMLButtonElement>('[data-action="snap-toggle"]')?.addEventListener('click', callbacks.onSnapToggle);
  const bind = (name: string, callback: (value: number) => void, scale = 1): void => {
    bar.querySelector<HTMLInputElement>(`[data-command="${name}"]`)?.addEventListener('change', (event) => {
      callback(Number((event.currentTarget as HTMLInputElement).value) / scale);
    });
  };
  bind('brush-size', callbacks.onSize);
  bind('opacity', callbacks.onOpacity, 100);
  bind('stabilizer', callbacks.onStabilizer);
  bind('zoom', callbacks.onZoom, 100);
  return bar;
}

export function updateCommandBar(bar: HTMLElement, state: CommandBarState): void {
  const set = (name: string, value: number): void => {
    const input = bar.querySelector<HTMLInputElement>(`[data-command="${name}"]`);
    if (input && document.activeElement !== input) input.value = String(value);
  };
  set('brush-size', Math.round(state.brushSize));
  set('opacity', Math.round(state.opacity * 100));
  set('stabilizer', Math.round(state.stabilizer));
  set('zoom', Math.round(state.zoom * 100));
  const snap = bar.querySelector<HTMLButtonElement>('[data-action="snap-toggle"]');
  if (snap) { snap.classList.toggle('is-on', state.assistSnapEnabled); snap.setAttribute('aria-pressed', String(state.assistSnapEnabled)); }
}
