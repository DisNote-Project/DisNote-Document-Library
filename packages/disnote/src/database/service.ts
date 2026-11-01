import { compareCells, evaluateFormula, matchesFilter, validateFilter } from "./evaluate.js";
import { validateDatabaseSnapshot } from "./validation.js";
import { applyDatabaseCommand } from "./commands.js";
import { applyTaskSchedule, projectTaskLinks } from "./tasks.js";
import { captureDatabaseAutomations } from "./automation/rules.js";
import type { DatabaseCommand, DatabaseChartQuery, DatabaseChartResult, DatabaseFilter } from "./model.js";
import { DATABASE_ERRORS, PROPERTY_TYPES, type CellValue, type DatabasePolicy, type DatabaseQuery, type DatabaseQueryResult, type DatabaseRecord, type DatabaseRepository, type DatabaseSnapshot, type DatabaseMutationResult } from "./model.js";

export class DatabaseService {
  constructor(private readonly repository: DatabaseRepository, private readonly policy: DatabasePolicy) {}

  async record(actor: string, id: string, recordId: string, action: "read" | "write" = "read") {
    const database = await this.read(actor, id, action), record = database.records.find(item => item.id === recordId);
    if (!record) throw new Error(DATABASE_ERRORS.MISSING);
    if (!await this.policy.canReadRecord(actor, id, record) || (action === "write" && !await this.policy.canWriteRecord(actor, id, record, record))) throw new Error(DATABASE_ERRORS.DENIED);
    const values: Record<string, CellValue> = Object.create(null);
    for (const property of database.properties) values[property.id] = await this.cell(actor, database, record, property.id, new Set());
    const readable = new Set<string>();
    for (const linked of database.records) if ((linked.id === record.parentId || record.dependencies?.includes(linked.id)) && await this.policy.canReadRecord(actor, id, linked)) readable.add(linked.id);
    return { record: { ...projectTaskLinks(record, readable), values }, properties: database.properties, revision: database.revision };
  }

  async submitForm(actor: string, id: string, viewId: string, recordId: string, values: Record<string, CellValue>, revision: number): Promise<DatabaseMutationResult> {
    const database = await this.read(actor, id, "write");
    if (database.revision !== revision || database.records.some(record => record.id === recordId)) throw new Error(DATABASE_ERRORS.CONFLICT);
    const view = database.views?.find(item => item.id === viewId && item.kind === "form");
    if (!view?.form || !values || typeof values !== "object" || Array.isArray(values)) throw new Error(DATABASE_ERRORS.INVALID);
    const fields = new Set(view.form.fields.map(field => field.propertyId));
    if (Object.keys(values).some(key => !fields.has(key)) || view.form.fields.some(field => field.required && (values[field.propertyId] == null || values[field.propertyId] === "" || (Array.isArray(values[field.propertyId]) && !(values[field.propertyId] as string[]).length)))) throw new Error(DATABASE_ERRORS.INVALID);
    database.records.push({ id: recordId, values: structuredClone(values) });
    return this.save(actor, database);
  }

  async mutate(actor: string, id: string, commands: DatabaseCommand[], expectedRevision: number): Promise<DatabaseMutationResult> {
    const database = await this.read(actor, id, "write");
    if (database.revision !== expectedRevision) throw new Error(DATABASE_ERRORS.CONFLICT);
    if (!Array.isArray(commands) || !commands.length || commands.length > 500) throw new Error(DATABASE_ERRORS.LIMIT);
    for (const command of commands) {
      if (!command || !["patch", "delete", "move", "properties", "view", "deleteView", "task", "schedule"].includes(command.kind)) throw new Error(DATABASE_ERRORS.INVALID);
      if (command.kind === "patch" && (!command.values || typeof command.values !== "object" || Array.isArray(command.values))) throw new Error(DATABASE_ERRORS.INVALID);
      if (command.kind === "properties" || command.kind === "view" || command.kind === "deleteView" || command.kind === "schedule") await this.policy.assert(actor, id, "manage");
      else {
        const record = database.records.find(item => item.id === command.recordId);
        if (!record) throw new Error(DATABASE_ERRORS.MISSING);
        if (!await this.policy.canReadRecord(actor, id, record) || !await this.policy.canWriteRecord(actor, id, record, record)) throw new Error(DATABASE_ERRORS.DENIED);
        if (command.kind === "move" && command.beforeId !== null) {
          const target = database.records.find(item => item.id === command.beforeId);
          if (!target || !await this.policy.canReadRecord(actor, id, target)) throw new Error(DATABASE_ERRORS.DENIED);
        }
      }
      applyDatabaseCommand(database, command);
    }
    return this.save(actor, database);
  }

