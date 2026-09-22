import type { WorkspaceHandedness, WorkspaceMode } from '../editor/types.js';
import type { EditorCommandId } from '../editor/commands.js';

export interface TopBarCallbacks {
  onCommand: (command: EditorCommandId) => void;
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
      ${['File','Edit','Layer','Select','Filter','View','Window','Help'].map((label) => `<button class="menu-label" data-menu="${label.toLowerCase()}" type="button" aria-expanded="false">${label}</button>`).join('')}
      <div class="app-menu-popup" data-menu-popup hidden role="menu"></div>
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

  const menuItems: Record<string, Array<{ label: string; command?: EditorCommandId }>> = {
    file: [{label:'Open…',command:'file.open'},{label:'Save',command:'file.save'},{label:'Save As…',command:'file.saveAs'},{label:'Export PNG',command:'file.exportPng'}],
    edit: [{label:'Undo',command:'edit.undo'},{label:'Redo',command:'edit.redo'}], layer: [{label:'New raster layer',command:'layer.addRaster'}],
    select: [{label:'Select all',command:'select.all'},{label:'Clear selection',command:'select.clear'}], filter: [{label:'Filters are not available in V0.6.7.1'}],
    view: [{label:'Fit canvas',command:'view.fitCanvas'},{label:'Actual size',command:'view.actualSize'}], window: [{label:'Reset workspace',command:'window.resetWorkspace'}], help: [{label:'About Drawing Studio',command:'help.about'}]
  };
  const popup = bar.querySelector<HTMLElement>('[data-menu-popup]')!;
  const closeMenu = (): void => { popup.hidden = true; bar.querySelectorAll('[data-menu]').forEach((button) => button.setAttribute('aria-expanded','false')); };
  bar.querySelectorAll<HTMLButtonElement>('[data-menu]').forEach((button) => button.addEventListener('click', () => {
    const name = button.dataset.menu!; const wasOpen = !popup.hidden && button.getAttribute('aria-expanded') === 'true'; closeMenu(); if (wasOpen) return;
    popup.innerHTML = menuItems[name]!.map((item) => `<button type="button" role="menuitem" ${item.command ? `data-command="${item.command}"` : 'disabled'}>${item.label}</button>`).join('');
    popup.hidden = false; button.setAttribute('aria-expanded','true');
  }));
  popup.addEventListener('click', (event) => { const command = (event.target as HTMLElement).closest<HTMLElement>('[data-command]')?.dataset.command as EditorCommandId | undefined; if (command) { callbacks.onCommand(command); closeMenu(); } });
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
