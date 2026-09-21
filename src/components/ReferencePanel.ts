export class ReferencePanel {
  readonly element: HTMLElement;
  private objectUrl: string | null = null;

  constructor() {
    this.element = document.createElement('section');
    this.element.className = 'panel reference-panel';
    this.element.innerHTML = `
      <div class="panel-heading compact-heading"><div><span class="eyebrow">REFERENCE</span><h2>Reference Image</h2></div><span class="brush-engine-badge">V0.6.2</span></div>
      <div class="reference-preview empty" data-reference-preview><span>Drop or import an image</span><img alt="Reference preview"></div>
      <div class="reference-actions"><label class="detail-action-button reference-import">Import<input type="file" accept="image/*" data-reference-input></label><button class="detail-action-button" data-reference-clear>Clear</button></div>
      <label class="reference-opacity"><span>Preview opacity</span><output data-reference-opacity-output>100%</output><input type="range" min="10" max="100" value="100" data-reference-opacity></label>`;

    const input = this.element.querySelector<HTMLInputElement>('[data-reference-input]')!;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      this.setFile(file);
      input.value = '';
    });
    this.element.querySelector<HTMLButtonElement>('[data-reference-clear]')!.addEventListener('click', () => this.clear());
    this.element.querySelector<HTMLInputElement>('[data-reference-opacity]')!.addEventListener('input', (event) => {
      const value = Number((event.currentTarget as HTMLInputElement).value);
      const image = this.element.querySelector<HTMLImageElement>('.reference-preview img')!;
      image.style.opacity = String(value / 100);
      this.element.querySelector<HTMLOutputElement>('[data-reference-opacity-output]')!.value = `${value}%`;
    });
  }

  private setFile(file: File): void {
    this.clearObjectUrl();
    this.objectUrl = URL.createObjectURL(file);
    const preview = this.element.querySelector<HTMLElement>('[data-reference-preview]')!;
    const image = preview.querySelector<HTMLImageElement>('img')!;
    image.src = this.objectUrl;
    image.alt = file.name;
    preview.classList.remove('empty');
  }

  private clear(): void {
    this.clearObjectUrl();
    const preview = this.element.querySelector<HTMLElement>('[data-reference-preview]')!;
    const image = preview.querySelector<HTMLImageElement>('img')!;
    image.removeAttribute('src');
    image.alt = 'Reference preview';
    preview.classList.add('empty');
  }

  private clearObjectUrl(): void {
    if (!this.objectUrl) return;
    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
