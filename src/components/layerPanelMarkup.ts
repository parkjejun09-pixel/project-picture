import {
  getChildren,
  findLayerNode,
  type LayerDocumentState,
  type LayerNode,
  type RasterLayerNode,
  type LayerColorTag
} from '../drawing/layers.js';

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] ?? char));
}

function isRaster(node: LayerNode): node is RasterLayerNode { return node.kind === 'raster' || node.kind === 'background'; }
function layerIcon(node: LayerNode): string {
  switch (node.kind) {
    case 'group': return '▱'; case 'background': return '□'; case 'vector': return '◇'; case 'fill': return '■';
    case 'gradient': return '◩'; case 'correction': return '◑'; case 'selection': return 'S'; default: return '▧';
  }
}
const EDITABLE_BADGES: Partial<Record<LayerNode['kind'], string>> = {
  text:'TXT', balloon:'BAL', panel:'PNL', 'screen-tone':'TONE', 'manga-effect':'FX', material:'MAT'
};
function layerMeta(node: LayerNode): string {
  if (node.kind === 'group') return 'Folder';
  if (node.kind === 'background') return 'Locked · White';
  if (node.kind === 'vector') return `${Math.round(node.opacity * 100)}% · Vector`;
  if (node.kind === 'fill') return `${Math.round(node.opacity * 100)}% · Fill · ${node.color}`;
  if (node.kind === 'gradient') return `${Math.round(node.opacity * 100)}% · ${node.radial ? 'Radial' : 'Linear'} gradient`;
  if (node.kind === 'correction') return `${Math.round(node.opacity * 100)}% · ${node.correctionType === 'hue-saturation' ? 'Hue/Saturation' : 'Brightness/Contrast'}`;
  if (node.kind === 'selection') return 'Stored selection';
  if (isRaster(node)) return `${Math.round(node.opacity * 100)}% · ${node.blendMode}${node.role !== 'normal' ? ` · ${node.role}` : ''}`;
  return `${Math.round(node.opacity * 100)}% · ${node.kind}`;
}

function renderNode(state: LayerDocumentState, node: LayerNode, depth: number): string {
  const selected=node.id===state.activeLayerId; const raster=isRaster(node)?node:null; const children=node.kind==='group'?getChildren(state,node.id).slice().reverse():[];
  const searchable=`${node.name} ${node.kind} ${raster?.role ?? ''} ${node.colorTag}`.toLowerCase();
  return `<div class="layer-tree-item" style="--layer-depth:${depth}" data-layer-search-text="${escapeHtml(searchable)}" data-layer-kind="${node.kind}" data-layer-role="${raster?.role ?? ''}" data-layer-color-tag="${node.colorTag}">
    <div class="layer-row${selected?' selected':''}${node.visible?'':' muted'}" data-layer-id="${node.id}" data-layer-kind="${node.kind}" data-color-tag="${node.colorTag}">
      <button class="layer-visibility-button" data-layer-action="visibility" data-layer-id="${node.id}" title="Show / hide layer">${node.visible?'●':'○'}</button>
      <button class="layer-select-area" data-layer-action="select" data-layer-id="${node.id}">
        <span class="layer-thumbnail ${node.kind}"><span>${layerIcon(node)}</span></span>
        ${raster?.hasMask?`<span class="layer-mask-thumb${selected&&state.activeTarget==='mask'?' target-selected':''}" data-layer-action="select-mask" data-layer-id="${node.id}">M</span>`:''}
        <span class="layer-copy"><strong>${escapeHtml(node.name)}</strong><small>${layerMeta(node)}</small></span>
      </button>
      <span class="layer-status-icons">${EDITABLE_BADGES[node.kind]?`<b class="layer-kind-badge" data-kind="${node.kind}">${EDITABLE_BADGES[node.kind]}</b>`:''}${node.colorTag!=='none'?`<b class="layer-color-dot ${node.colorTag}" title="${node.colorTag} tag">●</b>`:''}${raster?.role==='reference'?'<b title="Reference layer">R</b>':''}${raster?.role==='draft'?'<b title="Draft layer">D</b>':''}${raster?.clipping?'<b>↳</b>':''}${raster?.alphaLock?'<b>α</b>':''}${node.locked?'<b>⌑</b>':''}</span>
    </div>${children.map((child)=>renderNode(state,child,depth+1)).join('')}</div>`;
}

function specialProperties(node: LayerNode): string {
  if (node.kind === 'fill') return `<div class="special-layer-properties"><label><span>Fill color</span><input data-control="special-color" type="color" value="${node.color}"></label></div>`;
  if (node.kind === 'gradient') return `<div class="special-layer-properties"><label><span>Start</span><input data-control="gradient-start" type="color" value="${node.startColor}"></label><label><span>End</span><input data-control="gradient-end" type="color" value="${node.endColor}"></label><label><span>Angle</span><input data-control="gradient-angle" type="number" min="-360" max="360" value="${node.angle}"></label><button class="layer-toggle${node.radial?' active':''}" data-layer-action="gradient-radial">◉ <span>Radial</span></button></div>`;
  if (node.kind === 'correction') return `<div class="special-layer-properties"><label><span>Correction</span><select data-control="correction-type"><option value="brightness-contrast"${node.correctionType==='brightness-contrast'?' selected':''}>Brightness / Contrast</option><option value="hue-saturation"${node.correctionType==='hue-saturation'?' selected':''}>Hue / Saturation</option></select></label>${node.correctionType==='brightness-contrast'?`<label><span>Brightness</span><input data-control="correction-brightness" type="range" min="-100" max="100" value="${node.brightness}"></label><label><span>Contrast</span><input data-control="correction-contrast" type="range" min="-100" max="100" value="${node.contrast}"></label>`:`<label><span>Hue</span><input data-control="correction-hue" type="range" min="-180" max="180" value="${node.hue}"></label><label><span>Saturation</span><input data-control="correction-saturation" type="range" min="-100" max="100" value="${node.saturation}"></label>`}</div>`;
  if (node.kind === 'selection') return `<div class="special-layer-properties selection-layer-note">Selecting this layer recalls its stored selection mask.</div>`;
  return '';
}

