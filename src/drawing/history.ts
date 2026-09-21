export class HistoryStack<T> {
  private readonly limit: number;
  private states: T[] = [];
  private index = -1;

  constructor(limit = 40) {
    if (!Number.isInteger(limit) || limit < 2) {
      throw new RangeError('History limit must be an integer of at least 2.');
    }
    this.limit = limit;
  }

  get current(): T | undefined {
    return this.index >= 0 ? this.states[this.index] : undefined;
  }

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index >= 0 && this.index < this.states.length - 1;
  }

  push(state: T): void {
    if (this.index < this.states.length - 1) {
      this.states = this.states.slice(0, this.index + 1);
    }
    this.states.push(state);
    if (this.states.length > this.limit) this.states.shift();
    this.index = this.states.length - 1;
  }

  undo(): T | undefined {
    if (!this.canUndo) return this.current;
    this.index -= 1;
    return this.states[this.index];
  }

  redo(): T | undefined {
    if (!this.canRedo) return this.current;
    this.index += 1;
    return this.states[this.index];
  }

  clear(): void {
    this.states = [];
    this.index = -1;
  }
}
