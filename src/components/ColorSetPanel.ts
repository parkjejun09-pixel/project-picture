import type { EditorState } from '../editor/types.js';

export interface ColorSetPanelCallbacks {
  onColorChange: (value: string) => void;
  onToggleFavorite: (value: string) => void;
  onAddProject: (value: string) => void;
}

function swatches(colors: string[], emptyLabel: string): string {
  if (!colors.length) return `<span class="color-set-empty">${emptyLabel}</span>`;
  return colors.slice(0, 16).map((color) => `<button class="color-set-swatch" data-color-value="${color}" style="--swatch:${color}" title="${color}"></button>`).join('');
}

export function colorSetMarkup(state: EditorState): string {
  return `
    <div class="palette-heading"><span>COLOR SET</span><div class="palette-heading-actions"><button data-color-set-action="favorite" title="Favorite current color">☆</button><button data-color-set-action="project" title="Add current color to project">＋</button></div></div>
    <div class="color-set-section"><span class="color-set-label">Recent</span><div class="color-set-grid" data-color-set="recent">${swatches(state.recentColors, 'No recent colors')}</div></div>
    <div class="color-set-section"><span class="color-set-label">Project</span><div class="color-set-grid" data-color-set="project">${swatches(state.projectColors, 'Add project colors')}</div></div>`;
}

export class ColorSetPanel {
  readonly element: HTMLElement;
  private state: EditorState;
  private readonly callbacks: ColorSetPanelCallbacks;

  constructor(state: EditorState, callbacks: ColorSetPanelCallbacks) {
    this.state = state;
    this.callbacks = callbacks;
    this.element = document.createElement('section');
    this.element.className = 'panel palette-panel color-set-panel';
    this.render();
  }

  update(state: EditorState): void {
    this.state = state;
    this.render();
  }

  private render(): void {
    this.element.innerHTML = colorSetMarkup(this.state);
    this.element.querySelectorAll<HTMLButtonElement>('[data-color-value]').forEach((button) => {
      button.addEventListener('click', () => button.dataset.colorValue && this.callbacks.onColorChange(button.dataset.colorValue));
    });
    this.element.querySelector<HTMLButtonElement>('[data-color-set-action="favorite"]')?.addEventListener('click', () => this.callbacks.onToggleFavorite(this.state.color));
    this.element.querySelector<HTMLButtonElement>('[data-color-set-action="project"]')?.addEventListener('click', () => this.callbacks.onAddProject(this.state.color));
  }
}
