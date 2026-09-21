import type { BrushPresetId } from '../drawing/brushPresets.js';
import type { EditorState } from '../editor/types.js';
import { brushPanelMarkup } from './brushPanelMarkup.js';

export interface BrushPanelCallbacks {
  onPreset: (preset: BrushPresetId) => void;
  onStabilizer: (value: number) => void;
  onPressureResponse: (value: number) => void;
  onPressureSize: (value: number) => void;
  onPressureOpacity: (value: number) => void;
  onTiltInfluence: (value: number) => void;
}

export function createBrushPanel(state: EditorState, callbacks: BrushPanelCallbacks): HTMLElement {
  const section = document.createElement('section');
  section.className = 'panel brush-panel';
  section.innerHTML = brushPanelMarkup(state.brushPreset);

  section.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => callbacks.onPreset(button.dataset.preset as BrushPresetId));
  });
  section.querySelector<HTMLInputElement>('[data-brush-search]')?.addEventListener('input', (event) => {
    const query = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase();
    section.querySelectorAll<HTMLElement>('[data-preset]').forEach((button) => { button.hidden = Boolean(query) && !button.textContent?.toLowerCase().includes(query); });
  });
  const favoriteKey='drawing-studio-brush-favorites';
  let favorites:string[]=[]; try { favorites=JSON.parse(localStorage.getItem(favoriteKey) ?? '[]'); } catch {}
  const syncFavorites=()=>section.querySelectorAll<HTMLElement>('[data-brush-favorite]').forEach((star)=>{ star.textContent=favorites.includes(star.dataset.brushFavorite ?? '')?'★':'☆'; });
  section.querySelectorAll<HTMLElement>('[data-brush-favorite]').forEach((star)=>star.addEventListener('click',(event)=>{ event.stopPropagation(); const id=star.dataset.brushFavorite ?? ''; favorites=favorites.includes(id)?favorites.filter(v=>v!==id):[...favorites,id]; try{localStorage.setItem(favoriteKey,JSON.stringify(favorites));}catch{} syncFavorites(); }));
  syncFavorites();

  const bindRange = (name: string, callback: (value: number) => void, scale = 1): void => {
    section.querySelector<HTMLInputElement>(`[data-control="${name}"]`)?.addEventListener('input', (event) => {
      callback(Number((event.currentTarget as HTMLInputElement).value) / scale);
    });
  };

  bindRange('stabilizer', callbacks.onStabilizer);
  bindRange('pressure-response', callbacks.onPressureResponse, 100);
  bindRange('pressure-size', callbacks.onPressureSize, 100);
  bindRange('pressure-opacity', callbacks.onPressureOpacity, 100);
  bindRange('tilt-influence', callbacks.onTiltInfluence, 100);
  return section;
}