  async aggregate(actor: string, id: string, config: DatabaseChartQuery): Promise<DatabaseChartResult> {
    if (!config || !["count", "sum", "average", "min", "max"].includes(config.aggregate)) throw new Error(DATABASE_ERRORS.INVALID);
    const database = await this.read(actor, id, "read");
    if (!database.properties.some(property => property.id === config.groupPropertyId) || (config.aggregate !== "count" && !database.properties.some(property => property.id === config.valuePropertyId && [PROPERTY_TYPES.NUMBER, PROPERTY_TYPES.FORMULA, PROPERTY_TYPES.ROLLUP].includes(property.type as "number")))) throw new Error(DATABASE_ERRORS.INVALID);
    if (config.filter) validateFilter(config.filter, new Set(database.properties.map(property => property.id)));
    const groups = new Map<string, { count: number; numeric: number[] }>();
    for (const row of await this.project(actor, database, config.filter)) {
        const value = row.values[config.groupPropertyId], label = value == null ? "" : Array.isArray(value) ? value.join(", ") : String(value);
        const group = groups.get(label) ?? { count: 0, numeric: [] }; group.count++;
        const numeric = config.valuePropertyId ? row.values[config.valuePropertyId] : undefined;
        if (typeof numeric === "number" && Number.isFinite(numeric)) group.numeric.push(numeric);
        groups.set(label, group);
    }
    return { revision: database.revision, groups: [...groups].map(([label, group]) => {
      const sum = group.numeric.reduce((a, b) => a + b, 0);
      const value = config.aggregate === "count" ? group.count : !group.numeric.length ? 0 : config.aggregate === "sum" ? sum : config.aggregate === "average" ? group.numeric.reduce((average, value) => average + value / group.numeric.length, 0) : config.aggregate === "min" ? Math.min(...group.numeric) : Math.max(...group.numeric);
      if (!Number.isFinite(value)) throw new Error(DATABASE_ERRORS.INVALID);
      return { label, value, count: group.count };
    }) };
  }

  async create(actor: string, database: Omit<DatabaseSnapshot, "revision">): Promise<DatabaseMutationResult> {
    if (database.automation !== undefined) throw new Error(DATABASE_ERRORS.INVALID);
    await this.policy.assert(actor, database.id, "manage");
    const snapshot = { ...structuredClone(database), revision: 1 };
    applyTaskSchedule(snapshot);
    await this.validate(actor, snapshot);
    for (const record of snapshot.records) if (!await this.policy.canWriteRecord(actor, snapshot.id, null, record)) throw new Error(DATABASE_ERRORS.DENIED);
    if (!await this.repository.write(snapshot, null)) throw new Error(DATABASE_ERRORS.CONFLICT);
    return { id: snapshot.id, revision: snapshot.revision };
  }

  async save(actor: string, snapshot: DatabaseSnapshot): Promise<DatabaseMutationResult> {
    snapshot = structuredClone(snapshot);
    await this.policy.assert(actor, snapshot.id, "write");
    const current = await this.read(actor, snapshot.id, "write");
    if (current.revision !== snapshot.revision) throw new Error(DATABASE_ERRORS.CONFLICT);
    if (current.title !== snapshot.title || JSON.stringify(current.properties) !== JSON.stringify(snapshot.properties) || JSON.stringify(current.views) !== JSON.stringify(snapshot.views) || JSON.stringify(current.taskSchedule) !== JSON.stringify(snapshot.taskSchedule)) await this.policy.assert(actor, snapshot.id, "manage");
    applyTaskSchedule(snapshot);
    await this.validate(actor, snapshot, current);
    const oldRecords = new Map(current.records.map(record => [record.id, record]));
    for (const record of snapshot.records) {
      const previous = oldRecords.get(record.id) ?? null;
      if (JSON.stringify(previous) !== JSON.stringify(record) && ((previous && !await this.policy.canReadRecord(actor, snapshot.id, previous)) || !await this.policy.canWriteRecord(actor, snapshot.id, previous, record))) throw new Error(DATABASE_ERRORS.DENIED);
      oldRecords.delete(record.id);
    }
    for (const record of oldRecords.values()) if (!await this.policy.canWriteRecord(actor, snapshot.id, record, null)) throw new Error(DATABASE_ERRORS.DENIED);
    const next = { ...structuredClone(snapshot), revision: snapshot.revision + 1 };
    captureDatabaseAutomations(current, next, new Date().toISOString());
    if (!await this.repository.write(next, snapshot.revision)) throw new Error(DATABASE_ERRORS.CONFLICT);
    return { id: next.id, revision: next.revision };
  }

  async upsertRecord(actor: string, id: string, record: DatabaseRecord, expectedRevision: number): Promise<DatabaseMutationResult> {
    const database = await this.read(actor, id, "write");
    if (database.revision !== expectedRevision) throw new Error(DATABASE_ERRORS.CONFLICT);
    const index = database.records.findIndex(r => r.id === record.id);
    if (index < 0) database.records.push(structuredClone(record));
    else database.records[index] = { ...database.records[index]!, ...structuredClone(record) };
    return this.save(actor, database);
  }

