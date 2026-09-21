import {
  cloneEditableLayerData,
  isEditableLayerKind,
  validateEditableLayerData,
  type EditableLayerData,
  type EditableLayerKind,
  type EditableLayerPatch
} from './editableLayers.js';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'add';
export type ActiveLayerTarget = 'content' | 'mask';
export type LayerNodeKind = 'raster' | 'background' | 'vector' | 'group' | 'fill' | 'gradient' | 'correction' | 'selection' | EditableLayerKind;
export type LayerRole = 'normal' | 'reference' | 'draft';
export type LayerColorTag = 'none' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
export type CorrectionType = 'brightness-contrast' | 'hue-saturation';

interface LayerNodeBase {
  id: string;
  name: string;
  kind: LayerNodeKind;
  parentId: string | null;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
  colorTag: LayerColorTag;
}

export interface RasterLayerNode extends LayerNodeBase {
  kind: 'raster' | 'background';
  alphaLock: boolean;
  clipping: boolean;
  hasMask: boolean;
  role: LayerRole;
}

export interface VectorLayerNode extends LayerNodeBase { kind: 'vector'; }
export interface GroupLayerNode extends LayerNodeBase { kind: 'group'; expanded: boolean; }
export interface FillLayerNode extends LayerNodeBase { kind: 'fill'; color: string; }
export interface GradientLayerNode extends LayerNodeBase {
  kind: 'gradient'; startColor: string; endColor: string; angle: number; radial: boolean;
}
export interface CorrectionLayerNode extends LayerNodeBase {
  kind: 'correction'; correctionType: CorrectionType; brightness: number; contrast: number; hue: number; saturation: number;
}
export interface SelectionLayerNode extends LayerNodeBase { kind: 'selection'; }
export type EditableLayerNode = LayerNodeBase & EditableLayerData;
export type SpecialLayerNode = FillLayerNode | GradientLayerNode | CorrectionLayerNode | SelectionLayerNode;
export type LayerNode = RasterLayerNode | VectorLayerNode | GroupLayerNode | SpecialLayerNode | EditableLayerNode;

export function isEditableLayerNode(node: LayerNode): node is EditableLayerNode {
  return isEditableLayerKind(node.kind);
}

export interface LayerDocumentState {
  nodes: LayerNode[];
  activeLayerId: string;
  activeTarget: ActiveLayerTarget;
  nextRasterNumber: number;
  nextVectorNumber: number;
  nextGroupNumber: number;
  nextSpecialNumber: number;
}

export interface DuplicateLayerResult { state: LayerDocumentState; idMap: Map<string, string>; }
export interface LayerFilter { query?: string; kind?: LayerNodeKind; role?: LayerRole; colorTag?: LayerColorTag; }
export interface SpecialLayerPatch {
  color?: string; startColor?: string; endColor?: string; angle?: number; radial?: boolean;
  correctionType?: CorrectionType; brightness?: number; contrast?: number; hue?: number; saturation?: number;
}

export function cloneLayerNode<T extends LayerNode>(node: T): T {
  if (!isEditableLayerNode(node)) return { ...node } as T;
  return { ...node, ...cloneEditableLayerData(node) } as T;
}
export function cloneLayerDocumentState(state: LayerDocumentState): LayerDocumentState {
  return { ...state, nodes: state.nodes.map(cloneLayerNode) };
}
function clamp01(value: number): number { if (!Number.isFinite(value)) return 1; return Math.min(1, Math.max(0, value)); }
function clamp(value: number, min: number, max: number): number { if (!Number.isFinite(value)) return min; return Math.max(min, Math.min(max, value)); }
function isRaster(node: LayerNode): node is RasterLayerNode { return node.kind === 'raster' || node.kind === 'background'; }
function isSpecial(node: LayerNode): node is SpecialLayerNode { return node.kind === 'fill' || node.kind === 'gradient' || node.kind === 'correction' || node.kind === 'selection'; }

export function createInitialLayerDocument(): LayerDocumentState {
  return {
    nodes: [
      { id:'background',name:'Background',kind:'background',parentId:null,visible:true,opacity:1,blendMode:'normal',locked:true,colorTag:'none',alphaLock:true,clipping:false,hasMask:false,role:'normal' },
      { id:'paint-1',name:'Paint Layer 1',kind:'raster',parentId:null,visible:true,opacity:1,blendMode:'normal',locked:false,colorTag:'none',alphaLock:false,clipping:false,hasMask:false,role:'normal' }
    ],
    activeLayerId:'paint-1', activeTarget:'content', nextRasterNumber:2, nextVectorNumber:1, nextGroupNumber:1, nextSpecialNumber:1
  };
}