export function layerPanelMarkup(state: LayerDocumentState): string {
  const active=findLayerNode(state,state.activeLayerId); const raster=isRaster(active)?active:null; const canEditRaster=raster?.kind==='raster'; const roots=getChildren(state,null).slice().reverse();
  const tags:LayerColorTag[]=['none','red','orange','yellow','green','blue','purple'];
  return `<div class="panel-heading compact-heading layer-panel-heading"><div><span class="eyebrow">DOCUMENT</span><h2>Layers</h2></div><span class="brush-engine-badge">V0.6.5</span></div>
    <div class="layer-search-row"><input data-control="layer-search" placeholder="Search layers" aria-label="Search layers"><button data-layer-action="flatten-visible" title="Flatten visible layers">Flatten</button></div>
    <div class="layer-filter-row"><select data-control="layer-kind-filter" aria-label="Filter layer kind"><option value="all">All kinds</option><option value="raster">Raster</option><option value="vector">Vector</option><option value="group">Folder</option><option value="fill">Fill</option><option value="gradient">Gradient</option><option value="correction">Correction</option><option value="selection">Selection</option><option value="text">Text</option><option value="balloon">Balloon</option><option value="panel">Panel</option><option value="screen-tone">Tone</option><option value="manga-effect">Effect</option><option value="material">Material</option></select><select data-control="layer-role-filter" aria-label="Filter layer role"><option value="all">All roles</option><option value="normal">Normal</option><option value="reference">Reference</option><option value="draft">Draft</option></select><select data-control="layer-tag-filter" aria-label="Filter layer color tag"><option value="all">All tags</option>${tags.filter((tag)=>tag!=='none').map((tag)=>`<option value="${tag}">${tag}</option>`).join('')}</select></div>
    <div class="layer-command-row" aria-label="Layer commands">
      <button class="layer-command primary" data-layer-action="add" title="New raster layer">＋</button><button class="layer-command" data-layer-action="add-vector" title="New vector layer">V＋</button><button class="layer-command" data-layer-action="group">▱</button><button class="layer-command" data-layer-action="duplicate">⧉</button><button class="layer-command" data-layer-action="move-up">↑</button><button class="layer-command" data-layer-action="move-down">↓</button><button class="layer-command" data-layer-action="merge">⇩</button><button class="layer-command danger" data-layer-action="delete">×</button>
    </div>
    <div class="layer-special-command-row"><button data-layer-action="add-fill">■ Fill</button><button data-layer-action="add-gradient">◩ Gradient</button><button data-layer-action="add-correction">◑ Correction</button><button data-layer-action="add-selection">S Selection</button></div>
    <div class="layer-stack" role="tree">${roots.map((node)=>renderNode(state,node,0)).join('')}</div>
    <div class="layer-properties"><label class="layer-name-field"><span>Name</span><input data-control="layer-name" value="${escapeHtml(active.name)}" ${active.kind==='background'?'disabled':''}></label>
      <div class="layer-property-grid"><label><span>Opacity</span><output data-output="layer-opacity">${Math.round(active.opacity*100)}%</output><input data-control="layer-opacity" type="range" min="0" max="100" value="${Math.round(active.opacity*100)}"></label><label><span>Blend</span><select data-control="blend-mode" ${active.kind==='background'||active.kind==='selection'?'disabled':''}>${(['normal','multiply','screen','overlay','add'] as const).map((mode)=>`<option value="${mode}"${active.blendMode===mode?' selected':''}>${mode==='add'?'Add (Glow)':mode[0]!.toUpperCase()+mode.slice(1)}</option>`).join('')}</select></label></div>
      ${specialProperties(active)}
      <div class="layer-role-row"><button class="layer-toggle${raster?.role==='reference'?' active':''}" data-layer-action="reference-role" ${canEditRaster?'':'disabled'}><b>R</b><span>Reference</span></button><button class="layer-toggle${raster?.role==='draft'?' active':''}" data-layer-action="draft-role" ${canEditRaster?'':'disabled'}><b>D</b><span>Draft</span></button><label class="layer-color-tag"><span>Tag</span><select data-control="color-tag">${tags.map((tag)=>`<option value="${tag}"${active.colorTag===tag?' selected':''}>${tag}</option>`).join('')}</select></label></div>
      <div class="layer-toggle-grid"><button class="layer-toggle${raster?.alphaLock?' active':''}" data-layer-action="alpha-lock" ${canEditRaster?'':'disabled'}><b>α</b><span>Lock alpha</span></button><button class="layer-toggle${raster?.clipping?' active':''}" data-layer-action="clipping" ${canEditRaster?'':'disabled'}><b>↳</b><span>Clip below</span></button><button class="layer-toggle${raster?.hasMask?' active':''}" data-layer-action="mask" ${canEditRaster?'':'disabled'}><b>M</b><span>${raster?.hasMask?'Remove mask':'Add mask'}</span></button>${raster?.hasMask?`<button class="layer-toggle${state.activeTarget==='mask'?' active':''}" data-layer-action="select-mask"><b>◐</b><span>${state.activeTarget==='mask'?'Editing mask':'Edit mask'}</span></button>`:'<button class="layer-toggle" disabled><b>◐</b><span>Edit mask</span></button>'}</div>
    </div>`;
}
