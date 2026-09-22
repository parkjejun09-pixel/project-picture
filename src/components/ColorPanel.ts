import { generateColorVariants, generateHarmony, hexToHsv, hexToRgb, hsvToHex, type HarmonyMode, type ColorVariantKey } from '../drawing/colorModel.js';
import { extractPaletteFromPixels } from '../drawing/palette.js';
import type { EditorState } from '../editor/types.js';

export interface ColorPanelCallbacks {
  onColorPreview: (value: string) => void;
  onColorCommit: (value: string) => void;
  onToggleFavorite: (value: string) => void;
  onAddProject: (value: string) => void;
  onExtractedColors: (values: string[]) => void;
}

type PaletteTab = 'recent' | 'favorite' | 'project' | 'extracted';


export function colorPanelMarkup(_state: EditorState): string {
  return `
    <div class="palette-heading color-palette-heading">
      <span>COLOR</span>
      <div class="palette-heading-actions"><span class="palette-mode-label">Wheel</span></div>
    </div>
    <div class="color-lab-main">
      <div class="color-wheel-combo">
        <div class="hue-wheel" data-control="hue-wheel" aria-label="Hue wheel">
          <div class="sv-square sv-disc" data-control="sv-square" aria-label="Saturation and value"><i data-sv-indicator></i></div>
          <i class="hue-indicator" data-hue-indicator></i>
        </div>
      </div>
      <div class="color-primary-stack">
        <div class="fg-bg-stack" aria-label="Foreground and background colors">
          <span class="background-color-chip"></span>
          <span class="current-color-large" data-current-color-large></span>
        </div>
        <div class="color-primary-copy"><strong>Foreground</strong><span data-current-color-label>#232323</span></div>
      </div>
    </div>
    <div class="color-readout-row">
      <span class="current-color-chip" data-current-color></span>
      <div class="hex-field-wrap compact-hex"><span>#</span><input data-control="hex" maxlength="6" spellcheck="false" autocomplete="off"></div>
      <button class="color-icon-button" data-action="favorite" title="Favorite current color">☆</button>
      <button class="color-icon-button" data-action="project-add" title="Add to project palette">＋</button>
    </div>
    <details class="color-channel-details">
      <summary>RGB / HSV values</summary>
      <div class="color-channel-grid">
        <label>R<input data-channel="r" type="number" min="0" max="255"></label>
        <label>G<input data-channel="g" type="number" min="0" max="255"></label>
        <label>B<input data-channel="b" type="number" min="0" max="255"></label>
        <label>H<input data-channel="h" type="number" min="0" max="359"></label>
        <label>S<input data-channel="s" type="number" min="0" max="100"></label>
        <label>V<input data-channel="v" type="number" min="0" max="100"></label>
      </div>
    </details>
    <div class="color-advanced-lab" data-advanced-only>
      <div class="color-section">
        <div class="color-section-title"><span>Harmony</span><select data-control="harmony-mode">
          <option value="analogous">Analogous</option><option value="complementary">Complementary</option>
          <option value="split-complementary">Split comp.</option><option value="triadic">Triadic</option><option value="monochromatic">Monochrome</option>
        </select></div>
        <div class="harmony-strip" data-harmony-strip></div>
      </div>
      <div class="color-section">
        <div class="variant-tabs">
          ${(['tint','shade','tone','warm','cool'] as ColorVariantKey[]).map((mode) => `<button data-variant-mode="${mode}">${mode}</button>`).join('')}
        </div>
        <div class="harmony-strip variant-strip" data-variant-strip></div>
      </div>
      <div class="color-section palette-section">
        <div class="palette-tabs">
          <button data-palette-tab="recent">Recent</button><button data-palette-tab="favorite">★</button><button data-palette-tab="project">Project</button><button data-palette-tab="extracted">Image</button>
        </div>
        <div class="palette-strip" data-palette-strip></div>
        <label class="extract-image-button">Extract image palette<input data-control="palette-image" type="file" accept="image/*"></label>
      </div>
    </div>`;
}

export class ColorPanel {
  readonly element: HTMLElement;
  private state: EditorState;
  private harmonyMode: HarmonyMode = 'analogous';
  private variantMode: ColorVariantKey = 'tint';
  private paletteTab: PaletteTab = 'recent';
  private readonly callbacks: ColorPanelCallbacks;

