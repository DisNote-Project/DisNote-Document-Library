export interface InteropWarning {
  code:
    | "lossy-mark"
    | "lossy-block"
    | "lossy-inline"
    | "unknown-block"
    | "unsupported-html"
    | "unsafe-url";
  message: string;
  blockId?: string;
}

export interface LossyExportResult {
  output: string;
  warnings: InteropWarning[];
}

export interface ImportResult {
  document: import("../core/index.js").DisNoteDocument;
  warnings: InteropWarning[];
}

export class WarningSink {
  readonly list: InteropWarning[] = [];
  add(code: InteropWarning["code"], message: string, blockId?: string): void {
    this.list.push(blockId ? { code, message, blockId } : { code, message });
  }
}
