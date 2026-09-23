import type { CanvasSurround, EditorState, ShortcutProfile, UiDensity, WorkspaceHandedness } from '../editor/types.js';

export interface WorkspacePanelCallbacks {
  onHandedness: (value: WorkspaceHandedness) => void;
  onCanvasSurround: (value: CanvasSurround) => void;
  onDensity: (value: UiDensity) => void;
  onShortcutProfile: (value: ShortcutProfile) => void;
  onReset: () => void;
}

function selected(value: string, expected: string): string { return value === expected ? ' selected' : ''; }

export function workspacePanelMarkup(state: EditorState): string {
  return `
    <div class="panel-heading compact-heading"><div><span class="eyebrow">WORKSPACE</span><h2>Layout</h2></div><span class="workspace-badge">V0.5</span></div>
    <div class="workspace-setting-block">
      <span class="field-label">Drawing hand</span>
      <div class="workspace-segment" data-control="handedness">
        <button data-handedness="right" class="${state.handedness === 'right' ? 'active' : ''}"><b>R</b><span>Right-handed</span></button>
        <button data-handedness="left" class="${state.handedness === 'left' ? 'active' : ''}"><b>L</b><span>Left-handed</span></button>
      </div>
      <small class="setting-help">Mirrors the tool rail and inspector dock without changing the canvas.</small>
    </div>
    <label class="workspace-select-row"><span>Canvas surround</span><select data-control="canvas-surround">
      <option value="neutral"${selected(state.canvasSurround,'neutral')}>Neutral gray</option>
      <option value="dark"${selected(state.canvasSurround,'dark')}>Deep charcoal</option>
      <option value="light"${selected(state.canvasSurround,'light')}>Light gray</option>
    </select></label>
    <label class="workspace-select-row"><span>UI density</span><select data-control="ui-density">
      <option value="comfortable"${selected(state.uiDensity,'comfortable')}>Comfortable</option>
      <option value="compact"${selected(state.uiDensity,'compact')}>Compact</option>
    </select></label>
    <label class="workspace-select-row"><span>Shortcut profile</span><select data-control="shortcut-profile">
      <option value="studio"${selected(state.shortcutProfile,'studio')}>Drawing Studio</option>
      <option value="adobe"${selected(state.shortcutProfile,'adobe')}>Adobe-like</option>
      <option value="clip"${selected(state.shortcutProfile,'clip')}>Clip-like</option>
    </select></label>
    <small class="setting-help shortcut-help">Tool shortcuts and toolbar labels follow the selected profile.</small>
    <button class="workspace-reset-button" data-action="workspace-reset">Reset workspace layout</button>`;
}

export class WorkspacePanel {
  readonly element: HTMLElement;
  private state: EditorState;

  constructor(state: EditorState, callbacks: WorkspacePanelCallbacks) {
    this.state = state;
    this.element = document.createElement('section');
    this.element.className = 'panel workspace-settings-panel';
    this.element.dataset.advancedOnly = '';
    this.element.innerHTML = workspacePanelMarkup(state);
    this.element.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      const hand = target?.dataset.handedness as WorkspaceHandedness | undefined;
      if (hand) callbacks.onHandedness(hand);
      if (target?.dataset.action === 'workspace-reset') callbacks.onReset();
    });
    this.element.querySelector<HTMLSelectElement>('[data-control="canvas-surround"]')?.addEventListener('change', (event) => callbacks.onCanvasSurround((event.currentTarget as HTMLSelectElement).value as CanvasSurround));
    this.element.querySelector<HTMLSelectElement>('[data-control="ui-density"]')?.addEventListener('change', (event) => callbacks.onDensity((event.currentTarget as HTMLSelectElement).value as UiDensity));
    this.element.querySelector<HTMLSelectElement>('[data-control="shortcut-profile"]')?.addEventListener('change', (event) => callbacks.onShortcutProfile((event.currentTarget as HTMLSelectElement).value as ShortcutProfile));
  }

  update(state: EditorState): void {
    this.state = state;
    this.element.querySelectorAll<HTMLButtonElement>('[data-handedness]').forEach((button) => button.classList.toggle('active', button.dataset.handedness === state.handedness));
    const surround = this.element.querySelector<HTMLSelectElement>('[data-control="canvas-surround"]');
    const density = this.element.querySelector<HTMLSelectElement>('[data-control="ui-density"]');
    const profile = this.element.querySelector<HTMLSelectElement>('[data-control="shortcut-profile"]');
    if (surround) surround.value = state.canvasSurround;
    if (density) density.value = state.uiDensity;
    if (profile) profile.value = state.shortcutProfile;
  }
}
