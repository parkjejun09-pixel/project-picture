import { decodeProjectFile, type DrawStudioProject } from './projectFormat.js';

export interface RecoveryCheckpoint {
  id: 'latest';
  title: string;
  savedAt: string;
  revision: number;
  projectText: string;
}

export interface RecentProjectEntry {
  name: string;
  updatedAt: string;
  source: 'direct' | 'download' | 'upload' | 'recovery';
}

export interface AutosaveStore {
  saveRecovery(checkpoint: RecoveryCheckpoint): Promise<void>;
  getRecovery(): Promise<RecoveryCheckpoint | null>;
  clearRecovery(): Promise<void>;
  recordRecent(entry: RecentProjectEntry): Promise<void>;
  listRecent(limit?: number): Promise<RecentProjectEntry[]>;
}

export class MemoryAutosaveStore implements AutosaveStore {
  private recovery: RecoveryCheckpoint | null = null;
  private readonly recent = new Map<string, RecentProjectEntry>();

  async saveRecovery(checkpoint: RecoveryCheckpoint): Promise<void> {
    this.recovery = { ...checkpoint };
  }

  async getRecovery(): Promise<RecoveryCheckpoint | null> {
    return this.recovery ? { ...this.recovery } : null;
  }

  async clearRecovery(): Promise<void> {
    this.recovery = null;
  }

  async recordRecent(entry: RecentProjectEntry): Promise<void> {
    this.recent.set(entry.name, { ...entry });
  }

  async listRecent(limit = 8): Promise<RecentProjectEntry[]> {
    return [...this.recent.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, Math.max(0, limit))
      .map((entry) => ({ ...entry }));
  }
}

const DB_NAME = 'drawing-studio-v069';
const DB_VERSION = 1;
const RECOVERY_STORE = 'recovery';
const RECENT_STORE = 'recent';

export class IndexedDbAutosaveStore implements AutosaveStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(RECOVERY_STORE)) db.createObjectStore(RECOVERY_STORE, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(RECENT_STORE)) db.createObjectStore(RECENT_STORE, { keyPath: 'name' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    return this.dbPromise;
  }

  async saveRecovery(checkpoint: RecoveryCheckpoint): Promise<void> {
    const db = await this.openDb();
    await runRequest(db, RECOVERY_STORE, 'readwrite', (store) => store.put(checkpoint));
  }

  async getRecovery(): Promise<RecoveryCheckpoint | null> {
    const db = await this.openDb();
    const result = await runRequest<RecoveryCheckpoint | undefined>(db, RECOVERY_STORE, 'readonly', (store) => store.get('latest'));
    return result ? { ...result } : null;
  }

  async clearRecovery(): Promise<void> {
    const db = await this.openDb();
    await runRequest(db, RECOVERY_STORE, 'readwrite', (store) => store.delete('latest'));
  }

  async recordRecent(entry: RecentProjectEntry): Promise<void> {
    const db = await this.openDb();
    await runRequest(db, RECENT_STORE, 'readwrite', (store) => store.put(entry));
  }

  async listRecent(limit = 8): Promise<RecentProjectEntry[]> {
    const db = await this.openDb();
    const result = await runRequest<RecentProjectEntry[]>(db, RECENT_STORE, 'readonly', (store) => store.getAll());
    return result
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, Math.max(0, limit))
      .map((entry) => ({ ...entry }));
  }
}

function runRequest<T = unknown>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = createRequest(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export async function loadValidRecovery(store: AutosaveStore): Promise<{ checkpoint: RecoveryCheckpoint; project: DrawStudioProject } | null> {
  const checkpoint = await store.getRecovery();
  if (!checkpoint) return null;
  try {
    return { checkpoint, project: decodeProjectFile(checkpoint.projectText) };
  } catch {
    return null;
  }
}

export interface AutosaveScheduleInput {
  revision: number;
  title: string;
  createProjectText: () => string;
}

export interface AutosaveCoordinatorOptions {
  delayMs?: number;
  schedule?: (callback: () => void | Promise<void>, delayMs: number) => unknown;
  cancel?: (handle: unknown) => void;
  now?: () => string;
  onError?: (error: unknown) => void;
}

export class AutosaveCoordinator {
  private pendingHandle: unknown = null;
  private generation = 0;
  private readonly delayMs: number;
  private readonly scheduleFn: (callback: () => void | Promise<void>, delayMs: number) => unknown;
  private readonly cancelFn: (handle: unknown) => void;
  private readonly now: () => string;
  private readonly onError: ((error: unknown) => void) | undefined;

  constructor(private readonly store: AutosaveStore, options: AutosaveCoordinatorOptions = {}) {
    this.delayMs = options.delayMs ?? 1200;
    this.scheduleFn = options.schedule ?? ((callback, delayMs) => window.setTimeout(() => { void callback(); }, delayMs));
    this.cancelFn = options.cancel ?? ((handle) => window.clearTimeout(handle as number));
    this.now = options.now ?? (() => new Date().toISOString());
    this.onError = options.onError;
  }

  schedule(input: AutosaveScheduleInput): void {
    if (this.pendingHandle !== null) this.cancelFn(this.pendingHandle);
    const generation = ++this.generation;
    const run = async (): Promise<void> => {
      if (generation !== this.generation) return;
      this.pendingHandle = null;
      try {
        const projectText = input.createProjectText();
        await this.store.saveRecovery({
          id: 'latest',
          title: input.title,
          savedAt: this.now(),
          revision: input.revision,
          projectText
        });
      } catch (error) {
        this.onError?.(error);
      }
    };
    this.pendingHandle = this.scheduleFn(run, this.delayMs);
  }

  cancelPending(): void {
    this.generation += 1;
    if (this.pendingHandle !== null) this.cancelFn(this.pendingHandle);
    this.pendingHandle = null;
  }

  async clearRecovery(): Promise<void> {
    this.cancelPending();
    await this.store.clearRecovery();
  }
}
