export interface BottomBarCallbacks {
  onSize: (value: number) => void;
  onOpacity: (value: number) => void;
  onStabilizer: (value: number) => void;
  onSpacing: (value: number) => void;
  onZoom: (value: number) => void;
}

export function createBottomBar(callbacks: BottomBarCallbacks): HTMLElement {
  const bar = document.createElement('footer');
  bar.className = 'bottom-bar status-bar';
  bar.innerHTML = `
    <div class="status-item active-brush-chip"><span class="brush-chip-dot"></span><strong data-output="preset-name">Inking Pen</strong></div>
    <div class="status-item"><span>Canvas</span><b>2048 × 1280</b></div>
    <div class="status-item"><span>Color</span><i class="status-color-chip"></i><b>RGB</b></div>
    <div class="status-spacer"></div>
    <div class="status-item"><span>Pointer</span><b>Ready</b></div>
    <div class="zoom-cluster status-zoom">
      <button class="mini-button" data-action="zoom-out" aria-label="Zoom out">−</button>
      <label class="zoom-label"><output data-output="zoom">100%</output><input data-control="zoom" type="range" min="25" max="400" value="100"></label>
      <button class="mini-button" data-action="zoom-in" aria-label="Zoom in">＋</button>
    </div>`;

  const zoom = bar.querySelector<HTMLInputElement>('[data-control="zoom"]')!;
  zoom.addEventListener('input', () => callbacks.onZoom(Number(zoom.value) / 100));
  bar.querySelector<HTMLButtonElement>('[data-action="zoom-out"]')?.addEventListener('click', () => callbacks.onZoom(Number(zoom.value) / 100 - 0.1));
  bar.querySelector<HTMLButtonElement>('[data-action="zoom-in"]')?.addEventListener('click', () => callbacks.onZoom(Number(zoom.value) / 100 + 0.1));
  return bar;
}