export function findLayerNode(state: LayerDocumentState, id: string): LayerNode {
  const node=state.nodes.find((candidate)=>candidate.id===id); if(!node) throw new Error(`Layer node not found: ${id}`); return node;
}
export function getChildren(state: LayerDocumentState, parentId: string | null): LayerNode[] { return state.nodes.filter((node)=>node.parentId===parentId); }
export function isLayerExportable(node: LayerNode): boolean { return !(isRaster(node) && node.kind === 'raster' && node.role === 'draft'); }

function indexAfterSibling(state: LayerDocumentState, node: LayerNode): number {
  const siblings=getChildren(state,node.parentId); const siblingIndex=siblings.findIndex((sibling)=>sibling.id===node.id);
  if(siblingIndex<0||siblingIndex===siblings.length-1)return state.nodes.length;
  const nextSibling=siblings[siblingIndex+1]!; return state.nodes.findIndex((candidate)=>candidate.id===nextSibling.id);
}
function insertionContext(state: LayerDocumentState): { active: LayerNode; parentId: string|null; insertIndex:number } {
  const active=findLayerNode(state,state.activeLayerId); const parentId=active.kind==='group'?active.id:active.parentId;
  let insertIndex=state.nodes.length; if(active.kind!=='group'&&active.parentId===parentId)insertIndex=indexAfterSibling(state,active);
  return {active,parentId,insertIndex};
}

export function addRasterLayer(state: LayerDocumentState): LayerDocumentState {
  const {parentId,insertIndex}=insertionContext(state); const id=`paint-${state.nextRasterNumber}`;
  const node:RasterLayerNode={id,name:`Paint Layer ${state.nextRasterNumber}`,kind:'raster',parentId,visible:true,opacity:1,blendMode:'normal',locked:false,colorTag:'none',alphaLock:false,clipping:false,hasMask:false,role:'normal'};
  const nodes=state.nodes.slice(); nodes.splice(insertIndex,0,node);
  return {...state,nodes,activeLayerId:id,activeTarget:'content',nextRasterNumber:state.nextRasterNumber+1};
}

export function addVectorLayer(state: LayerDocumentState): LayerDocumentState {
  const {parentId,insertIndex}=insertionContext(state); const id=`vector-${state.nextVectorNumber}`;
  const node:VectorLayerNode={id,name:`Vector Layer ${state.nextVectorNumber}`,kind:'vector',parentId,visible:true,opacity:1,blendMode:'normal',locked:false,colorTag:'none'};
  const nodes=state.nodes.slice(); nodes.splice(insertIndex,0,node);
  return {...state,nodes,activeLayerId:id,activeTarget:'content',nextVectorNumber:state.nextVectorNumber+1};
}

function addSpecial(state: LayerDocumentState, node: SpecialLayerNode): LayerDocumentState {
  const {insertIndex}=insertionContext(state); const nodes=state.nodes.slice(); nodes.splice(insertIndex,0,node);
  return {...state,nodes,activeLayerId:node.id,activeTarget:'content',nextSpecialNumber:state.nextSpecialNumber+1};
}
export function addFillLayer(state: LayerDocumentState, color='#808080'): LayerDocumentState {
  const {parentId}=insertionContext(state); const n=state.nextSpecialNumber;
  return addSpecial(state,{id:`fill-${n}`,name:`Fill Layer ${n}`,kind:'fill',parentId,visible:true,opacity:1,blendMode:'normal',locked:false,colorTag:'none',color});
}
export function addGradientLayer(state: LayerDocumentState, startColor='#000000', endColor='#FFFFFF'): LayerDocumentState {
  const {parentId}=insertionContext(state); const n=state.nextSpecialNumber;
  return addSpecial(state,{id:`gradient-${n}`,name:`Gradient Layer ${n}`,kind:'gradient',parentId,visible:true,opacity:1,blendMode:'normal',locked:false,colorTag:'none',startColor,endColor,angle:0,radial:false});
}
export function addCorrectionLayer(state: LayerDocumentState, correctionType: CorrectionType='brightness-contrast'): LayerDocumentState {
  const {parentId}=insertionContext(state); const n=state.nextSpecialNumber;
  return addSpecial(state,{id:`correction-${n}`,name:correctionType==='hue-saturation'?`Hue / Saturation ${n}`:`Brightness / Contrast ${n}`,kind:'correction',parentId,visible:true,opacity:1,blendMode:'normal',locked:false,colorTag:'none',correctionType,brightness:0,contrast:0,hue:0,saturation:0});
}
export function addSelectionLayer(state: LayerDocumentState): LayerDocumentState {
  const {parentId}=insertionContext(state); const n=state.nextSpecialNumber;
  return addSpecial(state,{id:`selection-${n}`,name:`Selection Layer ${n}`,kind:'selection',parentId,visible:true,opacity:1,blendMode:'normal',locked:false,colorTag:'none'});
}

