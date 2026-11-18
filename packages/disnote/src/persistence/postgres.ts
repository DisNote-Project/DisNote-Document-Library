import type { BlockRegistry } from "../core/index.js";
import {
  RevisionDocumentRepository,
  type DocumentStateRepository,
  type DocumentStoreState,
} from "../storage/revision-repository.js";

export const POSTGRES_DOCUMENT_STATE_DEFAULT_TABLE = "disnote_document_states";
export const POSTGRES_DOCUMENT_STATE_ERRORS = {
  INVALID_TABLE: "postgres-document-table-invalid",
} as const;

export interface SqlQueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
}

/** Structural port implemented by pg Pool, pg Client and compatible drivers. */
export interface SqlExecutor {
  query<Row = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<SqlQueryResult<Row>>;
}

interface PostgresStateRow {
  state: DocumentStoreState | string;
}

export class PostgresDocumentStateRepository implements DocumentStateRepository {
  private readonly table: string;

  constructor(private readonly sql: SqlExecutor, table = POSTGRES_DOCUMENT_STATE_DEFAULT_TABLE) {
    if (!/^[a-z_][a-z0-9_]*$/i.test(table)) {
      throw new Error(POSTGRES_DOCUMENT_STATE_ERRORS.INVALID_TABLE);
    }
    this.table = table;
  }

  async initialize(): Promise<void> {
    await this.sql.query(`CREATE TABLE IF NOT EXISTS ${this.table} (
      id TEXT PRIMARY KEY,
      revision INTEGER NOT NULL CHECK (revision > 0),
      slug TEXT NOT NULL,
      locale TEXT NOT NULL,
      state JSONB NOT NULL,
      UNIQUE (slug, locale)
    )`);
    await this.sql.query(
      `CREATE INDEX IF NOT EXISTS ${this.table}_updated_at_idx ON ${this.table} ((state->'stored'->>'updatedAt'))`,
    );
  }

  async read(id: string): Promise<DocumentStoreState | null> {
    const result = await this.sql.query<PostgresStateRow>(
      `SELECT state FROM ${this.table} WHERE id = $1`,
      [id],
    );
    return parseState(result.rows[0]?.state);
  }

  async findBySlug(query: { slug: string; locale: string }): Promise<DocumentStoreState | null> {
    const result = await this.sql.query<PostgresStateRow>(
      `SELECT state FROM ${this.table} WHERE slug = $1 AND locale = $2`,
      [query.slug, query.locale],
    );
    return parseState(result.rows[0]?.state);
  }

  async write(state: DocumentStoreState, expectedRevision: number | null): Promise<boolean> {
    const values = [state.id, state.revision, state.stored.slug, state.stored.locale, JSON.stringify(state)];
    if (expectedRevision === null) {
      const result = await this.sql.query(
        `INSERT INTO ${this.table} (id, revision, slug, locale, state)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT DO NOTHING`,
        values,
      );
      return result.rowCount === 1;
    }
    const result = await this.sql.query(
      `UPDATE ${this.table}
       SET revision = $2, slug = $3, locale = $4, state = $5::jsonb
       WHERE id = $1 AND revision = $6`,
      [...values, expectedRevision],
    );
    return result.rowCount === 1;
  }
}

export interface CreatePostgresDocumentRepositoryOptions {
  sql: SqlExecutor;
  registry: BlockRegistry;
  table?: string;
  now?: () => string;
}

export function createPostgresDocumentRepository(options: CreatePostgresDocumentRepositoryOptions) {
  const states = new PostgresDocumentStateRepository(options.sql, options.table);
  return { states, documents: new RevisionDocumentRepository(states, options.registry, options.now) };
}

function parseState(value: DocumentStoreState | string | undefined): DocumentStoreState | null {
  if (value === undefined) return null;
  return structuredClone(typeof value === "string" ? JSON.parse(value) as DocumentStoreState : value);
}
