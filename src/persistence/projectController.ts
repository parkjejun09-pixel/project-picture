export interface ProjectWritableHandle {
  name: string;
  writeText(text: string): Promise<void>;
}

export interface OpenedProjectFile {
  name: string;
  text: string;
  handle?: ProjectWritableHandle;
}

export interface ProjectIoAdapter {
  directSupported: boolean;
  openDirect(): Promise<OpenedProjectFile | null>;
  createDirectHandle(suggestedName: string): Promise<ProjectWritableHandle | null>;
  openFallback(): Promise<OpenedProjectFile | null>;
  downloadFallback(name: string, text: string): void;
}

export type ProjectSaveResult = { kind: 'direct' | 'download'; name: string };

export class ProjectController {
  private handle: ProjectWritableHandle | null = null;
  private currentName: string | null = null;

  constructor(private readonly io: ProjectIoAdapter) {}

  get fileName(): string | null { return this.currentName; }
  get hasWritableHandle(): boolean { return this.handle !== null; }

  async open(accept?: (opened: OpenedProjectFile) => void | Promise<void>): Promise<OpenedProjectFile | null> {
    const opened = this.io.directSupported ? await this.io.openDirect() : await this.io.openFallback();
    if (!opened) return null;
    // Do not bind Save to a candidate file until its document was accepted.
    await accept?.(opened);
    this.handle = opened.handle ?? null;
    this.currentName = opened.name;
    return opened;
  }

  async save(text: string, suggestedName: string): Promise<ProjectSaveResult | null> {
    if (this.handle) {
      await this.handle.writeText(text);
      this.currentName = this.handle.name;
      return { kind: 'direct', name: this.handle.name };
    }
    return this.saveAs(text, suggestedName);
  }

  async saveAs(text: string, suggestedName: string): Promise<ProjectSaveResult | null> {
    if (this.io.directSupported) {
      const handle = await this.io.createDirectHandle(suggestedName);
      if (!handle) return null;
      await handle.writeText(text);
      this.handle = handle;
      this.currentName = handle.name;
      return { kind: 'direct', name: handle.name };
    }
    this.io.downloadFallback(suggestedName, text);
    this.handle = null;
    this.currentName = suggestedName;
    return { kind: 'download', name: suggestedName };
  }

  resetFileBinding(): void {
    this.handle = null;
    this.currentName = null;
  }
}

interface NativeWritableStreamLike {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}

interface NativeFileHandleLike {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<NativeWritableStreamLike>;
}

interface FilePickerWindow extends Window {
  showOpenFilePicker?: (options?: unknown) => Promise<NativeFileHandleLike[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<NativeFileHandleLike>;
}

function wrapNativeHandle(handle: NativeFileHandleLike): ProjectWritableHandle {
  return {
    name: handle.name,
    async writeText(text: string): Promise<void> {
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
    }
  };
}

export function createBrowserProjectIo(win: Window = window, doc: Document = document): ProjectIoAdapter {
  const pickerWindow = win as FilePickerWindow;
  const directSupported = Boolean(win.isSecureContext && pickerWindow.showOpenFilePicker && pickerWindow.showSaveFilePicker);
  const pickerTypes = [{
    description: 'Drawing Studio project',
    accept: { 'application/json': ['.drawstudio'] }
  }];

  return {
    directSupported,
    async openDirect(): Promise<OpenedProjectFile | null> {
      if (!directSupported || !pickerWindow.showOpenFilePicker) return null;
      try {
        const handles = await pickerWindow.showOpenFilePicker({ multiple: false, types: pickerTypes });
        const native = handles[0];
        if (!native) return null;
        const file = await native.getFile();
        return { name: file.name, text: await file.text(), handle: wrapNativeHandle(native) };
      } catch (error) {
        if (isAbortError(error)) return null;
        throw error;
      }
    },
    async createDirectHandle(suggestedName: string): Promise<ProjectWritableHandle | null> {
      if (!directSupported || !pickerWindow.showSaveFilePicker) return null;
      try {
        const native = await pickerWindow.showSaveFilePicker({ suggestedName, types: pickerTypes });
        return wrapNativeHandle(native);
      } catch (error) {
        if (isAbortError(error)) return null;
        throw error;
      }
    },
    openFallback(): Promise<OpenedProjectFile | null> {
      return new Promise((resolve) => {
        const input = doc.createElement('input');
        input.type = 'file';
        input.accept = '.drawstudio,application/json';
        input.hidden = true;
        const cleanup = (): void => input.remove();
        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) { cleanup(); resolve(null); return; }
          try { resolve({ name: file.name, text: await file.text() }); }
          finally { cleanup(); }
        }, { once: true });
        input.addEventListener('cancel', () => { cleanup(); resolve(null); }, { once: true });
        doc.body.append(input);
        input.click();
      });
    },
    downloadFallback(name: string, text: string): void {
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = doc.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
