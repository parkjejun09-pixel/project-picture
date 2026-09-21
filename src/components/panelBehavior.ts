export function isPanelCollapsed(collapsedPanels: readonly string[], panelId: string): boolean {
  return collapsedPanels.includes(panelId);
}

export function togglePanelId(collapsedPanels: readonly string[], panelId: string): string[] {
  return collapsedPanels.includes(panelId)
    ? collapsedPanels.filter((id) => id !== panelId)
    : [...collapsedPanels, panelId];
}

export function decorateCollapsiblePanel(
  panel: HTMLElement,
  panelId: string,
  collapsed: boolean,
  onToggle: (panelId: string) => void
): void {
  panel.dataset.panelId = panelId;
  panel.classList.toggle('is-collapsed', collapsed);
  let heading = panel.querySelector<HTMLElement>(':scope > .panel-heading, :scope > .palette-heading');
  if (!heading) {
    heading = document.createElement('div');
    heading.className = 'panel-heading compact-heading generated-panel-heading';
    heading.innerHTML = `<div><span class="eyebrow">PANEL</span><h2>${panelId}</h2></div>`;
    panel.prepend(heading);
  }
  let button = heading.querySelector<HTMLButtonElement>('[data-panel-collapse]');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel-collapse-button';
    button.dataset.panelCollapse = panelId;
    button.setAttribute('aria-label', `Collapse ${panelId}`);
    heading.append(button);
  }
  button.textContent = collapsed ? '▸' : '▾';
  button.setAttribute('aria-expanded', String(!collapsed));
  button.onclick = () => onToggle(panelId);
}