const EDITABLE_LAYER_NAMES: Record<EditableLayerKind, string> = {
  text: 'Text', balloon: 'Balloon', panel: 'Panel', 'screen-tone': 'Screen Tone',
  'manga-effect': 'Manga Effect', material: 'Material'
};

export function addEditableLayer(state: LayerDocumentState, data: EditableLayerData): LayerDocumentState {
  const valid = cloneEditableLayerData(validateEditableLayerData(data));
  const { parentId, insertIndex } = insertionContext(state);
  const number = state.nextSpecialNumber;
  const id = `${valid.kind}-${number}`;
  const node = {
    id, name: `${EDITABLE_LAYER_NAMES[valid.kind]} ${number}`, parentId,
    visible: true, opacity: 1, blendMode: 'normal', locked: false, colorTag: 'none',
    ...valid
  } as EditableLayerNode;
  const nodes = state.nodes.slice();
  nodes.splice(insertIndex, 0, node);
  return { ...state, nodes, activeLayerId: id, activeTarget: 'content', nextSpecialNumber: number + 1 };
}

export function updateActiveEditableLayer(state: LayerDocumentState, patch: EditableLayerPatch): LayerDocumentState {
  const active = findLayerNode(state, state.activeLayerId);
  if (!isEditableLayerKind(active.kind)) return state;
  const valid = validateEditableLayerData({ ...active, ...patch });
  return updateNode(state, active.id, (node) => ({ ...node, ...cloneEditableLayerData(valid) }) as EditableLayerNode);
}

