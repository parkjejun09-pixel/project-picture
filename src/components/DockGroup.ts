export type DockKind = 'primary' | 'secondary';

export function dockGroupMarkup(kind: DockKind): string {
  return `<div class="dock-group ${kind}-dock" data-dock="${kind}"></div>`;
}

export function createDockGroup(kind: DockKind): HTMLElement {
  const wrapper = document.createElement('aside');
  wrapper.innerHTML = dockGroupMarkup(kind);
  return wrapper.firstElementChild as HTMLElement;
}
