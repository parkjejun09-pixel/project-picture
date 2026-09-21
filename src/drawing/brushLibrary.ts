import type { BrushPreset } from './brushPresets.js';

export function filterBrushPresets(presets: readonly BrushPreset[], query: string): BrushPreset[] {
  const needle=query.trim().toLowerCase();
  if(!needle) return [...presets];
  return presets.filter((preset)=>`${preset.label} ${preset.description} ${preset.category} ${preset.tags.join(' ')}`.toLowerCase().includes(needle));
}

export function toggleBrushFavorite(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value)=>value!==id) : [...ids,id];
}

export function serializeCustomBrush(preset: BrushPreset): string {
  return JSON.stringify({ version:1, preset });
}

export function parseCustomBrush(raw: string): BrushPreset | null {
  try {
    const value=JSON.parse(raw) as {version?:unknown;preset?:Partial<BrushPreset>};
    const p=value.preset;
    if(value.version!==1||!p||typeof p.id!=='string'||typeof p.label!=='string'||typeof p.size!=='number'||typeof p.opacity!=='number') return null;
    return p as BrushPreset;
  } catch { return null; }
}
