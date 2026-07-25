/** Typed error hierarchy for the document core. */

export interface DocumentIssue {
  path: string;
  code: string;
  message: string;
}

export abstract class DocumentError extends Error {
  abstract readonly kind: string;
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidDocumentError extends DocumentError {
  readonly kind = "invalid-document" as const;
  constructor(
    message: string,
    readonly issues: DocumentIssue[] = [],
  ) {
    super(message);
  }
}

export class UnsupportedSchemaVersionError extends DocumentError {
  readonly kind = "unsupported-schema-version" as const;
  constructor(
    readonly found: number,
    readonly supported: number,
  ) {
    super(`Unsupported document schemaVersion ${found}; this build supports up to ${supported}.`);
  }
}

export class UnknownBlockError extends DocumentError {
  readonly kind = "unknown-block" as const;
  constructor(readonly blockType: string) {
    super(`Unknown block type "${blockType}".`);
  }
}

export class MigrationError extends DocumentError {
  readonly kind = "migration" as const;
  constructor(message: string, readonly from: number, readonly to: number) {
    super(message);
  }
}

export class RevisionConflictError extends DocumentError {
  readonly kind = "revision-conflict" as const;
  constructor(readonly expected: number, readonly current: number) {
    super(`Revision conflict: expected ${expected} but current is ${current}.`);
  }
}

export class RenderError extends DocumentError {
  readonly kind = "render" as const;
}

export class UploadError extends DocumentError {
  readonly kind = "upload" as const;
}