  constructor(state: EditorState, callbacks: ColorPanelCallbacks) {
    this.state = state;
    this.callbacks = callbacks;
    this.element = document.createElement('section');
    this.element.className = 'panel color-panel color-lab-panel';
    this.element.innerHTML = colorPanelMarkup(state);
    this.installEvents();
    this.update(state);
  }

  update(state: EditorState): void {
    this.state = state;
    const rgb = hexToRgb(state.color);
    const hsv = hexToHsv(state.color);
    const hex = this.element.querySelector<HTMLInputElement>('[data-control="hex"]');
    if (hex && document.activeElement !== hex) hex.value = state.color.slice(1);
    const chip = this.element.querySelector<HTMLElement>('[data-current-color]');
    if (chip) chip.style.background = state.color;
    const largeChip = this.element.querySelector<HTMLElement>('[data-current-color-large]');
    if (largeChip) largeChip.style.background = state.color;
    const colorLabel = this.element.querySelector<HTMLElement>('[data-current-color-label]');
    if (colorLabel) colorLabel.textContent = state.color;
    const favorite = this.element.querySelector<HTMLButtonElement>('[data-action="favorite"]');
    if (favorite) favorite.textContent = state.favoriteColors.includes(state.color) ? '★' : '☆';
    this.setChannel('r', rgb.r); this.setChannel('g', rgb.g); this.setChannel('b', rgb.b);
    this.setChannel('h', Math.round(hsv.h)); this.setChannel('s', Math.round(hsv.s * 100)); this.setChannel('v', Math.round(hsv.v * 100));
    const square = this.element.querySelector<HTMLElement>('[data-control="sv-square"]');
    if (square) square.style.setProperty('--hue-color', hsvToHex({ h: hsv.h, s: 1, v: 1 }));
    const wheel = this.element.querySelector<HTMLElement>('[data-control="hue-wheel"]');
    if (wheel) wheel.style.setProperty('--hue-angle', `${hsv.h}deg`);
    const svIndicator = this.element.querySelector<HTMLElement>('[data-sv-indicator]');
    if (svIndicator) { svIndicator.style.left = `${hsv.s * 100}%`; svIndicator.style.top = `${(1 - hsv.v) * 100}%`; }
    this.renderHarmony();
    this.renderVariants();
    this.renderPalette();
  }

  private setChannel(name: string, value: number): void {
    const input = this.element.querySelector<HTMLInputElement>(`[data-channel="${name}"]`);
    if (input && document.activeElement !== input) input.value = String(value);
  }

