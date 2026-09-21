import type { Tool } from '../editor/types.js';

const icons: Record<Tool, string> = {
  brush: `<svg viewBox="0 0 24 24"><path d="M14.7 4.3 19.7 9.3 9 20H4v-5L14.7 4.3Z"></path><path d="m12.7 6.3 5 5"></path></svg>`,
  smudge: `<svg viewBox="0 0 24 24"><path d="M4 16c4-8 8-8 16-8-3 2-5 5-6 9-3-3-6-3-10-1Z"></path></svg>`,
  blur: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="9" opacity=".45"></circle></svg>`,
  mix: `<svg viewBox="0 0 24 24"><path d="M5 6c5-4 10-2 14 2-5 0-8 3-9 9-4-2-6-6-5-11Z"></path></svg>`,
  eraser: `<svg viewBox="0 0 24 24"><path d="m8 18-4-4 8.7-8.7a2.4 2.4 0 0 1 3.4 0l2.6 2.6a2.4 2.4 0 0 1 0 3.4L12 18H8Z"></path><path d="M8 18h11"></path></svg>`,
  pan: `<svg viewBox="0 0 24 24"><path d="M8.5 11V6.8a1.4 1.4 0 1 1 2.8 0V10M11.3 10V5.7a1.4 1.4 0 1 1 2.8 0v4.6M14.1 10.3V7a1.4 1.4 0 1 1 2.8 0v5M16.9 11.2v-2a1.4 1.4 0 1 1 2.8 0v5.6c0 4-2.8 6.2-6.5 6.2h-1.1"></path></svg>`,
  eyedropper: `<svg viewBox="0 0 24 24"><path d="m15 4 5 5-9.5 9.5-4 1 1-4L17 6"></path><path d="m13.5 7.5 3 3"></path></svg>`,
  fill: `<svg viewBox="0 0 24 24"><path d="m13 3 8 8-9 9-8-8 9-9Z"></path><path d="m8 8 8 8"></path></svg>`,
  gradient: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1"></rect><path d="M4 18 20 6"></path></svg>`,
  shape: `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="8" height="8"></rect><circle cx="16" cy="16" r="5"></circle></svg>`,
  select: `<svg viewBox="0 0 24 24"><path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3"></path><path d="M9 9h6v6H9z"></path></svg>`,
  'magic-wand': `<svg viewBox="0 0 24 24"><path d="m4 20 11-11 3 3L7 23"></path><path d="M17 3v3M21 7h-3M14 5l2-2M20 13l2 2"></path></svg>`,
  lasso: `<svg viewBox="0 0 24 24"><path d="M5 7c4-4 12-3 14 2 2 5-4 8-10 7-5-1-8-5-4-9Z"></path><path d="M9 16c-1 3 0 5 3 5 2 0 3-1 3-2"></path></svg>`,
  transform: `<svg viewBox="0 0 24 24"><path d="M8 4H4v4M16 4h4v4M20 16v4h-4M8 20H4v-4"></path><path d="M8 8h8v8H8z"></path></svg>`,
  vector: `<svg viewBox="0 0 24 24"><circle cx="5" cy="18" r="2"></circle><circle cx="12" cy="6" r="2"></circle><circle cx="19" cy="16" r="2"></circle><path d="M6.8 16.8 10.8 7.5M13.8 7.3l3.8 7"></path></svg>`,
  text: `<svg viewBox="0 0 24 24"><path d="M5 5h14M12 5v14M8 19h8"></path></svg>`,
  balloon: `<svg viewBox="0 0 24 24"><ellipse cx="11" cy="10" rx="8" ry="6"></ellipse><path d="m14 15 3 5-1-6"></path></svg>`,
  panel: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16"></rect><path d="M12 4v16M3 12h18"></path></svg>`,
  tone: `<svg viewBox="0 0 24 24"><circle cx="7" cy="7" r="1"></circle><circle cx="13" cy="7" r="1"></circle><circle cx="19" cy="7" r="1"></circle><circle cx="7" cy="13" r="1"></circle><circle cx="13" cy="13" r="1"></circle><circle cx="19" cy="13" r="1"></circle><circle cx="7" cy="19" r="1"></circle><circle cx="13" cy="19" r="1"></circle><circle cx="19" cy="19" r="1"></circle></svg>`,
  effect: `<svg viewBox="0 0 24 24"><path d="M3 5l7 5M2 12h8M3 19l7-5M21 5l-7 5M22 12h-8M21 19l-7-5"></path></svg>`,
  material: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16"></rect><circle cx="8" cy="9" r="2"></circle><path d="m4 18 5-5 3 3 3-4 5 6"></path></svg>`,
  assist: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><path d="M3 12h18M12 3v18M6.4 6.4l11.2 11.2"></path></svg>`
};

const toolRows: Array<{ tool: Tool; label: string; title: string }> = [
  { tool: 'brush', label: 'Brush', title: 'Brush (B)' },
  { tool: 'eraser', label: 'Erase', title: 'Eraser (E)' },
  { tool: 'smudge', label: 'Smudge', title: 'Smudge (S)' },
  { tool: 'blur', label: 'Blur', title: 'Blur (R)' },
  { tool: 'mix', label: 'Mix', title: 'Wet Mix (X)' },
  { tool: 'eyedropper', label: 'Pick', title: 'Eyedropper (I)' },
  { tool: 'pan', label: 'Pan', title: 'Pan (H or Space)' },
  { tool: 'fill', label: 'Fill', title: 'Smart Fill (G)' },
  { tool: 'gradient', label: 'Grad', title: 'Gradient (D)' },
  { tool: 'shape', label: 'Shape', title: 'Line / Shape (U)' },
  { tool: 'select', label: 'Select', title: 'Rectangle Select (M)' },
  { tool: 'magic-wand', label: 'Wand', title: 'Magic Wand (W)' },
  { tool: 'lasso', label: 'Lasso', title: 'Lasso Select (L)' },
  { tool: 'transform', label: 'Trans', title: 'Transform selection (T)' },
  { tool: 'vector', label: 'Vector', title: 'Vector Pen (V)' },
  { tool: 'text', label: 'Text', title: 'Text (A)' },
  { tool: 'balloon', label: 'Balloon', title: 'Editable balloon' },
  { tool: 'panel', label: 'Panel', title: 'Comic panel grid' },
  { tool: 'tone', label: 'Tone', title: 'Screen tone' },
  { tool: 'effect', label: 'Effect', title: 'Manga effect' },
  { tool: 'material', label: 'Material', title: 'Import material image' },
  { tool: 'assist', label: 'Assist', title: 'Ruler / Assist (R)' }
];

export function createToolBar(onToolChange: (tool: Tool) => void): HTMLElement {
  const toolbar = document.createElement('aside');
  toolbar.className = 'toolbar';
  toolbar.setAttribute('aria-label', 'Drawing tools');
  toolbar.innerHTML = `${toolRows.map(({ tool, label, title }) => `<button class="tool-button${tool === 'brush' ? ' active' : ''}" data-tool="${tool}" title="${title}"><span class="tool-icon">${icons[tool]}</span><span>${label}</span></button>`).join('')}<div class="tool-spacer"></div><div class="tool-color-stack" title="Foreground / background color"><i class="secondary-color"></i><i class="active-color"></i></div>`;
  toolbar.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => button.addEventListener('click', () => onToolChange(button.dataset.tool as Tool)));
  return toolbar;
}
