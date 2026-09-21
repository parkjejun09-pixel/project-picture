import type { EditorState } from '../editor/types.js';
import type { ProjectDocumentDto } from './documentDto.js';
import { serializeEditorState } from './editorStateDto.js';
import {
  DRAWSTUDIO_FORMAT_VERSION,
  DRAWSTUDIO_MAGIC,
  type DrawStudioProject,
  type ProjectDocumentPayload
} from './projectFormat.js';

export interface ProjectSnapshotInput {
  title: string;
  createdAt: string;
  modifiedAt: string;
  editorState: EditorState;
  document: ProjectDocumentDto;
  canvas: { width: number; height: number };
  extensions?: Record<string, unknown>;
}

export function createProjectSnapshot(input: ProjectSnapshotInput): DrawStudioProject {
  return {
    magic: DRAWSTUDIO_MAGIC,
    formatVersion: DRAWSTUDIO_FORMAT_VERSION,
    appVersion: '0.6.9',
    metadata: {
      title: input.title,
      createdAt: input.createdAt,
      modifiedAt: input.modifiedAt
    },
    canvas: { ...input.canvas },
    editor: { ...serializeEditorState(input.editorState) } as unknown as Record<string, unknown>,
    document: input.document as unknown as ProjectDocumentPayload,
    extensions: input.extensions ? { ...input.extensions } : {}
  };
}

export class ProjectDirtyTracker {
  private currentRevision = 0;
  private cleanRevision = 0;
  private readonly onChange: ((dirty: boolean, revision: number) => void) | undefined;

  constructor(onChange?: (dirty: boolean, revision: number) => void) {
    this.onChange = onChange;
  }

  get revision(): number { return this.currentRevision; }
  get dirty(): boolean { return this.currentRevision !== this.cleanRevision; }

  markDirty(): number {
    this.currentRevision += 1;
    this.emit();
    return this.currentRevision;
  }

  markClean(): void {
    this.cleanRevision = this.currentRevision;
    this.emit();
  }

  resetClean(): void {
    this.currentRevision = 0;
    this.cleanRevision = 0;
    this.emit();
  }

  private emit(): void {
    this.onChange?.(this.dirty, this.currentRevision);
  }
}
