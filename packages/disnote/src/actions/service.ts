import { canonicalJson, type JsonValue } from "../core/index.js";
import { ACTION_ERRORS, type ButtonActionPolicy, type ButtonActionReceipt, type ButtonDomainFactories, type ButtonTransactionRepository, type DocumentButtonAction } from "./model.js";
/** Domain services write into a private draft; only one outer CAS makes the button visible. */
export class DocumentButtonActionService {
  constructor(private readonly repository: ButtonTransactionRepository, private readonly factories: ButtonDomainFactories, private readonly policy: ButtonActionPolicy) {}
  async execute(actor: string, id: string, expectedRevision: number, idempotencyKey: string, actions: DocumentButtonAction[]): Promise<ButtonActionReceipt> {
    await this.policy.assert(actor, id);
    if (typeof idempotencyKey !== "string" || !idempotencyKey || idempotencyKey.length > 200 || !Array.isArray(actions) || !actions.length || actions.length > 100 || !Number.isInteger(expectedRevision) || expectedRevision < 1) throw new Error(ACTION_ERRORS.INVALID);
    const stored = await this.repository.read(id); if (!stored) throw new Error(ACTION_ERRORS.MISSING);
    const receiptKey = JSON.stringify([actor, idempotencyKey]), fingerprint = canonicalJson(actions as unknown as JsonValue);
    if (fingerprint.length > 5_000_000) throw new Error(ACTION_ERRORS.INVALID);
    if (Object.prototype.hasOwnProperty.call(stored.receipts, receiptKey)) {
      const previous = stored.receipts[receiptKey]!; if (previous.fingerprint !== fingerprint) throw new Error(ACTION_ERRORS.INVALID); return structuredClone(previous.receipt);
    }
    if (stored.revision !== expectedRevision) throw new Error(ACTION_ERRORS.CONFLICT);
    const draft = structuredClone(stored), changed = new Set<string>();
    const workspace = this.factories.workspace({ async read(workspaceId) { return workspaceId === draft.workspace.id ? structuredClone(draft.workspace) : null; }, async write(snapshot, expected) { if (snapshot.id !== draft.workspace.id || expected !== draft.workspace.revision) return false; draft.workspace = structuredClone(snapshot); return true; } });
    const database = this.factories.database({ async read(databaseId) { return structuredClone(draft.databases.find(db => db.id === databaseId) ?? null); }, async write(snapshot, expected) { const index = draft.databases.findIndex(db => db.id === snapshot.id); if (index < 0 || draft.databases[index]?.revision !== expected) return false; draft.databases[index] = structuredClone(snapshot); changed.add(snapshot.id); return true; } });
    for (const action of actions) {
      if (action.kind === "workspace") await workspace.execute(actor, draft.workspace.id, draft.workspace.revision, [action.action]);
      else {
        const snapshot = draft.databases.find(db => db.id === action.databaseId); if (!snapshot) throw new Error(ACTION_ERRORS.MISSING);
        if (action.kind === "upsertRecord") await database.upsertRecord(actor, snapshot.id, action.record, snapshot.revision);
        else if (action.kind === "deleteRecord") await database.deleteRecord(actor, snapshot.id, action.recordId, snapshot.revision);
        else throw new Error(ACTION_ERRORS.INVALID);
      }
    }
    draft.revision++;
    const receipt = { revision: draft.revision, changedDatabases: [...changed] };
    Object.defineProperty(draft.receipts, receiptKey, { value: { fingerprint, receipt }, enumerable: true, configurable: true, writable: true });
    if (!await this.repository.write(draft, stored.revision)) throw new Error(ACTION_ERRORS.CONFLICT);
    return structuredClone(receipt);
  }
}
