export interface NavigatorPanelCallbacks { onFit: () => void; onActual: () => void; }

export class NavigatorPanel {
  readonly element: HTMLElement;
  readonly preview: HTMLCanvasElement;

  constructor(callbacks: NavigatorPanelCallbacks) {
    this.element = document.createElement('section');
    this.element.className = 'panel navigator-panel';
    this.element.innerHTML = `
      <div class="panel-heading compact-heading"><div><span class="eyebrow">VIEW</span><h2>Navigator</h2></div><output class="navigator-zoom" data-navigator-zoom>100%</output></div>
      <div class="navigator-preview-wrap"><canvas class="navigator-preview" width="280" height="175" aria-label="Canvas navigator preview"></canvas><span class="navigator-frame"></span></div>
      <div class="navigator-actions"><button data-action="navigator-fit">Fit canvas</button><button data-action="navigator-actual">100%</button></div>`;
    this.preview = this.element.querySelector<HTMLCanvasElement>('canvas')!;
    this.element.querySelector<HTMLButtonElement>('[data-action="navigator-fit"]')?.addEventListener('click', callbacks.onFit);
    this.element.querySelector<HTMLButtonElement>('[data-action="navigator-actual"]')?.addEventListener('click', callbacks.onActual);
  }

  update(source: HTMLCanvasElement, zoom: number): void {
    const context = this.preview.getContext('2d');
    if (context) {
      context.clearRect(0, 0, this.preview.width, this.preview.height);
      context.fillStyle = '#f8f8f6';
      context.fillRect(0, 0, this.preview.width, this.preview.height);
      context.drawImage(source, 0, 0, this.preview.width, this.preview.height);
    }
    this.updateZoom(zoom);
  }

  updateZoom(zoom: number): void {
    const output = this.element.querySelector<HTMLOutputElement>('[data-navigator-zoom]');
    if (output) output.value = `${Math.round(zoom * 100)}%`;
  }
}
