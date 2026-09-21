import type { BlendMode, LayerColorTag, LayerDocumentState, LayerRole, SpecialLayerPatch } from '../drawing/layers.js';
import { layerPanelMarkup } from './layerPanelMarkup.js';

export interface LayerPanelCallbacks {
  onAdd:()=>void; onAddVector:()=>void; onAddFill:()=>void; onAddGradient:()=>void; onAddCorrection:()=>void; onAddSelection:()=>void;
  onGroup:()=>void; onDuplicate:()=>void; onDelete:()=>void; onMergeDown:()=>void; onFlattenVisible:()=>void; onMove:(direction:'up'|'down')=>void;
  onSelect:(id:string)=>void; onVisibility:(id:string)=>void; onRename:(name:string)=>void; onOpacity:(opacity:number)=>void; onBlendMode:(mode:BlendMode)=>void;
  onAlphaLock:()=>void; onClipping:()=>void; onMask:()=>void; onSelectMask:(id?:string)=>void; onRole:(role:LayerRole)=>void; onColorTag:(tag:LayerColorTag)=>void; onSpecialPatch:(patch:SpecialLayerPatch)=>void;
}

export class LayerPanel {
  readonly element:HTMLElement; private state:LayerDocumentState; private readonly callbacks:LayerPanelCallbacks;
  private searchQuery=''; private kindFilter='all'; private roleFilter='all'; private tagFilter='all';
  constructor(state:LayerDocumentState,callbacks:LayerPanelCallbacks){this.state=state;this.callbacks=callbacks;this.element=document.createElement('section');this.element.className='panel layers-panel';this.render();}
  update(state:LayerDocumentState):void{this.state=state;this.render();}
  private render():void{
    this.element.innerHTML=layerPanelMarkup(this.state);
    const searchInput=this.element.querySelector<HTMLInputElement>('[data-control="layer-search"]'); if(searchInput)searchInput.value=this.searchQuery;
    const kindInput=this.element.querySelector<HTMLSelectElement>('[data-control="layer-kind-filter"]'); if(kindInput)kindInput.value=this.kindFilter;
    const roleInput=this.element.querySelector<HTMLSelectElement>('[data-control="layer-role-filter"]'); if(roleInput)roleInput.value=this.roleFilter;
    const tagInput=this.element.querySelector<HTMLSelectElement>('[data-control="layer-tag-filter"]'); if(tagInput)tagInput.value=this.tagFilter;
    this.element.querySelectorAll<HTMLElement>('[data-layer-action]').forEach((control)=>control.addEventListener('click',(event)=>{event.stopPropagation();const action=control.dataset.layerAction;const layerId=control.dataset.layerId;switch(action){
      case'add':this.callbacks.onAdd();break;case'add-vector':this.callbacks.onAddVector();break;case'add-fill':this.callbacks.onAddFill();break;case'add-gradient':this.callbacks.onAddGradient();break;case'add-correction':this.callbacks.onAddCorrection();break;case'add-selection':this.callbacks.onAddSelection();break;
      case'group':this.callbacks.onGroup();break;case'duplicate':this.callbacks.onDuplicate();break;case'delete':this.callbacks.onDelete();break;case'merge':this.callbacks.onMergeDown();break;case'flatten-visible':this.callbacks.onFlattenVisible();break;case'move-up':this.callbacks.onMove('up');break;case'move-down':this.callbacks.onMove('down');break;
      case'select':if(layerId)this.callbacks.onSelect(layerId);break;case'visibility':if(layerId)this.callbacks.onVisibility(layerId);break;case'alpha-lock':this.callbacks.onAlphaLock();break;case'clipping':this.callbacks.onClipping();break;case'mask':this.callbacks.onMask();break;case'select-mask':this.callbacks.onSelectMask(layerId);break;
      case'reference-role':this.callbacks.onRole('reference');break;case'draft-role':this.callbacks.onRole('draft');break;case'gradient-radial':{const active=this.state.nodes.find((node)=>node.id===this.state.activeLayerId);if(active?.kind==='gradient')this.callbacks.onSpecialPatch({radial:!active.radial});break;}
    }}));
    const bindInput=<T extends HTMLInputElement|HTMLSelectElement>(selector:string,eventName:'input'|'change',fn:(el:T)=>void):void=>{const el=this.element.querySelector<T>(selector);el?.addEventListener(eventName,()=>fn(el));};
    bindInput<HTMLInputElement>('[data-control="layer-name"]','change',(el)=>this.callbacks.onRename(el.value));
    bindInput<HTMLInputElement>('[data-control="layer-opacity"]','input',(el)=>this.callbacks.onOpacity(Number(el.value)/100));
    bindInput<HTMLSelectElement>('[data-control="blend-mode"]','change',(el)=>this.callbacks.onBlendMode(el.value as BlendMode));
    bindInput<HTMLSelectElement>('[data-control="color-tag"]','change',(el)=>this.callbacks.onColorTag(el.value as LayerColorTag));
    bindInput<HTMLInputElement>('[data-control="special-color"]','input',(el)=>this.callbacks.onSpecialPatch({color:el.value}));
    bindInput<HTMLInputElement>('[data-control="gradient-start"]','input',(el)=>this.callbacks.onSpecialPatch({startColor:el.value}));
    bindInput<HTMLInputElement>('[data-control="gradient-end"]','input',(el)=>this.callbacks.onSpecialPatch({endColor:el.value}));
    bindInput<HTMLInputElement>('[data-control="gradient-angle"]','input',(el)=>this.callbacks.onSpecialPatch({angle:Number(el.value)}));
    bindInput<HTMLSelectElement>('[data-control="correction-type"]','change',(el)=>this.callbacks.onSpecialPatch({correctionType:el.value as 'brightness-contrast'|'hue-saturation'}));
    bindInput<HTMLInputElement>('[data-control="correction-brightness"]','input',(el)=>this.callbacks.onSpecialPatch({brightness:Number(el.value)}));
    bindInput<HTMLInputElement>('[data-control="correction-contrast"]','input',(el)=>this.callbacks.onSpecialPatch({contrast:Number(el.value)}));
    bindInput<HTMLInputElement>('[data-control="correction-hue"]','input',(el)=>this.callbacks.onSpecialPatch({hue:Number(el.value)}));
    bindInput<HTMLInputElement>('[data-control="correction-saturation"]','input',(el)=>this.callbacks.onSpecialPatch({saturation:Number(el.value)}));
    const applyFilters=():void=>{this.element.querySelectorAll<HTMLElement>('.layer-tree-item').forEach((row)=>{const queryMatch=!this.searchQuery||(row.dataset.layerSearchText??'').includes(this.searchQuery);const kindMatch=this.kindFilter==='all'||row.dataset.layerKind===this.kindFilter;const roleMatch=this.roleFilter==='all'||row.dataset.layerRole===this.roleFilter;const tagMatch=this.tagFilter==='all'||row.dataset.layerColorTag===this.tagFilter;row.hidden=!(queryMatch&&kindMatch&&roleMatch&&tagMatch);});};
    const search=this.element.querySelector<HTMLInputElement>('[data-control="layer-search"]'); search?.addEventListener('input',()=>{this.searchQuery=search.value.trim().toLowerCase();applyFilters();});
    kindInput?.addEventListener('change',()=>{this.kindFilter=kindInput.value;applyFilters();});
    roleInput?.addEventListener('change',()=>{this.roleFilter=roleInput.value;applyFilters();});
    tagInput?.addEventListener('change',()=>{this.tagFilter=tagInput.value;applyFilters();});
    applyFilters();
  }
}
