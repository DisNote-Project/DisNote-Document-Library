import { LIBRARY_MESSAGES } from "../../core/messages.js";
import type { BlockRegistry, DisNoteDocument } from "../../core/index.js";
import { canonicalJson, validateDocument } from "../../core/index.js";

export class DocumentAssertionError extends Error {
  constructor(message: string, readonly details?: unknown) {
    super(message);
    this.name = "DocumentAssertionError";
  }
}

/** Throws if the document is invalid; returns it typed on success. */
export function assertValidDocument(
  input: unknown,
  registry?: BlockRegistry
): DisNoteDocument {
  const result = validateDocument(input, registry ? { registry } : {});
  if (!result.ok) {
    throw new DocumentAssertionError(
      LIBRARY_MESSAGES.validationFailed(result.issues.length),
      result.issues
    );
  }
  return result.value;
}

/** True when two documents are semantically equal (ignoring key order). */
export function documentsEqual(
  a: DisNoteDocument,
  b: DisNoteDocument
): boolean {
  return canonicalJson(a as never) === canonicalJson(b as never);
}

export function assertDocumentsEqual(
  a: DisNoteDocument,
  b: DisNoteDocument
): void {
  if (!documentsEqual(a, b)) {
    throw new DocumentAssertionError(
      LIBRARY_MESSAGES.DOCUMENTS_NOT_SEMANTICALLY_EQUAL,
      {
        a: canonicalJson(a as never),
        b: canonicalJson(b as never),
      }
    );
  }
}

export interface RoundTrip<T> {
  toEditor(doc: DisNoteDocument): T;
  fromEditor(editor: T): DisNoteDocument;
}

/** Assert an adapter loses nothing on toEditor → fromEditor. */
export function assertNoDataLoss<T>(
  adapter: RoundTrip<T>,
  doc: DisNoteDocument
): void {
  const back = adapter.fromEditor(adapter.toEditor(doc));
  assertDocumentsEqual(doc, back);
}
