import { compareCells, evaluateFormula, matchesFilter, validateFilter } from "./evaluate.js";
import { validateDatabaseSnapshot } from "./validation.js";
import { DATABASE_ERRORS, PROPERTY_TYPES, type CellValue, type DatabasePolicy, type DatabaseQuery, type DatabaseQueryResult, type DatabaseRecord, type DatabaseRepository, type DatabaseSnapshot, type DatabaseMutationResult } from "./model.js";

export class DatabaseService {
  constructor(private readonly repository: DatabaseRepository, private readonly policy: DatabasePolicy) {}

  async create(actor: string, database: Omit<DatabaseSnapshot, "revision">): Promise<DatabaseMutationResult> {
    await this.policy.assert(actor, database.id, "manage");
    const snapshot = { ...structuredClone(database), revision: 1 };
    await this.validate(actor, snapshot);
    for (const record of snapshot.records) if (!await this.policy.canWriteRecord(actor, snapshot.id, null, record)) throw new Error(DATABASE_ERRORS.DENIED);
    if (!await this.repository.write(snapshot, null)) throw new Error(DATABASE_ERRORS.CONFLICT);
    return { id: snapshot.id, revision: snapshot.revision };
  }

  async save(actor: string, snapshot: DatabaseSnapshot): Promise<DatabaseMutationResult> {
    await this.policy.assert(actor, snapshot.id, "write");
    const current = await this.read(actor, snapshot.id, "write");
    if (current.revision !== snapshot.revision) throw new Error(DATABASE_ERRORS.CONFLICT);
    if (current.title !== snapshot.title || JSON.stringify(current.properties) !== JSON.stringify(snapshot.properties)) await this.policy.assert(actor, snapshot.id, "manage");
    await this.validate(actor, snapshot, current);
    const oldRecords = new Map(current.records.map(record => [record.id, record]));
    for (const record of snapshot.records) {
      const previous = oldRecords.get(record.id) ?? null;
      if (JSON.stringify(previous) !== JSON.stringify(record) && !await this.policy.canWriteRecord(actor, snapshot.id, previous, record)) throw new Error(DATABASE_ERRORS.DENIED);
      oldRecords.delete(record.id);
    }
    for (const record of oldRecords.values()) if (!await this.policy.canWriteRecord(actor, snapshot.id, record, null)) throw new Error(DATABASE_ERRORS.DENIED);
    const next = { ...structuredClone(snapshot), revision: snapshot.revision + 1 };
    if (!await this.repository.write(next, snapshot.revision)) throw new Error(DATABASE_ERRORS.CONFLICT);
    return { id: next.id, revision: next.revision };
  }

  async upsertRecord(actor: string, id: string, record: DatabaseRecord, expectedRevision: number): Promise<DatabaseMutationResult> {
    const database = await this.read(actor, id, "write");
    if (database.revision !== expectedRevision) throw new Error(DATABASE_ERRORS.CONFLICT);
    const index = database.records.findIndex(r => r.id === record.id);
    if (index < 0) database.records.push(structuredClone(record));
    else database.records[index] = structuredClone(record);
    return this.save(actor, database);
  }

  async deleteRecord(actor: string, id: string, recordId: string, expectedRevision: number): Promise<DatabaseMutationResult> {
    const database = await this.read(actor, id, "write");
    if (database.revision !== expectedRevision) throw new Error(DATABASE_ERRORS.CONFLICT);
    database.records = database.records.filter(r => r.id !== recordId);
    return this.save(actor, database);
  }

  async query(actor: string, id: string, query: DatabaseQuery = {}): Promise<DatabaseQueryResult> {
    const database = await this.read(actor, id, "read");
    const offset = query.offset ?? 0, limit = query.limit ?? 50;
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error(DATABASE_ERRORS.LIMIT);
    const propertyIds = new Set(database.properties.map(p => p.id));
    if (query.filter) validateFilter(query.filter, propertyIds);
    for (const sort of query.sort ?? []) if (!propertyIds.has(sort.propertyId)) throw new Error(DATABASE_ERRORS.INVALID);
    if (query.groupBy && !propertyIds.has(query.groupBy)) throw new Error(DATABASE_ERRORS.INVALID);
    const rows: DatabaseRecord[] = [];
    for (const record of database.records) {
      if (!await this.policy.canReadRecord(actor, id, record)) continue;
      const values: Record<string, CellValue> = Object.create(null);
      for (const property of database.properties) values[property.id] = await this.cell(actor, database, record, property.id, new Set());
      if (!query.filter || matchesFilter(values, query.filter)) rows.push({ ...record, values });
    }
    rows.sort((a, b) => {
      for (const sort of query.sort ?? []) {
        const order = compareCells(a.values[sort.propertyId] ?? null, b.values[sort.propertyId] ?? null);
        if (order) return sort.direction === "desc" ? -order : order;
      }
      return a.id.localeCompare(b.id);
    });
    const records = rows.slice(offset, offset + limit);
    const groups = new Map<string, DatabaseRecord[]>();
    if (query.groupBy) for (const record of records) {
      const key = String(record.values[query.groupBy] ?? "");
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }
    const { records: _records, ...metadata } = database;
    return { database: metadata, records, total: rows.length, groups: [...groups].map(([key, grouped]) => ({ key, records: grouped })) };
  }

