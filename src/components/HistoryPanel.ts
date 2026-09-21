import { appendHistoryEntry } from './historyModel.js';

export interface HistoryPanelCallbacks {
  onUndo: () => void;
  onRedo: () => void;
}

export class HistoryPanel {
  readonly element: HTMLElement;
  private entries: string[] = ['Document opened'];
  private canUndo = false;
  private canRedo = false;

  constructor(callbacks: HistoryPanelCallbacks) {
    this.element = document.createElement('section');
    this.element.className = 'panel history-panel';
    this.element.dataset.advancedOnly = '';
    this.element.innerHTML = `
      <div class="panel-heading compact-heading"><div><span class="eyebrow">EDIT</span><h2>History</h2></div><span class="panel-count" data-history-count>1</span></div>
      <div class="history-list" data-history-list></div>
      <div class="history-actions-row"><button data-action="history-undo">↶ Undo</button><button data-action="history-redo">↷ Redo</button></div>`;
    this.element.querySelector<HTMLButtonElement>('[data-action="history-undo"]')?.addEventListener('click', callbacks.onUndo);
    this.element.querySelector<HTMLButtonElement>('[data-action="history-redo"]')?.addEventListener('click', callbacks.onRedo);
    this.render();
  }

  add(label: string): void { this.entries = appendHistoryEntry(this.entries, label, 10); this.render(); }
  updateAvailability(canUndo: boolean, canRedo: boolean): void { this.canUndo = canUndo; this.canRedo = canRedo; this.render(); }

  private render(): void {
    const list = this.element.querySelector<HTMLElement>('[data-history-list]');
    if (list) list.innerHTML = this.entries.map((entry, index) => `<div class="history-item${index === 0 ? ' current' : ''}"><span class="history-marker"></span><span>${entry}</span>${index === 0 ? '<small>current</small>' : ''}</div>`).join('');
    const count = this.element.querySelector<HTMLElement>('[data-history-count]');
    if (count) count.textContent = String(this.entries.length);
    const undo = this.element.querySelector<HTMLButtonElement>('[data-action="history-undo"]');
    const redo = this.element.querySelector<HTMLButtonElement>('[data-action="history-redo"]');
    if (undo) undo.disabled = !this.canUndo;
    if (redo) redo.disabled = !this.canRedo;
  }
}
