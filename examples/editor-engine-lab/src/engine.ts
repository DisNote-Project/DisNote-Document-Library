/**
 * Educational minimal block editor engine.
 *
 * This exists ONLY to teach the shape of a real editor engine (state, selection,
 * transactions, undo/redo). It handles a couple of block types and a caret. It
 * is intentionally naive — production editing uses BlockNote/ProseMirror via the
 * adapter. Do NOT import this from production packages.
 */

export interface LabBlock {
  id: string;
  type: "paragraph" | "heading";
  text: string;
}

export interface Selection {
  blockId: string;
  offset: number;
}

export interface EngineState {
  blocks: LabBlock[];
  selection: Selection;
}

export type Transaction =
  | { kind: "insertText"; text: string }
  | { kind: "splitBlock" }
  | { kind: "mergeBackward" }
  | { kind: "setType"; type: LabBlock["type"] };

let idSeq = 0;
const nextId = () => `lab_${idSeq++}`;

export class EditorEngine {
  private state: EngineState;
  private readonly undoStack: EngineState[] = [];
  private readonly redoStack: EngineState[] = [];
  readonly log: Transaction[] = [];

  constructor(initial?: Partial<LabBlock>) {
    const first: LabBlock = { id: nextId(), type: "paragraph", text: "", ...initial };
    this.state = { blocks: [first], selection: { blockId: first.id, offset: first.text.length } };
  }

  getState(): EngineState {
    return this.state;
  }

  private commit(next: EngineState, tx: Transaction): void {
    this.undoStack.push(this.state);
    this.redoStack.length = 0;
    this.state = next;
    this.log.push(tx);
  }

  private index(blockId: string): number {
    return this.state.blocks.findIndex((b) => b.id === blockId);
  }

  dispatch(tx: Transaction): void {
    switch (tx.kind) {
      case "insertText":
        return this.insertText(tx.text, tx);
      case "splitBlock":
        return this.splitBlock(tx);
      case "mergeBackward":
        return this.mergeBackward(tx);
      case "setType":
        return this.setType(tx.type, tx);
    }
  }

  private insertText(text: string, tx: Transaction): void {
    const i = this.index(this.state.selection.blockId);
    const block = this.state.blocks[i]!;
    const { offset } = this.state.selection;
    const updated: LabBlock = { ...block, text: block.text.slice(0, offset) + text + block.text.slice(offset) };
    const blocks = replaceAt(this.state.blocks, i, [updated]);
    this.commit({ blocks, selection: { blockId: block.id, offset: offset + text.length } }, tx);
  }

  private splitBlock(tx: Transaction): void {
    const i = this.index(this.state.selection.blockId);
    const block = this.state.blocks[i]!;
    const { offset } = this.state.selection;
    const left: LabBlock = { ...block, text: block.text.slice(0, offset) };
    const right: LabBlock = { id: nextId(), type: "paragraph", text: block.text.slice(offset) };
    const blocks = replaceAt(this.state.blocks, i, [left, right]);
    this.commit({ blocks, selection: { blockId: right.id, offset: 0 } }, tx);
  }

  private mergeBackward(tx: Transaction): void {
    const i = this.index(this.state.selection.blockId);
    if (i <= 0) return;
    const prev = this.state.blocks[i - 1]!;
    const cur = this.state.blocks[i]!;
    const merged: LabBlock = { ...prev, text: prev.text + cur.text };
    const blocks = replaceAt(this.state.blocks, i - 1, [merged]).filter((b) => b.id !== cur.id);
    this.commit({ blocks, selection: { blockId: prev.id, offset: prev.text.length } }, tx);
  }

  private setType(type: LabBlock["type"], tx: Transaction): void {
    const i = this.index(this.state.selection.blockId);
    const block = this.state.blocks[i]!;
    const blocks = replaceAt(this.state.blocks, i, [{ ...block, type }]);
    this.commit({ blocks, selection: this.state.selection }, tx);
  }

  setSelection(selection: Selection): void {
    this.state = { ...this.state, selection };
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.redoStack.push(this.state);
    this.state = prev;
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(this.state);
    this.state = next;
    return true;
  }

  text(): string {
    return this.state.blocks.map((b) => `${b.type === "heading" ? "# " : ""}${b.text}`).join("\n");
  }
}

function replaceAt<T>(list: T[], index: number, items: T[]): T[] {
  return [...list.slice(0, index), ...items, ...list.slice(index + 1)];
}