  private async read(actor: string, id: string, action: "read" | "write"): Promise<DatabaseSnapshot> {
    await this.policy.assert(actor, id, action);
    const database = await this.repository.read(id);
    if (!database) throw new Error(DATABASE_ERRORS.MISSING);
    return structuredClone(database);
  }

  private async cell(actor: string, database: DatabaseSnapshot, record: DatabaseRecord, propertyId: string, stack: Set<string>): Promise<CellValue> {
    const key = JSON.stringify([database.id, record.id, propertyId]);
    if (stack.has(key) || stack.size > 32) throw new Error(DATABASE_ERRORS.CYCLE);
    const property = database.properties.find(p => p.id === propertyId);
    if (!property) throw new Error(DATABASE_ERRORS.INVALID);
    const next = new Set(stack).add(key);
    if (property.type === PROPERTY_TYPES.FORMULA) {
      if (!property.formula) throw new Error(DATABASE_ERRORS.INVALID);
      return evaluateFormula(property.formula, id => this.cell(actor, database, record, id, next));
    }
    if (property.type === PROPERTY_TYPES.ROLLUP) {
      const config = property.rollup;
      const relation = database.properties.find(p => p.id === config?.relationId);
      if (!config || relation?.type !== PROPERTY_TYPES.RELATION || !relation.targetDatabaseId) throw new Error(DATABASE_ERRORS.INVALID);
      const target = await this.read(actor, relation.targetDatabaseId, "read");
      const ids = record.values[relation.id];
      const values: CellValue[] = [];
      for (const row of target.records) if (Array.isArray(ids) && ids.includes(row.id) && await this.policy.canReadRecord(actor, target.id, row)) values.push(await this.cell(actor, target, row, config.propertyId, next));
      if (config.aggregate === "count") return values.length;
      const numbers = values.filter((v): v is number => typeof v === "number");
      if (!numbers.length) return null;
      const sum = numbers.reduce((a, b) => a + b, 0);
      switch (config.aggregate) {
        case "sum": return sum;
        case "average": return sum / numbers.length;
        case "min": return Math.min(...numbers);
        case "max": return Math.max(...numbers);
      }
    }
    const value = record.values[propertyId] ?? null;
    // Relation IDs can themselves reveal hidden records; project only readable IDs.
    if (property.type === PROPERTY_TYPES.RELATION && Array.isArray(value) && property.targetDatabaseId) {
      const target = await this.read(actor, property.targetDatabaseId, "read");
      const visible: string[] = [];
      for (const row of target.records) if (value.includes(row.id) && await this.policy.canReadRecord(actor, target.id, row)) visible.push(row.id);
      return visible;
    }
    return structuredClone(value);
  }

  private async validate(actor: string, database: DatabaseSnapshot, previous?: DatabaseSnapshot): Promise<void> {
    validateDatabaseSnapshot(database);
    for (const record of database.records) {
      for (const [id, value] of Object.entries(record.values)) {
        const property = database.properties.find(p => p.id === id)!;
        if (property.type === PROPERTY_TYPES.RELATION && Array.isArray(value)) {
          if (previous && previous.properties.find(p => p.id === id)?.targetDatabaseId === property.targetDatabaseId && JSON.stringify(previous.records.find(r => r.id === record.id)?.values[id]) === JSON.stringify(value)) continue;
          const target = property.targetDatabaseId === database.id ? database : await this.read(actor, property.targetDatabaseId!, "read");
          for (const linkedId of value) {
            const linked = target.records.find(r => r.id === linkedId);
            if (!linked || !await this.policy.canReadRecord(actor, target.id, linked)) throw new Error(DATABASE_ERRORS.DENIED);
          }
        }
      }
    }
  }
}
