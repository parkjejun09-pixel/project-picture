import { cloneLayerDocumentState, type LayerDocumentState, type LayerNode } from '../drawing/layers.js';
import { isEditableLayerKind, validateEditableLayerData } from '../drawing/editableLayers.js';
import type { VectorPoint, VectorStroke } from '../drawing/vector.js';
import { base64ToBytes, bytesToBase64 } from './projectFormat.js';

export interface SerializedImageBytes {
  width: number;
  height: number;
  rgba: string;
}

export interface ProjectSurfaceDto {
  id: string;
  content: SerializedImageBytes;
  mask: SerializedImageBytes | null;
}

export interface ProjectVectorDto {
  id: string;
  strokes: VectorStroke[];
}

export interface ProjectSelectionLayerDto {
  id: string;
  mask: string;
}

export interface ProjectDocumentDto {
  layers: LayerDocumentState;
  surfaces: ProjectSurfaceDto[];
  vectors: ProjectVectorDto[];
  selectionLayers: ProjectSelectionLayerDto[];
}

export interface DeserializedImageBytes {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function assertDimension(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0 || value > 100_000) throw new Error(`Invalid ${label}`);
}

export function serializeImageBytes(width: number, height: number, data: Uint8ClampedArray): SerializedImageBytes {
  assertDimension(width, 'image width');
  assertDimension(height, 'image height');
  const expected = width * height * 4;
  if (data.length !== expected) throw new Error(`Invalid image byte length: expected ${expected}, got ${data.length}`);
  return { width, height, rgba: bytesToBase64(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)) };
}

export function deserializeImageBytes(value: SerializedImageBytes): DeserializedImageBytes {
  assertDimension(value.width, 'image width');
  assertDimension(value.height, 'image height');
  const bytes = base64ToBytes(value.rgba);
  const expected = value.width * value.height * 4;
  if (bytes.length !== expected) throw new Error(`Invalid image byte length: expected ${expected}, got ${bytes.length}`);
  return { width: value.width, height: value.height, data: new Uint8ClampedArray(bytes) };
}

export function serializeSelectionBytes(mask: Uint8Array): string {
  return bytesToBase64(mask);
}

export function deserializeSelectionBytes(value: string, expectedLength: number): Uint8Array {
  const mask = base64ToBytes(value);
  if (mask.length !== expectedLength) throw new Error(`Invalid selection mask length: expected ${expectedLength}, got ${mask.length}`);
  return mask;
}

function cloneVectorPoint(point: VectorPoint): VectorPoint {
  return {
    x: point.x,
    y: point.y,
    ...(point.inHandle ? { inHandle: { ...point.inHandle } } : {}),
    ...(point.outHandle ? { outHandle: { ...point.outHandle } } : {})
  };
}

function cloneVectorStroke(stroke: VectorStroke): VectorStroke {
  return { ...stroke, points: stroke.points.map(cloneVectorPoint) };
}

export function cloneProjectDocumentDto(document: ProjectDocumentDto): ProjectDocumentDto {
  return {
    layers: cloneLayerDocumentState(document.layers),
    surfaces: document.surfaces.map((surface) => ({
      id: surface.id,
      content: { ...surface.content },
      mask: surface.mask ? { ...surface.mask } : null
    })),
    vectors: document.vectors.map((item) => ({ id: item.id, strokes: item.strokes.map(cloneVectorStroke) })),
    selectionLayers: document.selectionLayers.map((item) => ({ ...item }))
  };
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`Invalid ${label}`);
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${label}`);
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) throw new Error(`Invalid ${label}`);
  return value;
}

const LEGACY_LAYER_KINDS = new Set(['raster', 'background', 'vector', 'group', 'fill', 'gradient', 'correction', 'selection']);
const BLEND_MODES = new Set(['normal', 'multiply', 'screen', 'overlay', 'add']);
const COLOR_TAGS = new Set(['none', 'red', 'orange', 'yellow', 'green', 'blue', 'purple']);

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Invalid ${label}`);
  return value;
}

function finiteRange(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) throw new Error(`Invalid ${label}`);
  return value;
}

function validateLayerReferences(nodes: readonly LayerNode[], activeLayerId: string): void {
  const nodesById = new Map<string, LayerNode>();
  for (const node of nodes) {
    if (node.id.length === 0) throw new Error('Invalid empty layer id');
    if (nodesById.has(node.id)) throw new Error(`Duplicate layer id: ${node.id}`);
    nodesById.set(node.id, node);
  }
  if (!nodesById.has(activeLayerId)) throw new Error(`Invalid active layer reference: ${activeLayerId}`);
  for (const node of nodes) {
    if (node.parentId === null) continue;
    const parent = nodesById.get(node.parentId);
    if (!parent) throw new Error(`Invalid layer parent reference: ${node.parentId}`);
    if (parent.kind !== 'group') throw new Error(`Invalid layer parent group: ${node.parentId}`);
  }
  for (const node of nodes) {
    if (node.parentId === null) continue;
    const ancestors = new Set<string>([node.id]);
    let ancestor = nodesById.get(node.parentId)!;
    while (true) {
      if (ancestors.has(ancestor.id)) throw new Error(`Layer parent cycle: ${node.id}`);
      ancestors.add(ancestor.id);
      if (ancestor.parentId === null) break;
      ancestor = nodesById.get(ancestor.parentId)!;
    }
  }
}

