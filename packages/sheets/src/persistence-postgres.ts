import { SPREADSHEET_ERRORS } from "./constants.js";
import type { WorkbookStateRepository, WorkbookStoreState } from "./persistence.js";

export const POSTGRES_WORKBOOK_DEFAULT_TABLE = "disnote_workbooks";

export interface SpreadsheetSqlResult<Row = Record<string, unknown>> { rows: Row[]; rowCount: number | null }
export interface SpreadsheetSqlExecutor { query<Row = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<SpreadsheetSqlResult<Row>> }

export class PostgresWorkbookStateRepository implements WorkbookStateRepository {
  private readonly table: string;

  constructor(private readonly sql: SpreadsheetSqlExecutor, table = POSTGRES_WORKBOOK_DEFAULT_TABLE) {
    if (!/^[a-z_][a-z0-9_]*$/iu.test(table)) throw new Error(SPREADSHEET_ERRORS.INVALID_TABLE);
    this.table = table;
  }

  async initialize(): Promise<void> {
    await this.sql.query(`CREATE TABLE IF NOT EXISTS ${this.table} (
      id TEXT PRIMARY KEY,
      revision INTEGER NOT NULL CHECK (revision > 0),
      state JSONB NOT NULL
    )`);
  }

  async read(id: string): Promise<WorkbookStoreState | null> {
    const result = await this.sql.query<{ state: WorkbookStoreState | string }>(`SELECT state FROM ${this.table} WHERE id = $1`, [id]);
    const value = result.rows[0]?.state;
    return value === undefined ? null : structuredClone(typeof value === "string" ? JSON.parse(value) as WorkbookStoreState : value);
  }

  async write(state: WorkbookStoreState, expectedRevision: number | null): Promise<boolean> {
    const values = [state.id, state.revision, JSON.stringify(state)];
    if (expectedRevision === null) {
      const result = await this.sql.query(`INSERT INTO ${this.table} (id, revision, state) VALUES ($1, $2, $3::jsonb) ON CONFLICT DO NOTHING`, values);
      return result.rowCount === 1;
    }
    const result = await this.sql.query(`UPDATE ${this.table} SET revision = $2, state = $3::jsonb WHERE id = $1 AND revision = $4`, [...values, expectedRevision]);
    return result.rowCount === 1;
  }
}
