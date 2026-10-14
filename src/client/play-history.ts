import type { SafeStore } from './storage.ts';

interface HistoryState {
  stack: string[];
  index: number;
}

const MAX_ENTRIES = 200;

/** This session's play history, driven by the header back/forward buttons. */
export class PlayHistory {
  private state: HistoryState;

  constructor(
    private readonly store: SafeStore,
    private readonly key: string,
  ) {
    const saved = store.get<HistoryState>(key);
    const valid =
      saved !== null &&
      Array.isArray(saved.stack) &&
      saved.stack.every((s) => typeof s === 'string') &&
      Number.isInteger(saved.index) &&
      saved.index >= -1 &&
      saved.index < saved.stack.length;
    this.state = valid ? saved : { stack: [], index: -1 };
  }

  get index(): number {
    return this.state.index;
  }

  get canBack(): boolean {
    return this.state.index > 0;
  }

  get canForward(): boolean {
    return this.state.index < this.state.stack.length - 1;
  }

  at(index: number): string | undefined {
    return this.state.stack[index];
  }

  /** Records a newly opened game, dropping any forward entries. Returns its index. */
  visit(slug: string): number {
    const s = this.state;
    if (s.stack[s.index] === slug) return s.index;
    s.stack = [...s.stack.slice(0, s.index + 1), slug].slice(-MAX_ENTRIES);
    s.index = s.stack.length - 1;
    this.save();
    return s.index;
  }

  /** Moves to an existing entry. Returns false if `slug` isn't at `index`. */
  moveTo(index: number, slug: string): boolean {
    if (this.state.stack[index] !== slug) return false;
    this.state.index = index;
    this.save();
    return true;
  }

  private save(): void {
    this.store.set(this.key, this.state);
  }
}