  async deleteRecord(actor: string, id: string, recordId: string, expectedRevision: number): Promise<DatabaseMutationResult> {
    const database = await this.read(actor, id, "write");
    if (database.revision !== expectedRevision) throw new Error(DATABASE_ERRORS.CONFLICT);
    applyDatabaseCommand(database, { kind: "delete", recordId });
    return this.save(actor, database);
  }

  async query(actor: string, id: string, query: DatabaseQuery = {}): Promise<DatabaseQueryResult> {
    const database = await this.read(actor, id, "read");
    const offset = query.offset ?? 0, limit = query.limit ?? 50;
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error(DATABASE_ERRORS.LIMIT);
    const propertyIds = new Set(database.properties.map(p => p.id));
    if (query.search !== undefined && (typeof query.search !== "string" || query.search.length > 200)) throw new Error(DATABASE_ERRORS.INVALID);
    if (query.filter) validateFilter(query.filter, propertyIds);
    if (!Array.isArray(query.sort ?? []) || (query.sort?.length ?? 0) > 200) throw new Error(DATABASE_ERRORS.INVALID);
    for (const sort of query.sort ?? []) if (!propertyIds.has(sort.propertyId) || !["asc", "desc"].includes(sort.direction)) throw new Error(DATABASE_ERRORS.INVALID);
    if (query.groupBy && !propertyIds.has(query.groupBy)) throw new Error(DATABASE_ERRORS.INVALID);
    if ((query.parentId !== undefined && query.parentId !== null && typeof query.parentId !== "string") || (query.dependsOn !== undefined && typeof query.dependsOn !== "string")) throw new Error(DATABASE_ERRORS.INVALID);
    const search = query.search?.trim().toLocaleLowerCase();
    const rows = (await this.project(actor, database, query.filter)).filter(record => (query.parentId === undefined || (record.parentId ?? null) === query.parentId) && (query.dependsOn === undefined || record.dependencies?.includes(query.dependsOn)) && (!search || Object.values(record.values).some(value => value != null && String(value).toLocaleLowerCase().includes(search))));
    const positions = new Map(database.records.map((record, index) => [record.id, index]));
    rows.sort((a, b) => {
      for (const sort of query.sort ?? []) {
        const order = compareCells(a.values[sort.propertyId] ?? null, b.values[sort.propertyId] ?? null);
        if (order) return sort.direction === "desc" ? -order : order;
      }
      return positions.get(a.id)! - positions.get(b.id)!;
    });
    const records = rows.slice(offset, offset + limit);
    const groups = new Map<string, DatabaseRecord[]>();
    if (query.groupBy) for (const record of records) {
      const key = String(record.values[query.groupBy] ?? "");
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }
    const { records: _records, automation: _automation, ...metadata } = database;
    return { database: metadata, records, total: rows.length, groups: [...groups].map(([key, grouped]) => ({ key, records: grouped })) };
  }

  private async read(actor: string, id: string, action: "read" | "write"): Promise<DatabaseSnapshot> {
    await this.policy.assert(actor, id, action);
    const database = await this.repository.read(id);
    if (!database) throw new Error(DATABASE_ERRORS.MISSING);
    return structuredClone(database);
  }

  private async project(actor: string, database: DatabaseSnapshot, filter?: DatabaseFilter): Promise<DatabaseRecord[]> {
    const rows: DatabaseRecord[] = [];
    const readable = new Set<string>();
    for (const record of database.records) if (await this.policy.canReadRecord(actor, database.id, record)) readable.add(record.id);
    for (const record of database.records) {
      if (!readable.has(record.id)) continue;
      const values: Record<string, CellValue> = Object.create(null);
      for (const property of database.properties) values[property.id] = await this.cell(actor, database, record, property.id, new Set());
      if (!filter || matchesFilter(values, filter)) rows.push({ ...projectTaskLinks(record, readable), values });
    }
    return rows;
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
        case "sum": if (!Number.isFinite(sum)) throw new Error(DATABASE_ERRORS.INVALID); return sum;
        case "average": return numbers.reduce((average, value) => average + value / numbers.length, 0);
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
      const old = previous?.records.find(row => row.id === record.id);
      for (const linkedId of [...(record.parentId && record.parentId !== old?.parentId ? [record.parentId] : []), ...(record.dependencies ?? []).filter(id => !old?.dependencies?.includes(id))]) {
        const linked = database.records.find(row => row.id === linkedId);
        if (!linked || !await this.policy.canReadRecord(actor, database.id, linked)) throw new Error(DATABASE_ERRORS.DENIED);
      }
      for (const [id, value] of Object.entries(record.values)) {
        const property = database.properties.find(p => p.id === id)!;
        if (property.type === PROPERTY_TYPES.PERSON && Array.isArray(value) && this.policy.canAssignPerson) {
          const existing = previous?.records.find(row => row.id === record.id)?.values[id];
          for (const personId of value) if ((!Array.isArray(existing) || !existing.includes(personId)) && !await this.policy.canAssignPerson(actor, database.id, personId)) throw new Error(DATABASE_ERRORS.DENIED);
        }
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
