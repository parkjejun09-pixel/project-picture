import { getBrushPreset, type BrushPreset } from '../drawing/brushPresets.js';
import { parseCustomBrush, serializeCustomBrush } from '../drawing/brushLibrary.js';
import { pressureCurvePath } from '../drawing/pressure.js';
import { brushPreviewSvg } from '../drawing/brushPreview.js';
import { textureMapFromRgba, type BrushTextureMap } from '../drawing/advancedBrush.js';
import type { EditorState } from '../editor/types.js';
import { pressureResponseLabel } from './brushPanelMarkup.js';

export interface BrushStudioCallbacks {
  onPressureResponse:(v:number)=>void; onPressureSize:(v:number)=>void; onPressureOpacity:(v:number)=>void; onTiltInfluence:(v:number)=>void; onSpacing:(v:number)=>void;
  onFlow:(v:number)=>void; onVelocitySize:(v:number)=>void; onRotation:(v:number)=>void; onTaper:(v:number)=>void; onTaperStart:(v:number)=>void; onTaperEnd:(v:number)=>void; onTaperLength:(v:number)=>void; onScatter:(v:number)=>void; onSizeJitter:(v:number)=>void; onAngleJitter:(v:number)=>void; onColorJitter:(v:number)=>void; onGrain:(v:number)=>void; onTextureStrength:(v:number)=>void; onTextureScale:(v:number)=>void; onTextureRotation:(v:number)=>void; onPaperGrain:(v:number)=>void; onDualBrush:(v:number)=>void; onWetMix:(v:number)=>void;
  onTextureMap:(map:BrushTextureMap|null)=>void;
  onImportPreset:(preset:BrushPreset)=>void;
}

