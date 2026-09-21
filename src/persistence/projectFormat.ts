import { validateProjectDocumentDto } from './documentDto.js';

export const DRAWSTUDIO_MAGIC = 'drawing-studio-project' as const;
export const DRAWSTUDIO_FORMAT_VERSION = 1 as const;

export interface ProjectMetadata {
  title: string;
  createdAt: string;
  modifiedAt: string;
}

export interface ProjectCanvasInfo {
  width: number;
  height: number;
}

export interface ProjectDocumentPayload {
  layers: Record<string, unknown>;
  surfaces: unknown[];
  vectors: unknown[];
  selectionLayers: unknown[];
}

export interface DrawStudioProject {
  magic: typeof DRAWSTUDIO_MAGIC;
  formatVersion: typeof DRAWSTUDIO_FORMAT_VERSION;
  appVersion: string;
  metadata: ProjectMetadata;
  canvas: ProjectCanvasInfo;
  editor: Record<string, unknown>;
  document: ProjectDocumentPayload;
  extensions: Record<string, unknown>;
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = new Map([...BASE64].map((character, index) => [character, index]));

export function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const packed = (first << 16) | (second << 8) | third;
    output += BASE64[(packed >>> 18) & 63] ?? '';
    output += BASE64[(packed >>> 12) & 63] ?? '';
    output += index + 1 < bytes.length ? (BASE64[(packed >>> 6) & 63] ?? '') : '=';
    output += index + 2 < bytes.length ? (BASE64[packed & 63] ?? '') : '=';
  }
  return output;
}

export function base64ToBytes(value: string): Uint8Array {
  const compact = value.replace(/\s+/g, '');
  if (compact.length === 0) return new Uint8Array();
  if (compact.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    throw new Error('Invalid base64 byte payload');
  }
  const padding = compact.endsWith('==') ? 2 : compact.endsWith('=') ? 1 : 0;
  const output = new Uint8Array((compact.length / 4) * 3 - padding);
  let outputIndex = 0;
  for (let index = 0; index < compact.length; index += 4) {
    const a = decodeBase64Character(compact[index]);
    const b = decodeBase64Character(compact[index + 1]);
    const c = compact[index + 2] === '=' ? 0 : decodeBase64Character(compact[index + 2]);
    const d = compact[index + 3] === '=' ? 0 : decodeBase64Character(compact[index + 3]);
    const packed = (a << 18) | (b << 12) | (c << 6) | d;
    if (outputIndex < output.length) output[outputIndex++] = (packed >>> 16) & 255;
    if (outputIndex < output.length) output[outputIndex++] = (packed >>> 8) & 255;
    if (outputIndex < output.length) output[outputIndex++] = packed & 255;
  }
  return output;
}

function decodeBase64Character(value: string | undefined): number {
  if (!value) throw new Error('Invalid base64 byte payload');
  const decoded = BASE64_LOOKUP.get(value);
  if (decoded === undefined) throw new Error('Invalid base64 byte payload');
  return decoded;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`Invalid ${label}`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${label}`);
  return value;
}

function validateCanvas(value: unknown): ProjectCanvasInfo {
  const canvas = requireRecord(value, 'project canvas');
  const width = canvas.width;
  const height = canvas.height;
  if (!Number.isInteger(width) || !Number.isInteger(height) || Number(width) <= 0 || Number(height) <= 0 || Number(width) > 100_000 || Number(height) > 100_000) {
    throw new Error('Invalid project canvas dimensions');
  }
  return { width: Number(width), height: Number(height) };
}

function validateMetadata(value: unknown): ProjectMetadata {
  const metadata = requireRecord(value, 'project metadata');
  return {
    title: requireString(metadata.title, 'project title'),
    createdAt: requireString(metadata.createdAt, 'project creation timestamp'),
    modifiedAt: requireString(metadata.modifiedAt, 'project modification timestamp')
  };
}

function validateDocument(value: unknown): ProjectDocumentPayload {
  const document = requireRecord(value, 'project document');
  const layers = requireRecord(document.layers, 'layer document');
  const surfaces = document.surfaces;
  const vectors = document.vectors;
  const selectionLayers = document.selectionLayers;
  if (!Array.isArray(surfaces) || !Array.isArray(vectors) || !Array.isArray(selectionLayers)) {
    throw new Error('Invalid project document collections');
  }
  return { layers, surfaces, vectors, selectionLayers };
}

export function encodeProjectFile(project: DrawStudioProject): string {
  validateProject(project);
  return JSON.stringify(project);
}

export function decodeProjectFile(text: string): DrawStudioProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Invalid project JSON');
  }
  return validateProject(parsed);
}

export function validateProject(value: unknown): DrawStudioProject {
  const root = requireRecord(value, 'project root');
  if (root.magic !== DRAWSTUDIO_MAGIC) throw new Error('Invalid project magic');
  if (root.formatVersion !== DRAWSTUDIO_FORMAT_VERSION) {
    throw new Error(`Unsupported project format version: ${String(root.formatVersion)}`);
  }
  const appVersion = requireString(root.appVersion, 'app version');
  const metadata = validateMetadata(root.metadata);
  const canvas = validateCanvas(root.canvas);
  const editor = requireRecord(root.editor, 'editor state');
  const rawDocument = validateDocument(root.document);
  const document = Array.isArray(rawDocument.layers.nodes)
    ? validateProjectDocumentDto(rawDocument, canvas.width, canvas.height) as unknown as ProjectDocumentPayload
    : rawDocument;
  const extensions = root.extensions === undefined ? {} : requireRecord(root.extensions, 'project extensions');
  return {
    magic: DRAWSTUDIO_MAGIC,
    formatVersion: DRAWSTUDIO_FORMAT_VERSION,
    appVersion,
    metadata,
    canvas,
    editor,
    document,
    extensions
  };
}
