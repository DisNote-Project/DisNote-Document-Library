import { DATABASE_ERRORS, type DatabaseRecord, type CellValue } from "./model.js";
export const DATABASE_DAY_MS = 86_400_000;
const DATABASE_WEEK = { DAYS: 7, SATURDAY: 6, SUNDAY: 0 } as const;
/** Preserve duration and choose the first range with weekday UTC endpoints. */
export function shiftToWorkingDays(start: number, duration = 0): number {
  if (!Number.isFinite(start) || !Number.isFinite(duration) || duration < 0) throw new Error(DATABASE_ERRORS.INVALID);
  for (let days = 0; days < DATABASE_WEEK.DAYS; days++) {
    const candidate = start + days * DATABASE_DAY_MS;
    const weekday = (time: number) => { const day = new Date(time).getUTCDay(); return Number.isFinite(day) && day !== DATABASE_WEEK.SATURDAY && day !== DATABASE_WEEK.SUNDAY; };
    if (weekday(candidate) && weekday(candidate + duration)) return candidate;
  }
  throw new Error(DATABASE_ERRORS.INVALID);
}
/** Moving a date range preserves duration; explicit field editing remains independent. */
export function shiftRecordDates(record: DatabaseRecord, startPropertyId: string, endPropertyId: string | undefined, newStart: string): Record<string, CellValue> {
  const next = Date.parse(newStart);
  if (!Number.isFinite(next)) throw new Error(DATABASE_ERRORS.INVALID);
  const values: Record<string, CellValue> = { [startPropertyId]: newStart };
  const start = record.values[startPropertyId], end = endPropertyId ? record.values[endPropertyId] : null;
  if (endPropertyId && endPropertyId !== startPropertyId && typeof start === "string" && typeof end === "string") {
    const delta = next - Date.parse(start), shifted = Date.parse(end) + delta;
    if (!Number.isFinite(delta) || !Number.isFinite(shifted)) throw new Error(DATABASE_ERRORS.INVALID);
    const iso = new Date(shifted).toISOString(); values[endPropertyId] = end.length === 10 ? iso.slice(0, 10) : iso;
  }
  return values;
}