  private installEvents(): void {
    const hex = this.element.querySelector<HTMLInputElement>('[data-control="hex"]')!;
    const applyHex = (): void => {
      const raw = hex.value.trim();
      if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) this.callbacks.onColorCommit(`#${raw}`);
    };
    hex.addEventListener('input', () => {
      const raw = hex.value.trim();
      if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) this.callbacks.onColorPreview(`#${raw}`);
    });
    hex.addEventListener('blur', applyHex);

    this.element.querySelectorAll<HTMLInputElement>('[data-channel]').forEach((input) => input.addEventListener('change', () => {
      const rgb = hexToRgb(this.state.color);
      const hsv = hexToHsv(this.state.color);
      const name = input.dataset.channel;
      const value = Number(input.value);
      if (name === 'r' || name === 'g' || name === 'b') {
        this.callbacks.onColorCommit(`#${[name === 'r' ? value : rgb.r, name === 'g' ? value : rgb.g, name === 'b' ? value : rgb.b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0')).join('')}`);
      } else if (name) {
        const next = { ...hsv };
        if (name === 'h') next.h = value;
        if (name === 's') next.s = value / 100;
        if (name === 'v') next.v = value / 100;
        this.callbacks.onColorCommit(hsvToHex(next));
      }
    }));

    this.bindPointerControl('[data-control="hue-wheel"]', (event, element) => {
      const rect = element.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
      const hsv = hexToHsv(this.state.color);
      return hsvToHex({ ...hsv, h: hue });
    });
    this.bindPointerControl('[data-control="sv-square"]', (event, element) => {
      const rect = element.getBoundingClientRect();
      const s = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const v = 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      const hsv = hexToHsv(this.state.color);
      return hsvToHex({ h: hsv.h, s, v });
    });

    this.element.querySelector<HTMLSelectElement>('[data-control="harmony-mode"]')!.addEventListener('change', (event) => {
      this.harmonyMode = (event.currentTarget as HTMLSelectElement).value as HarmonyMode;
      this.renderHarmony();
    });
    this.element.querySelectorAll<HTMLButtonElement>('[data-variant-mode]').forEach((button) => button.addEventListener('click', () => {
      this.variantMode = button.dataset.variantMode as ColorVariantKey;
      this.renderVariants();
    }));
    this.element.querySelectorAll<HTMLButtonElement>('[data-palette-tab]').forEach((button) => button.addEventListener('click', () => {
      this.paletteTab = button.dataset.paletteTab as PaletteTab;
      this.renderPalette();
    }));
    this.element.querySelector<HTMLButtonElement>('[data-action="favorite"]')!.addEventListener('click', () => this.callbacks.onToggleFavorite(this.state.color));
    this.element.querySelector<HTMLButtonElement>('[data-action="project-add"]')!.addEventListener('click', () => this.callbacks.onAddProject(this.state.color));
    this.element.querySelector<HTMLInputElement>('[data-control="palette-image"]')!.addEventListener('change', (event) => void this.extractImagePalette(event));
    this.element.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-color-value]');
      if (button?.dataset.colorValue) this.callbacks.onColorCommit(button.dataset.colorValue);
    });
  }

  private bindPointerControl(selector: string, callback: (event: PointerEvent, element: HTMLElement) => string): void {
    const element = this.element.querySelector<HTMLElement>(selector)!;
    let preview = this.state.color;
    const handle = (event: PointerEvent): void => { event.preventDefault(); event.stopPropagation(); preview = callback(event, element); this.callbacks.onColorPreview(preview); };
    element.addEventListener('pointerdown', (event) => { element.setPointerCapture?.(event.pointerId); handle(event); });
    element.addEventListener('pointermove', (event) => { if (element.hasPointerCapture?.(event.pointerId)) handle(event); });
    element.addEventListener('pointerup', (event) => { handle(event); element.releasePointerCapture?.(event.pointerId); this.callbacks.onColorCommit(preview); });
    element.addEventListener('pointercancel', (event) => element.releasePointerCapture?.(event.pointerId));
  }

  private renderHarmony(): void {
    const strip = this.element.querySelector<HTMLElement>('[data-harmony-strip]');
    if (!strip) return;
    strip.innerHTML = generateHarmony(this.state.color, this.harmonyMode).map((color) => this.swatchMarkup(color)).join('');
    const select = this.element.querySelector<HTMLSelectElement>('[data-control="harmony-mode"]');
    if (select) select.value = this.harmonyMode;
  }

  private renderVariants(): void {
    const strip = this.element.querySelector<HTMLElement>('[data-variant-strip]');
    if (!strip) return;
    strip.innerHTML = generateColorVariants(this.state.color)[this.variantMode].map((color) => this.swatchMarkup(color)).join('');
    this.element.querySelectorAll<HTMLButtonElement>('[data-variant-mode]').forEach((button) => button.classList.toggle('active', button.dataset.variantMode === this.variantMode));
  }

  private renderPalette(): void {
    const palettes: Record<PaletteTab, string[]> = {
      recent: this.state.recentColors,
      favorite: this.state.favoriteColors,
      project: this.state.projectColors,
      extracted: this.state.extractedColors
    };
    const colors = palettes[this.paletteTab];
    const strip = this.element.querySelector<HTMLElement>('[data-palette-strip]');
    if (strip) strip.innerHTML = colors.length ? colors.map((color) => this.swatchMarkup(color, true)).join('') : '<span class="empty-palette">No colors yet</span>';
    this.element.querySelectorAll<HTMLButtonElement>('[data-palette-tab]').forEach((button) => button.classList.toggle('active', button.dataset.paletteTab === this.paletteTab));
  }

  private swatchMarkup(color: string, compact = false): string {
    return `<button class="lab-swatch${compact ? ' compact' : ''}" data-color-value="${color}" style="--swatch:${color}" title="${color}"></button>`;
  }

  private async extractImagePalette(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const max = 96;
      const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const colors = extractPaletteFromPixels(context.getImageData(0, 0, canvas.width, canvas.height).data, 8);
      this.paletteTab = 'extracted';
      this.callbacks.onExtractedColors(colors);
    } finally {
      URL.revokeObjectURL(url);
      input.value = '';
    }
  }
}