export function rasterizeActiveVectorLayer(state: LayerDocumentState): LayerDocumentState {
  const active=findLayerNode(state,state.activeLayerId); if(active.kind!=='vector')return state;
  return updateNode(state,active.id,(node)=>{ if(node.kind!=='vector')return node; const raster:RasterLayerNode={...node,kind:'raster',alphaLock:false,clipping:false,hasMask:false,role:'normal'}; return raster; });
}
export function selectLayerNode(state: LayerDocumentState,id:string):LayerDocumentState{findLayerNode(state,id);return{...state,activeLayerId:id,activeTarget:'content'};}
function updateNode(state: LayerDocumentState,id:string,updater:(node:LayerNode)=>LayerNode):LayerDocumentState{return{...state,nodes:state.nodes.map((node)=>node.id===id?updater(node):node)};}
export function renameActiveNode(state:LayerDocumentState,name:string):LayerDocumentState{const trimmed=name.trim();if(!trimmed)return state;return updateNode(state,state.activeLayerId,(node)=>({...node,name:trimmed}));}
export function toggleLayerVisibility(state:LayerDocumentState,id:string):LayerDocumentState{return updateNode(state,id,(node)=>({...node,visible:!node.visible}));}
export function setActiveOpacity(state:LayerDocumentState,opacity:number):LayerDocumentState{return updateNode(state,state.activeLayerId,(node)=>({...node,opacity:clamp01(opacity)}));}
export function setActiveBlendMode(state:LayerDocumentState,blendMode:BlendMode):LayerDocumentState{return updateNode(state,state.activeLayerId,(node)=>({...node,blendMode}));}
export function setActiveColorTag(state:LayerDocumentState,colorTag:LayerColorTag):LayerDocumentState{return updateNode(state,state.activeLayerId,(node)=>({...node,colorTag}));}
export function setActiveRasterRole(state:LayerDocumentState,role:LayerRole):LayerDocumentState{
  const active=findLayerNode(state,state.activeLayerId); if(!isRaster(active)||active.kind==='background')return state;
  return updateNode(state,active.id,(node)=>isRaster(node)?{...node,role}:node);
}
export function updateActiveSpecialLayer(state:LayerDocumentState,patch:SpecialLayerPatch):LayerDocumentState{
  const active=findLayerNode(state,state.activeLayerId); if(!isSpecial(active))return state;
  return updateNode(state,active.id,(node)=>{
    if(node.kind==='fill')return{...node,...(typeof patch.color==='string'?{color:patch.color}:{})};
    if(node.kind==='gradient')return{...node,...(typeof patch.startColor==='string'?{startColor:patch.startColor}:{}),...(typeof patch.endColor==='string'?{endColor:patch.endColor}:{}),...(typeof patch.angle==='number'?{angle:patch.angle}:{}),...(typeof patch.radial==='boolean'?{radial:patch.radial}:{})};
    if(node.kind==='correction')return{...node,...(patch.correctionType?{correctionType:patch.correctionType}:{}),...(typeof patch.brightness==='number'?{brightness:clamp(patch.brightness,-100,100)}:{}),...(typeof patch.contrast==='number'?{contrast:clamp(patch.contrast,-100,100)}:{}),...(typeof patch.hue==='number'?{hue:clamp(patch.hue,-180,180)}:{}),...(typeof patch.saturation==='number'?{saturation:clamp(patch.saturation,-100,100)}:{})};
    return node;
  });
}
export function filterLayerNodes(state:LayerDocumentState,filter:LayerFilter):LayerNode[]{
  const q=(filter.query??'').trim().toLowerCase();
  return state.nodes.filter((node)=>{
    if(filter.kind&&node.kind!==filter.kind)return false;
    if(filter.colorTag&&node.colorTag!==filter.colorTag)return false;
    if(filter.role&&(!isRaster(node)||node.role!==filter.role))return false;
    if(q){const role=isRaster(node)?node.role:''; if(!`${node.name} ${node.kind} ${role} ${node.colorTag}`.toLowerCase().includes(q))return false;}
    return true;
  });
}

export function toggleActiveAlphaLock(state:LayerDocumentState):LayerDocumentState{const node=findLayerNode(state,state.activeLayerId);if(!isRaster(node)||node.kind==='background')return state;return updateNode(state,node.id,(candidate)=>isRaster(candidate)?{...candidate,alphaLock:!candidate.alphaLock}:candidate);}
export function toggleActiveClipping(state:LayerDocumentState):LayerDocumentState{const node=findLayerNode(state,state.activeLayerId);if(!isRaster(node)||node.kind==='background')return state;return updateNode(state,node.id,(candidate)=>isRaster(candidate)?{...candidate,clipping:!candidate.clipping}:candidate);}
function siblingIndexes(state:LayerDocumentState,node:LayerNode):number[]{return state.nodes.map((candidate,index)=>candidate.parentId===node.parentId?index:-1).filter((index)=>index>=0);}
export function moveActiveNode(state:LayerDocumentState,direction:'up'|'down'):LayerDocumentState{const node=findLayerNode(state,state.activeLayerId);if(node.kind==='background')return state;const indexes=siblingIndexes(state,node);const current=state.nodes.findIndex((candidate)=>candidate.id===node.id);const siblingPosition=indexes.indexOf(current);const targetPosition=direction==='up'?siblingPosition+1:siblingPosition-1;if(targetPosition<0||targetPosition>=indexes.length)return state;const targetIndex=indexes[targetPosition]!;const target=state.nodes[targetIndex]!;if(target.kind==='background')return state;const nodes=state.nodes.slice();nodes[current]=target;nodes[targetIndex]=node;return{...state,nodes};}
function descendantsOf(state:LayerDocumentState,id:string):LayerNode[]{const direct=getChildren(state,id);return direct.flatMap((child)=>[child,...descendantsOf(state,child.id)]);}