export function validateProjectDocumentDto(value: unknown, width: number, height: number): ProjectDocumentDto {
  assertDimension(width, 'project canvas width'); assertDimension(height, 'project canvas height');
  const document = objectValue(value, 'project document');
  const layerValue = objectValue(document.layers, 'layer document');
  if (!Array.isArray(layerValue.nodes)) throw new Error('Invalid layer nodes');
  const nodes = layerValue.nodes.map((item): LayerNode => {
    const node = objectValue(item, 'layer node');
    stringValue(node.id, 'layer id'); stringValue(node.name, 'layer name');
    if (node.parentId !== null && typeof node.parentId !== 'string') throw new Error('Invalid layer parent');
    const kind = stringValue(node.kind, 'layer kind');
    if (!isEditableLayerKind(kind) && !LEGACY_LAYER_KINDS.has(kind)) throw new Error('Invalid layer kind');
    booleanValue(node.visible, 'layer visibility'); booleanValue(node.locked, 'layer locked state');
    finiteRange(node.opacity, 'layer opacity', 0, 1);
    if (!BLEND_MODES.has(stringValue(node.blendMode, 'layer blend mode'))) throw new Error('Invalid layer blend mode');
    if (!COLOR_TAGS.has(stringValue(node.colorTag, 'layer color tag'))) throw new Error('Invalid layer color tag');
    if (isEditableLayerKind(kind)) return { ...node, ...validateEditableLayerData(node) } as unknown as LayerNode;
    return { ...node } as unknown as LayerNode;
  });
  const activeLayerId = stringValue(layerValue.activeLayerId, 'active layer id');
  validateLayerReferences(nodes, activeLayerId);
  const layers: LayerDocumentState = {
    nodes,
    activeLayerId,
    activeTarget: layerValue.activeTarget === 'mask' ? 'mask' : layerValue.activeTarget === 'content' ? 'content' : (() => { throw new Error('Invalid active layer target'); })(),
    nextRasterNumber: positiveInteger(layerValue.nextRasterNumber, 'next raster number'),
    nextVectorNumber: positiveInteger(layerValue.nextVectorNumber, 'next vector number'),
    nextGroupNumber: positiveInteger(layerValue.nextGroupNumber, 'next group number'),
    nextSpecialNumber: positiveInteger(layerValue.nextSpecialNumber, 'next special number')
  };
  if (!Array.isArray(document.surfaces) || !Array.isArray(document.vectors) || !Array.isArray(document.selectionLayers)) {
    throw new Error('Invalid project document collections');
  }
  const surfaces = document.surfaces.map((item): ProjectSurfaceDto => {
    const surface = objectValue(item, 'project surface'); const contentValue = objectValue(surface.content, 'surface content') as unknown as SerializedImageBytes;
    const content = deserializeImageBytes(contentValue);
    if (content.width !== width || content.height !== height) throw new Error(`Surface ${String(surface.id)} does not match project canvas`);
    let mask: SerializedImageBytes | null = null;
    if (surface.mask !== null) {
      const maskValue = objectValue(surface.mask, 'surface mask') as unknown as SerializedImageBytes; const decoded = deserializeImageBytes(maskValue);
      if (decoded.width !== width || decoded.height !== height) throw new Error(`Mask ${String(surface.id)} does not match project canvas`);
      mask = { ...maskValue };
    }
    return { id: stringValue(surface.id, 'surface id'), content: { ...contentValue }, mask };
  });
  const vectors = document.vectors.map((item): ProjectVectorDto => {
    const vector = objectValue(item, 'project vector'); if (!Array.isArray(vector.strokes)) throw new Error('Invalid vector strokes');
    return { id: stringValue(vector.id, 'vector id'), strokes: (vector.strokes as VectorStroke[]).map(cloneVectorStroke) };
  });
  const pixelCount = width * height;
  const selectionLayers = document.selectionLayers.map((item): ProjectSelectionLayerDto => {
    const selection = objectValue(item, 'selection layer'); const mask = stringValue(selection.mask, 'selection mask');
    deserializeSelectionBytes(mask, pixelCount);
    return { id: stringValue(selection.id, 'selection layer id'), mask };
  });
  return cloneProjectDocumentDto({ layers, surfaces, vectors, selectionLayers });
}
