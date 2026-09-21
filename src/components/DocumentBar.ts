export interface DocumentBarState {
  name: string;
  dirty: boolean;
  width: number;
  height: number;
}

export function documentBarMarkup(): string {
  return `
    <div class="document-tab active" role="tab" aria-selected="true">
      <span class="document-status-dot" data-document-status></span>
      <span class="document-name" data-document-name>Untitled-1</span>
      <span class="document-meta" data-document-meta>2048 × 1280 · RGB</span>
      <button class="document-close" aria-label="Close document" title="Single-document workspace" disabled>×</button>
    </div>
    <button class="document-new" data-action="new-document" aria-label="New document" title="Multi-document support is planned" disabled>＋</button>
    <div class="document-bar-spacer"></div>
    <span class="document-zoom-hint">Ctrl/⌘ + wheel to zoom</span>`;
}

export function createDocumentBar(): HTMLElement {
  const bar = document.createElement('nav');
  bar.className = 'document-bar';
  bar.setAttribute('aria-label', 'Open documents');
  bar.innerHTML = documentBarMarkup();
  return bar;
}

export function updateDocumentBar(bar: HTMLElement, state: DocumentBarState): void {
  const tab = bar.querySelector<HTMLElement>('.document-tab');
  const status = bar.querySelector<HTMLElement>('[data-document-status]');
  const name = bar.querySelector<HTMLElement>('[data-document-name]');
  const meta = bar.querySelector<HTMLElement>('[data-document-meta]');
  tab?.classList.toggle('is-dirty', state.dirty);
  status?.classList.toggle('is-dirty', state.dirty);
  if (status) status.title = state.dirty ? 'Unsaved project changes' : 'Project is saved';
  if (name) name.textContent = state.dirty ? `${state.name} *` : state.name;
  if (meta) meta.textContent = `${state.width} × ${state.height} · RGB`;
}