export function groupActiveNode(state:LayerDocumentState):LayerDocumentState{const active=findLayerNode(state,state.activeLayerId);if(active.kind==='background'||active.kind==='group')return state;const groupId=`group-${state.nextGroupNumber}`;const group:GroupLayerNode={id:groupId,name:`Group ${state.nextGroupNumber}`,kind:'group',parentId:active.parentId,visible:true,opacity:1,blendMode:'normal',locked:false,colorTag:'none',expanded:true};const activeIndex=state.nodes.findIndex((node)=>node.id===active.id);const nodes=state.nodes.map((node)=>node.id===active.id?{...node,parentId:groupId}:node);nodes.splice(activeIndex,0,group);return{...state,nodes,nextGroupNumber:state.nextGroupNumber+1};}
export function addLayerMask(state:LayerDocumentState):LayerDocumentState{const active=findLayerNode(state,state.activeLayerId);if(!isRaster(active)||active.kind==='background'||active.hasMask)return state;return updateNode(state,active.id,(node)=>isRaster(node)?{...node,hasMask:true}:node);}
export function selectLayerMask(state:LayerDocumentState):LayerDocumentState{const active=findLayerNode(state,state.activeLayerId);if(!isRaster(active)||!active.hasMask)return state;return{...state,activeTarget:'mask'};}
export function selectLayerContent(state:LayerDocumentState):LayerDocumentState{return{...state,activeTarget:'content'};}
export function removeLayerMask(state:LayerDocumentState):LayerDocumentState{const active=findLayerNode(state,state.activeLayerId);if(!isRaster(active)||!active.hasMask)return state;const next=updateNode(state,active.id,(node)=>isRaster(node)?{...node,hasMask:false}:node);return{...next,activeTarget:'content'};}

export function duplicateActiveNode(state:LayerDocumentState):DuplicateLayerResult{
  const active=findLayerNode(state,state.activeLayerId);if(active.kind==='background')return{state,idMap:new Map()};
  const idMap=new Map<string,string>();const sourceTree=[active,...descendantsOf(state,active.id)];let nextRasterNumber=state.nextRasterNumber,nextVectorNumber=state.nextVectorNumber,nextGroupNumber=state.nextGroupNumber,nextSpecialNumber=state.nextSpecialNumber;
  const clones=sourceTree.map((source):LayerNode=>{let id:string;if(source.kind==='group')id=`group-${nextGroupNumber++}`;else if(source.kind==='vector')id=`vector-${nextVectorNumber++}`;else if(source.kind==='raster'||source.kind==='background')id=`paint-${nextRasterNumber++}`;else id=`${source.kind}-${nextSpecialNumber++}`;idMap.set(source.id,id);return{...cloneLayerNode(source),id};});
  for(const clone of clones){const sourceId=[...idMap.entries()].find(([,mapped])=>mapped===clone.id)?.[0];if(!sourceId)continue;const source=findLayerNode(state,sourceId);clone.parentId=source.parentId&&idMap.has(source.parentId)?idMap.get(source.parentId)!:source.parentId;clone.name=source===active?`${source.name} copy`:source.name;}
  const sourceIndexes=sourceTree.map((node)=>state.nodes.findIndex((candidate)=>candidate.id===node.id));const insertAfter=Math.max(...sourceIndexes);const nodes=state.nodes.slice();nodes.splice(insertAfter+1,0,...clones);const newActiveId=idMap.get(active.id)!;
  return{state:{...state,nodes,activeLayerId:newActiveId,activeTarget:'content',nextRasterNumber,nextVectorNumber,nextGroupNumber,nextSpecialNumber},idMap};
}
export function deleteActiveNode(state:LayerDocumentState):LayerDocumentState{const active=findLayerNode(state,state.activeLayerId);if(active.kind==='background')return state;const deleteIds=new Set([active.id,...descendantsOf(state,active.id).map((node)=>node.id)]);const activeIndex=state.nodes.findIndex((node)=>node.id===active.id);const remaining=state.nodes.filter((node)=>!deleteIds.has(node.id));const candidate=remaining[Math.min(activeIndex,remaining.length-1)]??remaining.at(-1);if(!candidate)return state;return{...state,nodes:remaining,activeLayerId:candidate.id,activeTarget:'content'};}
export function getMergeDownTargetId(state:LayerDocumentState):string|null{const active=findLayerNode(state,state.activeLayerId);if(!isRaster(active)||active.kind==='background')return null;const siblings=getChildren(state,active.parentId);const position=siblings.findIndex((node)=>node.id===active.id);for(let index=position-1;index>=0;index-=1){const candidate=siblings[index]!;if(candidate.kind==='raster')return candidate.id;if(candidate.kind==='background')return null;}return null;}
