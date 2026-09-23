import { BRUSH_PRESETS, type BrushPresetId } from '../drawing/brushPresets.js';
import { pressureCurvePath } from '../drawing/pressure.js';
import { brushPreviewSvg } from '../drawing/brushPreview.js';

export function pressureResponseLabel(value: number): string {
  if (value < -0.18) return 'Firm';
  if (value > 0.18) return 'Soft';
  return 'Linear';
}


export function brushPanelMarkup(selectedPreset: BrushPresetId): string {
  const selected = BRUSH_PRESETS.find((preset) => preset.id === selectedPreset) ?? BRUSH_PRESETS[1]!;
  return `
    <div class="palette-heading"><span>SUB TOOL</span><div class="palette-heading-actions"><button data-brush-menu title="Brush menu" aria-expanded="false">☰</button></div></div>
    <div class="brush-options-menu" data-brush-options hidden><button data-brush-clear-recent type="button">Clear recent brushes</button></div>
    <div class="subtool-search"><input data-brush-search type="search" placeholder="Search brushes" aria-label="Search brushes"></div>
    <div class="subtool-filter-row"><button class="active" data-brush-filter="all">Brush</button><button data-brush-filter="favorites">Favorites</button><button data-brush-filter="recent">Recent</button></div>
    <div class="brush-preset-grid subtool-list" aria-label="Brush presets">
      ${BRUSH_PRESETS.map((preset) => `
        <button class="brush-preset-card${preset.id === selectedPreset ? ' selected' : ''}" data-preset="${preset.id}" title="${preset.description}">
          <span class="brush-preview brush-preview-${preset.id}">${brushPreviewSvg(preset)}</span>
          <span class="brush-preset-copy"><strong>${preset.label}</strong><small>${preset.category} · ${preset.description}</small></span>
          <span class="subtool-size">${preset.size}</span><span class="brush-favorite" data-brush-favorite="${preset.id}">☆</span>
        </button>`).join('')}
    </div>
    <div class="subtool-footer"><span data-brush-count>${BRUSH_PRESETS.length} brushes</span><button title="Add brush is available in Brush Studio import" disabled aria-disabled="true">＋</button></div>
    <div class="advanced-brush-section" data-advanced-only>
      <div class="palette-subheading"><span>BRUSH DYNAMICS</span><small>${pressureResponseLabel(selected.pressureResponse)}</small></div>
      <div class="pressure-curve-card">
        <svg class="pressure-curve" viewBox="0 0 148 72" preserveAspectRatio="none" aria-label="Pressure response curve">
          <path class="curve-grid" d="M0 72 L148 0 M0 36 H148 M74 0 V72"></path>
          <path class="curve-line" data-pressure-curve d="${pressureCurvePath(selected.pressureResponse)}"></path>
        </svg>
        <input class="property-range" data-control="pressure-response" type="range" min="-100" max="100" value="${Math.round(selected.pressureResponse * 100)}" aria-label="Pressure response">
      </div>
      <div class="brush-property-block dense">
        <div class="property-heading"><span>Size pressure</span><output data-output="pressure-size">${Math.round(selected.pressureSize * 100)}%</output></div>
        <input class="property-range" data-control="pressure-size" type="range" min="0" max="100" value="${Math.round(selected.pressureSize * 100)}">
      </div>
      <div class="brush-property-block dense">
        <div class="property-heading"><span>Opacity pressure</span><output data-output="pressure-opacity">${Math.round(selected.pressureOpacity * 100)}%</output></div>
        <input class="property-range" data-control="pressure-opacity" type="range" min="0" max="100" value="${Math.round(selected.pressureOpacity * 100)}">
      </div>
      <div class="brush-property-block dense">
        <div class="property-heading"><span>Tilt influence</span><output data-output="tilt-influence">${Math.round(selected.tiltInfluence * 100)}%</output></div>
        <input class="property-range" data-control="tilt-influence" type="range" min="0" max="100" value="${Math.round(selected.tiltInfluence * 100)}">
      </div>
      <div class="brush-property-block dense">
        <div class="property-heading"><span>Stabilization</span><output data-output="stabilizer">${selected.stabilizer}</output></div>
        <input class="property-range" data-control="stabilizer" type="range" min="0" max="100" value="${selected.stabilizer}" aria-label="Stroke stabilization">
      </div>
    </div>`;
}
