import type { BrushPreset } from './brushPresets.js';

export interface BrushPreviewMark {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  opacity: number;
  rotation: number;
}
export interface BrushPreviewModel { width: number; height: number; marks: BrushPreviewMark[]; }

function pseudo(seed:number):number { const value=Math.sin(seed*91.171+17.313)*43758.5453; return value-Math.floor(value); }

export function buildBrushPreviewModel(preset: BrushPreset, width=132, height=34): BrushPreviewModel {
  const spray = preset.id === 'spray';
  const count = spray ? 88 : preset.id === 'airbrush' ? 46 : preset.id === 'watercolor' ? 42 : 34;
  const marks: BrushPreviewMark[]=[];
  for(let i=0;i<count;i+=1){
    const t=i/(count-1);
    const seed=i+1;
    const pressure=.22+.78*Math.sin(Math.PI*t);
    const taperStart=(preset.taperStart ?? preset.taper);
    const taperEnd=(preset.taperEnd ?? preset.taper);
    const length=Math.max(.05,preset.taperLength ?? .2);
    const startRamp=Math.min(1,t/length), endRamp=Math.min(1,(1-t)/length);
    const taper=Math.min(1-taperStart*(1-startRamp),1-taperEnd*(1-endRamp));
    const jitter=(pseudo(seed)-.5)*preset.sizeJitter*.8;
    const base=Math.max(1.1, Math.min(8, preset.size*.075));
    const radius=base*Math.max(.15,pressure*(1-preset.pressureSize*.55))*Math.max(.08,taper)*(1+jitter);
    const scatter=(pseudo(seed+20)-.5)*preset.scatter*height*.78;
    const x=7+t*(width-14)+(spray?(pseudo(seed+40)-.5)*24:0);
    const y=height*.52+Math.sin(t*Math.PI*2.1)*2.8+scatter;
    const texture=(preset.textureStrength ?? preset.grain);
    let opacity=Math.max(.04,Math.min(1,preset.opacity*preset.flow*(.62+.38*pressure)*(1-texture*.28*pseudo(seed+80))));
    if(preset.id==='watercolor') opacity*=.62;
    if(preset.id==='airbrush') opacity*=.48;
    if(spray) opacity*=.58;
    marks.push({x,y,radiusX:spray?Math.max(.5,radius*.42):radius*(1+preset.tiltInfluence*.25),radiusY:spray?Math.max(.5,radius*.3):Math.max(.65,radius*(.6+preset.hardness*.35)),opacity,rotation:preset.rotation*Math.PI*2+(pseudo(seed+120)-.5)*preset.angleJitter*Math.PI});
  }
  return {width,height,marks};
}

export function brushPreviewSvg(preset: BrushPreset, width=132, height=34): string {
  const model=buildBrushPreviewModel(preset,width,height);
  const marks=model.marks.map((mark)=>`<ellipse cx="${mark.x.toFixed(1)}" cy="${mark.y.toFixed(1)}" rx="${mark.radiusX.toFixed(1)}" ry="${mark.radiusY.toFixed(1)}" opacity="${mark.opacity.toFixed(3)}" transform="rotate(${(mark.rotation*180/Math.PI).toFixed(1)} ${mark.x.toFixed(1)} ${mark.y.toFixed(1)})"></ellipse>`).join('');
  return `<svg class="brush-preview-surface" data-brush-preview viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><g>${marks}</g></svg>`;
}
