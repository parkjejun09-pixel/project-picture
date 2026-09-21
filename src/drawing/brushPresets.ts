export type BrushPresetId = 'pencil' | 'inking' | 'marker' | 'airbrush' | 'watercolor' | 'oil' | 'chalk' | 'spray';
export type BrushCategory = 'Sketch' | 'Ink' | 'Paint' | 'Texture' | 'Effects';

export interface BrushPreset {
  id: BrushPresetId;
  label: string;
  description: string;
  category: BrushCategory;
  tags: string[];
  size: number;
  opacity: number;
  spacing: number;
  stabilizer: number;
  pressureResponse: number;
  pressureSize: number;
  pressureOpacity: number;
  tiltInfluence: number;
  hardness: number;
  flow: number;
  velocitySize: number;
  rotation: number;
  taper: number;
  taperStart: number;
  taperEnd: number;
  taperLength: number;
  scatter: number;
  sizeJitter: number;
  angleJitter: number;
  colorJitter: number;
  grain: number;
  textureStrength: number;
  textureScale: number;
  textureRotation: number;
  paperGrain: number;
  dualBrush: number;
  wetMix: number;
}

export const BRUSH_PRESETS: readonly BrushPreset[] = [
  { id:'pencil',label:'Pencil',description:'Pressure-rich sketching',category:'Sketch',tags:['graphite','texture','sketch'],size:12,opacity:.72,spacing:8,stabilizer:18,pressureResponse:.22,pressureSize:.58,pressureOpacity:.72,tiltInfluence:.86,hardness:.72,flow:.76,velocitySize:.08,rotation:0,taper:.18,taperStart:0.42,taperEnd:0.18,taperLength:0.24,scatter:.04,sizeJitter:.07,angleJitter:.04,colorJitter:0,grain:.36,textureStrength:0.68,textureScale:1.15,textureRotation:0.03,paperGrain:0.52,dualBrush:.08,wetMix:0 },
  { id:'inking',label:'Inking Pen',description:'Clean responsive line art',category:'Ink',tags:['line','clean','comic'],size:18,opacity:1,spacing:6,stabilizer:30,pressureResponse:.12,pressureSize:.8,pressureOpacity:.14,tiltInfluence:.08,hardness:1,flow:1,velocitySize:.12,rotation:0,taper:.48,taperStart:0.72,taperEnd:0.76,taperLength:0.22,scatter:0,sizeJitter:0,angleJitter:0,colorJitter:0,grain:0,textureStrength:0.04,textureScale:0.9,textureRotation:0,paperGrain:0,dualBrush:0,wetMix:0 },
  { id:'marker',label:'Marker',description:'Broad controlled strokes',category:'Paint',tags:['marker','flat'],size:44,opacity:.62,spacing:5,stabilizer:22,pressureResponse:.08,pressureSize:.2,pressureOpacity:.38,tiltInfluence:.18,hardness:.94,flow:.72,velocitySize:.04,rotation:0,taper:.05,taperStart:0.08,taperEnd:0.05,taperLength:0.18,scatter:0,sizeJitter:.02,angleJitter:.02,colorJitter:.02,grain:.04,textureStrength:0.08,textureScale:1.1,textureRotation:0,paperGrain:0.05,dualBrush:0,wetMix:.05 },
  { id:'airbrush',label:'Soft Airbrush',description:'Soft tone and shading',category:'Effects',tags:['soft','shade','air'],size:84,opacity:.24,spacing:4,stabilizer:12,pressureResponse:.3,pressureSize:.32,pressureOpacity:.7,tiltInfluence:0,hardness:.12,flow:.34,velocitySize:0,rotation:0,taper:0,taperStart:0,taperEnd:0,taperLength:0.2,scatter:.02,sizeJitter:.04,angleJitter:0,colorJitter:0,grain:.03,textureStrength:0.04,textureScale:1.6,textureRotation:0,paperGrain:0.03,dualBrush:0,wetMix:0 },
  { id:'watercolor',label:'Watercolor',description:'Wet transparent color mixing',category:'Paint',tags:['water','wet','mix','paint'],size:58,opacity:.42,spacing:5,stabilizer:14,pressureResponse:.18,pressureSize:.45,pressureOpacity:.62,tiltInfluence:.24,hardness:.28,flow:.48,velocitySize:.14,rotation:0,taper:.12,taperStart:0.14,taperEnd:0.28,taperLength:0.3,scatter:.03,sizeJitter:.05,angleJitter:.03,colorJitter:.06,grain:.2,textureStrength:0.42,textureScale:1.85,textureRotation:0.04,paperGrain:0.46,dualBrush:.12,wetMix:.72 },
  { id:'oil',label:'Oil Paint',description:'Opaque textured wet paint',category:'Paint',tags:['oil','wet','impasto','paint'],size:48,opacity:.9,spacing:4,stabilizer:10,pressureResponse:.05,pressureSize:.42,pressureOpacity:.14,tiltInfluence:.3,hardness:.64,flow:.82,velocitySize:.1,rotation:0,taper:.04,taperStart:0.08,taperEnd:0.12,taperLength:0.22,scatter:.02,sizeJitter:.04,angleJitter:.03,colorJitter:.04,grain:.26,textureStrength:0.5,textureScale:0.82,textureRotation:0.08,paperGrain:0.32,dualBrush:.16,wetMix:.58 },
  { id:'chalk',label:'Chalk',description:'Dry textured drawing grain',category:'Texture',tags:['chalk','dry','texture','grain'],size:34,opacity:.7,spacing:10,stabilizer:8,pressureResponse:.12,pressureSize:.38,pressureOpacity:.48,tiltInfluence:.44,hardness:.76,flow:.68,velocitySize:.08,rotation:0,taper:.1,taperStart:0.18,taperEnd:0.12,taperLength:0.3,scatter:.18,sizeJitter:.2,angleJitter:.18,colorJitter:.04,grain:.78,textureStrength:0.92,textureScale:0.7,textureRotation:0.11,paperGrain:0.62,dualBrush:.42,wetMix:0 },
  { id:'spray',label:'Spray',description:'Scattered particle spray',category:'Effects',tags:['spray','scatter','particle'],size:72,opacity:.34,spacing:9,stabilizer:0,pressureResponse:0,pressureSize:.15,pressureOpacity:.4,tiltInfluence:0,hardness:.85,flow:.38,velocitySize:0,rotation:0,taper:0,taperStart:0,taperEnd:0,taperLength:0.22,scatter:.92,sizeJitter:.62,angleJitter:1,colorJitter:.08,grain:.3,textureStrength:0.52,textureScale:0.55,textureRotation:0,paperGrain:0.12,dualBrush:.25,wetMix:0 }
];

export function getBrushPreset(id: BrushPresetId): BrushPreset {
  return BRUSH_PRESETS.find((preset)=>preset.id===id) ?? BRUSH_PRESETS[1]!;
}
