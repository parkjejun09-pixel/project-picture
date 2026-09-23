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
  const favoriteKey='drawing-studio-brush-favorites';
  const recentKey='drawing-studio-brush-recent';
  let favorites:string[]=[]; try { favorites=JSON.parse(localStorage.getItem(favoriteKey) ?? '[]'); } catch {}
  let recent:string[]=[]; try { recent=JSON.parse(localStorage.getItem(recentKey) ?? '[]'); } catch {}
  let filter: 'all'|'favorites'|'recent' = 'all';
  let query = '';
  const applyFilter=():void=>{
    let visible=0;
    section.querySelectorAll<HTMLElement>('[data-preset]').forEach((button)=>{
      const id=button.dataset.preset ?? '';
      const matchesFilter=filter==='all'||(filter==='favorites'?favorites:recent).includes(id);
      const matchesSearch=!query||Boolean(button.textContent?.toLowerCase().includes(query));
      const show=matchesFilter&&matchesSearch;
      button.hidden=!show; if(show)visible++;
    });
    section.querySelector<HTMLElement>('[data-brush-count]')!.textContent=`${visible} brush${visible===1?'':'es'}`;
    section.querySelectorAll<HTMLElement>('[data-brush-filter]').forEach((button)=>button.classList.toggle('active',button.dataset.brushFilter===filter));
  };
  section.querySelector<HTMLInputElement>('[data-brush-search]')?.addEventListener('input', (event) => { query=(event.currentTarget as HTMLInputElement).value.trim().toLowerCase(); applyFilter(); });
  const syncFavorites=()=>section.querySelectorAll<HTMLElement>('[data-brush-favorite]').forEach((star)=>{ star.textContent=favorites.includes(star.dataset.brushFavorite ?? '')?'★':'☆'; });
  section.querySelectorAll<HTMLElement>('[data-brush-favorite]').forEach((star)=>star.addEventListener('click',(event)=>{ event.stopPropagation(); const id=star.dataset.brushFavorite ?? ''; favorites=favorites.includes(id)?favorites.filter(v=>v!==id):[...favorites,id]; try{localStorage.setItem(favoriteKey,JSON.stringify(favorites));}catch{} syncFavorites(); applyFilter(); }));
  syncFavorites();
  section.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button)=>button.addEventListener('click',()=>{ const id=button.dataset.preset!; recent=[id,...recent.filter(value=>value!==id)].slice(0,8); try{localStorage.setItem(recentKey,JSON.stringify(recent));}catch{} applyFilter(); }));
  section.querySelectorAll<HTMLButtonElement>('[data-brush-filter]').forEach((button)=>button.addEventListener('click',()=>{ filter=button.dataset.brushFilter as typeof filter; applyFilter(); }));
  const options=section.querySelector<HTMLElement>('[data-brush-options]')!;
  section.querySelector<HTMLButtonElement>('[data-brush-menu]')!.addEventListener('click',(event)=>{ const button=event.currentTarget as HTMLButtonElement; options.hidden=!options.hidden; button.setAttribute('aria-expanded',String(!options.hidden)); });
  section.querySelector<HTMLButtonElement>('[data-brush-clear-recent]')!.addEventListener('click',()=>{ recent=[]; try{localStorage.removeItem(recentKey);}catch{} applyFilter(); options.hidden=true; });

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
