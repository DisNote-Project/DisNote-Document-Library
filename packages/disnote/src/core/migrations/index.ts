import { LIBRARY_MESSAGES } from "../messages.js";
import type { DisNoteBlock, DisNoteDocument } from "../model/document.js";
import { CURRENT_SCHEMA_VERSION } from "../model/document.js";
import { mapBlocks } from "../transformations/index.js";

export type DocumentMigrationFn = (
  document: DisNoteDocument
) => DisNoteDocument;
export type BlockMigrationFn = (block: DisNoteBlock) => DisNoteBlock;

export interface MigrationReport {
  fromSchema: number;
  toSchema: number;
  documentSteps: Array<{ from: number; to: number }>;
  changedBlockIds: string[];
  blockSteps: Array<{
    type: string;
    from: number;
    to: number;
    blockId: string;
  }>;
}

export type MigrationResult =
  | { ok: true; document: DisNoteDocument; report: MigrationReport }
  | {
      ok: false;
      error: {
        code:
          | "missing-document-migration"
          | "missing-block-migration"
          | "unsupported-future-schema";
        message: string;
        from: number;
        to: number;
      };
    };

export interface MigrateOptions {
  /** Target document schema version. Defaults to the library's current V1. */
  targetSchemaVersion?: number;
}

interface DocKey {
  from: number;
  fn: DocumentMigrationFn;
}

export interface MigrationRegistry {
  registerDocumentMigration(
    from: number,
    to: number,
    fn: DocumentMigrationFn
  ): MigrationRegistry;
  registerBlockMigration(
    type: string,
    from: number,
    to: number,
    fn: BlockMigrationFn
  ): MigrationRegistry;
  migrate(document: DisNoteDocument, options?: MigrateOptions): MigrationResult;
  /** Report what would change without producing the migrated document. */
  dryRun(document: DisNoteDocument, options?: MigrateOptions): MigrationResult;
}

class MigrationRegistryImpl implements MigrationRegistry {
  private readonly docMigrations = new Map<number, DocKey>();
  private readonly blockMigrations = new Map<string, BlockMigrationFn>();

  registerDocumentMigration(
    from: number,
    to: number,
    fn: DocumentMigrationFn
  ): MigrationRegistry {
    if (to !== from + 1)
      throw new Error(LIBRARY_MESSAGES.documentMigrationStepInvalid(from, to));
    if (this.docMigrations.has(from))
      throw new Error(
        LIBRARY_MESSAGES.documentMigrationAlreadyRegistered(from)
      );
    this.docMigrations.set(from, { from, fn });
    return this;
  }

  registerBlockMigration(
    type: string,
    from: number,
    to: number,
    fn: BlockMigrationFn
  ): MigrationRegistry {
    if (to !== from + 1)
      throw new Error(
        LIBRARY_MESSAGES.blockMigrationStepInvalid(type, from, to)
      );
    const key = `${type}@${from}`;
    if (this.blockMigrations.has(key))
      throw new Error(LIBRARY_MESSAGES.blockMigrationAlreadyRegistered(key));
    this.blockMigrations.set(key, fn);
    return this;
  }

  migrate(
    document: DisNoteDocument,
    options: MigrateOptions = {}
  ): MigrationResult {
    return this.run(document, options, true);
  }

  dryRun(
    document: DisNoteDocument,
    options: MigrateOptions = {}
  ): MigrationResult {
    return this.run(document, options, false);
  }

  private run(
    document: DisNoteDocument,
    options: MigrateOptions,
    apply: boolean
  ): MigrationResult {
    const target = options.targetSchemaVersion ?? CURRENT_SCHEMA_VERSION;
    const report: MigrationReport = {
      fromSchema: document.schemaVersion,
      toSchema: target,
      documentSteps: [],
      changedBlockIds: [],
      blockSteps: [],
    };

    if (document.schemaVersion > target) {
      return {
        ok: false,
        error: {
          code: "unsupported-future-schema",
          message: LIBRARY_MESSAGES.documentSchemaNewerThanTarget(
            document.schemaVersion,
            target
          ),
          from: document.schemaVersion,
          to: target,
        },
      };
    }

    let current: DisNoteDocument = document;

    // Document-level migrations, one version per step.
    while (current.schemaVersion < target) {
      const step = this.docMigrations.get(current.schemaVersion);
      if (!step) {
        return {
          ok: false,
          error: {
            code: "missing-document-migration",
            message: LIBRARY_MESSAGES.documentMigrationMissing(
              current.schemaVersion
            ),
            from: current.schemaVersion,
            to: current.schemaVersion + 1,
          },
        };
      }
      const next = apply ? step.fn(current) : current;
      current = { ...next, schemaVersion: current.schemaVersion + 1 };
      report.documentSteps.push({
        from: current.schemaVersion - 1,
        to: current.schemaVersion,
      });
    }

    // Block-level migrations: apply until a block reaches a version with no migration.
    const changed = new Set<string>();
    const migrated = mapBlocks(current, (block) => {
      let b = block;
      let guard = 0;
      while (this.blockMigrations.has(`${b.type}@${b.version}`)) {
        if (guard++ > 100) break; // safety against a mis-registered infinite chain
        const fn = this.blockMigrations.get(`${b.type}@${b.version}`)!;
        report.blockSteps.push({
          type: b.type,
          from: b.version,
          to: b.version + 1,
          blockId: b.id,
        });
        const nextBlock = apply ? fn(b) : b;
        b = { ...nextBlock, version: b.version + 1 };
        changed.add(b.id);
      }
      return b;
    });

    report.changedBlockIds = [...changed];
    return { ok: true, document: apply ? migrated : current, report };
  }
}

export function createMigrationRegistry(): MigrationRegistry {
  return new MigrationRegistryImpl();
}