export class BrushStudioPanel {
  readonly element: HTMLElement;
  private state: EditorState;
  constructor(state:EditorState, callbacks:BrushStudioCallbacks){
    this.state=state;
    this.element=document.createElement('section'); this.element.className='panel brush-studio-panel'; this.element.dataset.advancedOnly='';
    const slider=(key:string,label:string)=>`<label><span>${label}</span><output data-studio-output="${key}"></output><input data-studio-control="${key}" type="range" min="0" max="100"></label>`;
    this.element.innerHTML=`<div class="panel-heading compact-heading"><div><span class="eyebrow">BRUSH ENGINE</span><h2>Brush Studio</h2></div><span class="workspace-badge">ADV</span></div>
      <div class="studio-brush-summary"><span class="studio-brush-preview"></span><div><strong data-studio-preset></strong><small data-studio-description></small></div></div>
      <div class="brush-preview-pad" data-brush-preview-pad><div class="brush-preview-paper"><div data-studio-preview-art></div></div><small>Live feel preview · pressure / taper / texture</small></div>
      <div class="studio-curve-card"><div class="studio-curve-header"><span>Pressure response</span><b data-studio-pressure-label></b></div><svg viewBox="0 0 148 72" preserveAspectRatio="none"><path class="curve-grid" d="M0 100 L240 0 M0 50 H240 M120 0 V100"></path><path class="curve-line" data-studio-pressure-curve></path></svg><input data-studio-control="pressure-response" type="range" min="-100" max="100"></div>
      <div class="palette-subheading"><span>STROKE</span><small>Dynamics</small></div><div class="studio-dynamics-grid">${slider('pressure-size','Size pressure')}${slider('pressure-opacity','Opacity pressure')}${slider('tilt-influence','Tilt influence')}${slider('spacing','Spacing')}${slider('flow','Flow')}${slider('velocity-size','Velocity size')}${slider('rotation','Rotation')}</div>
      <div class="palette-subheading"><span>TAPER</span><small>Start / End</small></div><div class="studio-dynamics-grid">${slider('taper-start','Start taper')}${slider('taper-end','End taper')}${slider('taper-length','Taper length')}</div>
      <div class="palette-subheading"><span>SHAPE / TEXTURE</span><small>Advanced</small></div><div class="studio-dynamics-grid">${slider('scatter','Scatter')}${slider('size-jitter','Size jitter')}${slider('angle-jitter','Angle jitter')}${slider('color-jitter','Color jitter')}${slider('grain','Grain')}${slider('texture-strength','Texture strength')}${slider('texture-scale','Texture scale')}${slider('texture-rotation','Texture rotation')}${slider('paper-grain','Paper grain')}${slider('dual-brush','Dual brush')}${slider('wet-mix','Wet mixing')}</div>
      <div class="brush-texture-image-actions"><label>Import texture<input data-texture-image-import type="file" accept="image/png,image/jpeg,image/webp,image/*" hidden></label><button type="button" data-texture-image-clear>Clear texture</button><small data-texture-image-status>Procedural texture</small></div>
      <div class="brush-file-actions"><button type="button" data-brush-export>Export .drawbrush</button><label>Import .drawbrush<input data-brush-import type="file" accept=".drawbrush,application/json" hidden></label></div>`;
    const bind=(key:string,cb:(v:number)=>void,scale=100)=>this.element.querySelector<HTMLInputElement>(`[data-studio-control="${key}"]`)?.addEventListener('input',e=>cb(Number((e.currentTarget as HTMLInputElement).value)/scale));
    bind('pressure-response',callbacks.onPressureResponse); bind('pressure-size',callbacks.onPressureSize); bind('pressure-opacity',callbacks.onPressureOpacity); bind('tilt-influence',callbacks.onTiltInfluence); bind('spacing',callbacks.onSpacing,1);
    bind('flow',callbacks.onFlow);bind('velocity-size',callbacks.onVelocitySize);bind('rotation',callbacks.onRotation);bind('taper-start',callbacks.onTaperStart);bind('taper-end',callbacks.onTaperEnd);bind('taper-length',(v)=>callbacks.onTaperLength(.02+v*.48));bind('scatter',callbacks.onScatter);bind('size-jitter',callbacks.onSizeJitter);bind('angle-jitter',callbacks.onAngleJitter);bind('color-jitter',callbacks.onColorJitter);bind('grain',callbacks.onGrain);bind('texture-strength',callbacks.onTextureStrength);bind('texture-scale',(v)=>callbacks.onTextureScale(.15+v*7.85));bind('texture-rotation',callbacks.onTextureRotation);bind('paper-grain',callbacks.onPaperGrain);bind('dual-brush',callbacks.onDualBrush);bind('wet-mix',callbacks.onWetMix);
    this.element.querySelector<HTMLButtonElement>('[data-brush-export]')?.addEventListener('click',()=>{
      const base=getBrushPreset(this.state.brushPreset);
      const preset:BrushPreset={...base,label:`${base.label} Custom`,size:this.state.brushSize,opacity:this.state.opacity,spacing:this.state.spacing,stabilizer:this.state.stabilizer,pressureResponse:this.state.pressureResponse,pressureSize:this.state.pressureSize,pressureOpacity:this.state.pressureOpacity,tiltInfluence:this.state.tiltInfluence,flow:this.state.flow,velocitySize:this.state.velocitySize,rotation:this.state.brushRotation,taper:this.state.taper,taperStart:this.state.taperStart,taperEnd:this.state.taperEnd,taperLength:this.state.taperLength,scatter:this.state.scatter,sizeJitter:this.state.sizeJitter,angleJitter:this.state.angleJitter,colorJitter:this.state.colorJitter,grain:this.state.grain,textureStrength:this.state.textureStrength,textureScale:this.state.textureScale,textureRotation:this.state.textureRotation,paperGrain:this.state.paperGrain,dualBrush:this.state.dualBrush,wetMix:this.state.wetMix};
      const blob=new Blob([serializeCustomBrush(preset)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${base.id}-custom.drawbrush`; a.click(); URL.revokeObjectURL(url);
    });
    this.element.querySelector<HTMLInputElement>('[data-texture-image-import]')?.addEventListener('change',async(event)=>{
      const input=event.currentTarget as HTMLInputElement; const file=input.files?.[0]; if(!file)return;
      try {
        const bitmap=await createImageBitmap(file); const max=256; const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
        const width=Math.max(1,Math.round(bitmap.width*scale)); const height=Math.max(1,Math.round(bitmap.height*scale));
        const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height; const context=canvas.getContext('2d',{alpha:true});
        if(context){ context.drawImage(bitmap,0,0,width,height); const image=context.getImageData(0,0,width,height); callbacks.onTextureMap(textureMapFromRgba(image.data,width,height)); }
        bitmap.close?.();
      } finally { input.value=''; }
    });
    this.element.querySelector<HTMLButtonElement>('[data-texture-image-clear]')?.addEventListener('click',()=>callbacks.onTextureMap(null));
    this.element.querySelector<HTMLInputElement>('[data-brush-import]')?.addEventListener('change',async(event)=>{ const file=(event.currentTarget as HTMLInputElement).files?.[0]; if(!file)return; const preset=parseCustomBrush(await file.text()); if(preset)callbacks.onImportPreset(preset); (event.currentTarget as HTMLInputElement).value=''; });
    this.update(state);
  }
  update(state:EditorState):void{
    this.state=state;
    const preset=getBrushPreset(state.brushPreset); const name=this.element.querySelector<HTMLElement>('[data-studio-preset]'); const desc=this.element.querySelector<HTMLElement>('[data-studio-description]'); if(name)name.textContent=preset.label;if(desc)desc.textContent=preset.description;
    const previewPreset:BrushPreset={...preset,size:state.brushSize,opacity:state.opacity,spacing:state.spacing,stabilizer:state.stabilizer,pressureResponse:state.pressureResponse,pressureSize:state.pressureSize,pressureOpacity:state.pressureOpacity,tiltInfluence:state.tiltInfluence,flow:state.flow,velocitySize:state.velocitySize,rotation:state.brushRotation,taper:state.taper,taperStart:state.taperStart,taperEnd:state.taperEnd,taperLength:state.taperLength,scatter:state.scatter,sizeJitter:state.sizeJitter,angleJitter:state.angleJitter,colorJitter:state.colorJitter,grain:state.grain,textureStrength:state.textureStrength,textureScale:state.textureScale,textureRotation:state.textureRotation,paperGrain:state.paperGrain,dualBrush:state.dualBrush,wetMix:state.wetMix};
    const preview=this.element.querySelector<HTMLElement>('[data-studio-preview-art]'); if(preview)preview.innerHTML=brushPreviewSvg(previewPreset,320,92);
    this.element.querySelector<SVGPathElement>('[data-studio-pressure-curve]')?.setAttribute('d',pressureCurvePath(state.pressureResponse)); const label=this.element.querySelector<HTMLElement>('[data-studio-pressure-label]');if(label)label.textContent=pressureResponseLabel(state.pressureResponse);
    const set=(key:string,value:number,label:string)=>{const input=this.element.querySelector<HTMLInputElement>(`[data-studio-control="${key}"]`);const out=this.element.querySelector<HTMLOutputElement>(`[data-studio-output="${key}"]`);if(input)input.value=String(value);if(out)out.value=label;};
    set('pressure-response',Math.round(state.pressureResponse*100),pressureResponseLabel(state.pressureResponse));
    for(const [key,value] of [['pressure-size',state.pressureSize],['pressure-opacity',state.pressureOpacity],['tilt-influence',state.tiltInfluence],['flow',state.flow],['velocity-size',state.velocitySize],['taper-start',state.taperStart],['taper-end',state.taperEnd],['scatter',state.scatter],['size-jitter',state.sizeJitter],['angle-jitter',state.angleJitter],['color-jitter',state.colorJitter],['grain',state.grain],['texture-strength',state.textureStrength],['texture-rotation',state.textureRotation],['paper-grain',state.paperGrain],['dual-brush',state.dualBrush],['wet-mix',state.wetMix]] as const)set(key,Math.round(value*100),`${Math.round(value*100)}%`);
    set('taper-length',Math.round(((state.taperLength-.02)/.48)*100),`${Math.round(state.taperLength*100)}% stroke`); set('texture-scale',Math.round(((state.textureScale-.15)/7.85)*100),`${state.textureScale.toFixed(2)}×`);
    set('rotation',Math.round(state.brushRotation*100),`${Math.round(state.brushRotation*360)}°`); set('spacing',state.spacing,`${Math.round(state.spacing)}%`);
    const textureStatus=this.element.querySelector<HTMLElement>('[data-texture-image-status]'); if(textureStatus)textureStatus.textContent=state.brushTextureMap?`Image texture · ${state.brushTextureMap.width}×${state.brushTextureMap.height}`:'Procedural texture';
  }
}
