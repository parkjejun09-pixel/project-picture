import type { WorkspaceHandedness, WorkspaceMode } from '../editor/types.js';

export interface TopBarCallbacks {
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onResetView: () => void;
  onModeChange: (mode: WorkspaceMode) => void;
  onToggleHandedness: () => void;
}

export function createTopBar(callbacks: TopBarCallbacks): HTMLElement {
  const bar = document.createElement('header');
  bar.className = 'topbar app-menu-bar';
  bar.innerHTML = `
    <div class="brand-lockup" aria-label="Drawing Studio">
      <span class="brand-mark">D</span>
      <div><strong>Drawing Studio</strong><small>Illustration workspace</small></div>
    </div>
    <nav class="menu-strip" aria-label="Application menus">
      <button class="menu-label" type="button">File</button><button class="menu-label" type="button">Edit</button>
      <button class="menu-label" type="button">Layer</button><button class="menu-label" type="button">Select</button>
      <button class="menu-label" type="button">Filter</button><button class="menu-label" type="button">View</button>
      <button class="menu-label" type="button">Window</button><button class="menu-label" type="button">Help</button>
    </nav>
    <div class="topbar-actions">
      <button class="handedness-button" data-action="toggle-handedness" title="Mirror workspace for your drawing hand"><span data-handedness-icon>R</span><small>Hand</small></button>
      <label class="mode-select-wrap">
        <span class="sr-only">Workspace mode</span>
        <select data-control="mode" class="mode-select">
          <option value="standard">Standard</option>
          <option value="advanced">Advanced</option>
        </select>
      </label>
    </div>`;

  bar.querySelector<HTMLButtonElement>('[data-action="toggle-handedness"]')?.addEventListener('click', callbacks.onToggleHandedness);
  bar.querySelector<HTMLSelectElement>('[data-control="mode"]')?.addEventListener('change', (event) => {
    callbacks.onModeChange((event.currentTarget as HTMLSelectElement).value as WorkspaceMode);
  });
  return bar;
}

export function updateTopBarHandedness(bar: HTMLElement, handedness: WorkspaceHandedness): void {
  const icon = bar.querySelector<HTMLElement>('[data-handedness-icon]');
  if (icon) icon.textContent = handedness === 'left' ? 'L' : 'R';
  const button = bar.querySelector<HTMLButtonElement>('[data-action="toggle-handedness"]');
  if (button) button.title = handedness === 'left' ? 'Left-handed layout · click for right-handed' : 'Right-handed layout · click for left-handed';
}
