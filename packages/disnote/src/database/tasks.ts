import { DATABASE_ERRORS, PROPERTY_TYPES, type DatabaseRecord, type DatabaseSnapshot } from "./model.js";
import { DATABASE_DAY_MS, shiftToWorkingDays } from "./dates.js";
function invalid(): never { throw new Error(DATABASE_ERRORS.INVALID); }
/** Kahn traversal avoids recursion limits for long task chains. */
function ordered(records: DatabaseRecord[], edges: (record: DatabaseRecord) => string[]): DatabaseRecord[] {
  const byId = new Map(records.map(record => [record.id, record])), counts = new Map<string, number>(), children = new Map<string, string[]>();
  for (const record of records) {
    const refs = edges(record);
    if (refs.length > 100 || refs.some(id => typeof id !== "string" || id === record.id || !byId.has(id)) || new Set(refs).size !== refs.length) invalid();
    counts.set(record.id, refs.length);
    for (const id of refs) { const list = children.get(id) ?? []; list.push(record.id); children.set(id, list); }
  }
  const queue = records.filter(record => !counts.get(record.id));
  for (let at = 0; at < queue.length; at++) for (const child of children.get(queue[at]!.id) ?? []) {
    const count = counts.get(child)! - 1; counts.set(child, count); if (!count) queue.push(byId.get(child)!);
  }
  if (queue.length !== records.length) throw new Error(DATABASE_ERRORS.CYCLE);
  return queue;
}
export function validateTaskGraph(database: DatabaseSnapshot): DatabaseRecord[] {
  if (database.taskSchedule !== undefined && (!database.taskSchedule || typeof database.taskSchedule !== "object" || Array.isArray(database.taskSchedule))) invalid();
  for (const record of database.records) if ((record.parentId !== undefined && (typeof record.parentId !== "string" || !record.parentId)) || (record.dependencies !== undefined && !Array.isArray(record.dependencies))) invalid();
  ordered(database.records, record => record.parentId ? [record.parentId] : []);
  const order = ordered(database.records, record => record.dependencies ?? []), schedule = database.taskSchedule;
  if (schedule?.avoidWeekends !== undefined && typeof schedule.avoidWeekends !== "boolean") invalid();
  if (schedule && (typeof schedule.autoShift !== "boolean" || !database.properties.some(property => property.id === schedule.startPropertyId && property.type === PROPERTY_TYPES.DATE) || (schedule.endPropertyId !== undefined && (!database.properties.some(property => property.id === schedule.endPropertyId && property.type === PROPERTY_TYPES.DATE) || schedule.endPropertyId === schedule.startPropertyId)))) invalid();
  return order;
}
/** Forward-only rescheduling. The service authorizes every resulting row before CAS. */
export function applyTaskSchedule(database: DatabaseSnapshot): void {
  const order = validateTaskGraph(database), schedule = database.taskSchedule;
  if (!schedule) return;
  const byId = new Map(database.records.map(record => [record.id, record]));
  const date = (record: DatabaseRecord, id: string): { raw: string; time: number } | null => {
    const raw = record.values[id]; if (raw == null) return null;
    if (typeof raw !== "string" || !Number.isFinite(Date.parse(raw))) return invalid(); return { raw, time: Date.parse(raw) };
  };
  for (const record of order) {
    const start = date(record, schedule.startPropertyId), end = schedule.endPropertyId ? date(record, schedule.endPropertyId) : null;
    if (end && (!start || end.time < start.time)) invalid();
    if (!schedule.autoShift || !start) continue;
    let required = start.time;
    for (const dependency of record.dependencies ?? []) {
      const predecessor = byId.get(dependency)!;
      const finish = (schedule.endPropertyId ? date(predecessor, schedule.endPropertyId) : null) ?? date(predecessor, schedule.startPropertyId);
      if (finish) required = Math.max(required, finish.time + (/^\d{4}-\d{2}-\d{2}$/.test(finish.raw) ? DATABASE_DAY_MS : 0));
    }
    if (schedule.avoidWeekends) required = shiftToWorkingDays(required, end ? end.time - start.time : 0);
    if (required === start.time) continue;
    const format = (time: number, raw: string) => { if (!Number.isFinite(time) || Math.abs(time) > 8640000000000000) return invalid(); const iso = new Date(time).toISOString(); return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? iso.slice(0, 10) : iso; };
    record.values[schedule.startPropertyId] = format(required, start.raw);
    if (end && schedule.endPropertyId) record.values[schedule.endPropertyId] = format(required + end.time - start.time, end.raw);
  }
}
export function projectTaskLinks(record: DatabaseRecord, readable: Set<string>): DatabaseRecord {
  const { parentId, dependencies, ...rest } = record;
  return { ...rest, ...(parentId && readable.has(parentId) ? { parentId } : {}), ...(dependencies ? { dependencies: dependencies.filter(id => readable.has(id)) } : {}) };
}
