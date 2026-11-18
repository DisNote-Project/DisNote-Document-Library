import { SPREADSHEET_ERRORS } from "./constants.js";
import type { SpreadsheetWorkbook } from "./model.js";
import { assertWorkbook } from "./validation.js";

export interface WorkbookStoreState {
  id: string;
  revision: number;
  workbook: SpreadsheetWorkbook;
  idempotency: Record<string, number>;
}

export interface WorkbookStateRepository {
  read(id: string): Promise<WorkbookStoreState | null>;
  write(state: WorkbookStoreState, expectedRevision: number | null): Promise<boolean>;
}

export type CreateWorkbookResult = { ok: true; workbook: SpreadsheetWorkbook } | { ok: false; reason: "already-exists" };
export type SaveWorkbookResult = { ok: true; workbook: SpreadsheetWorkbook; idempotent: boolean } | { ok: false; reason: "not-found" | "revision-conflict"; currentRevision?: number };

export class RevisionWorkbookRepository {
  constructor(private readonly states: WorkbookStateRepository) {}

  async create(workbook: SpreadsheetWorkbook): Promise<CreateWorkbookResult> {
    const candidate = structuredClone(assertWorkbook(workbook));
    candidate.revision = 1;
    const state: WorkbookStoreState = { id: candidate.id, revision: 1, workbook: candidate, idempotency: {} };
    return await this.states.write(state, null) ? { ok: true, workbook: structuredClone(candidate) } : { ok: false, reason: "already-exists" };
  }

  async get(id: string): Promise<SpreadsheetWorkbook | null> {
    const state = await this.states.read(id);
    return state ? structuredClone(state.workbook) : null;
  }

  async save(input: { workbook: SpreadsheetWorkbook; expectedRevision: number; idempotencyKey: string }): Promise<SaveWorkbookResult> {
    if (!input.idempotencyKey) throw new Error(SPREADSHEET_ERRORS.INVALID_WORKBOOK);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = await this.states.read(input.workbook.id);
      if (!current) return { ok: false, reason: "not-found" };
      const completedRevision = current.idempotency[input.idempotencyKey];
      if (completedRevision !== undefined) return { ok: true, workbook: structuredClone(current.workbook), idempotent: true };
      if (current.revision !== input.expectedRevision) return { ok: false, reason: "revision-conflict", currentRevision: current.revision };
      const next = structuredClone(assertWorkbook(input.workbook));
      next.revision = current.revision + 1;
      const state: WorkbookStoreState = {
        id: current.id,
        revision: next.revision,
        workbook: next,
        idempotency: { ...current.idempotency, [input.idempotencyKey]: next.revision },
      };
      if (await this.states.write(state, current.revision)) return { ok: true, workbook: structuredClone(next), idempotent: false };
    }
    const latest = await this.states.read(input.workbook.id);
    return { ok: false, reason: "revision-conflict", ...(latest ? { currentRevision: latest.revision } : {}) };
  }
}

export class InMemoryWorkbookStateRepository implements WorkbookStateRepository {
  private readonly states = new Map<string, WorkbookStoreState>();

  async read(id: string): Promise<WorkbookStoreState | null> {
    const value = this.states.get(id);
    return value ? structuredClone(value) : null;
  }

  async write(state: WorkbookStoreState, expectedRevision: number | null): Promise<boolean> {
    const current = this.states.get(state.id);
    if (expectedRevision === null) {
      if (current) return false;
    } else if (!current || current.revision !== expectedRevision) return false;
    this.states.set(state.id, structuredClone(state));
    return true;
  }
}
