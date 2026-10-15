import { useEffect, useState, type ReactNode } from "react";
import { PROPERTY_TYPES, type CellValue, type DatabaseProperty, type DatabaseQuery, type DatabaseRecord } from "../model.js";
import { uiMessages } from "../../ui/messages.js";
import { useDatabaseView } from "./useDatabaseView.js";
import type { DatabaseViewProvider } from "./context.js";
export type DatabaseViewKind = "table" | "board" | "list" | "gallery" | "calendar" | "timeline" | "map";
export interface DatabaseViewProps {
  databaseId: string;
  view?: DatabaseViewKind;
  query?: DatabaseQuery;
  groupPropertyId?: string;
  datePropertyId?: string;
  endDatePropertyId?: string;
  latitudePropertyId?: string;
  longitudePropertyId?: string;
  locale?: string;
  provider?: DatabaseViewProvider;
  readonly?: boolean;
  onOpenRecord?: (record: DatabaseRecord) => void;
}
function display(value: CellValue | undefined): string { return value === null || value === undefined ? "" : Array.isArray(value) ? value.join(", ") : String(value); }
function defaults(properties: DatabaseProperty[]): Record<string, CellValue> {
  return Object.fromEntries(properties.filter(p => p.type !== PROPERTY_TYPES.FORMULA && p.type !== PROPERTY_TYPES.ROLLUP).map(p => [p.id, null]));
}
export function DatabaseView(props: DatabaseViewProps): ReactNode {
  const messages = uiMessages(props.locale), view = props.view ?? "table";
  const [offset, setOffset] = useState(0), [editing, setEditing] = useState<DatabaseRecord | null>(null), [error, setError] = useState(false), [busy, setBusy] = useState(false);
  const [editingRevision, setEditingRevision] = useState<number>();
  const [month, setMonth] = useState(() => { const date = new Date(); return { year: date.getFullYear(), month: date.getMonth() }; });
  const limit = props.query?.limit ?? 25;
  const state = useDatabaseView(props.databaseId, { ...props.query, offset, limit, ...(props.groupPropertyId ? { groupBy: props.groupPropertyId } : {}) }, props.provider);
  useEffect(() => { setOffset(props.query?.offset ?? 0); }, [props.databaseId, JSON.stringify(props.query)]);
  useEffect(() => { setEditing(null); setEditingRevision(undefined); }, [props.databaseId]);
  const submit = async () => {
    if (!editing) return;
    setBusy(true); setError(false);
    try { await state.save(editing, editingRevision); setEditing(null); } catch { setError(true); } finally { setBusy(false); }
  };
  const remove = async (id: string) => { setBusy(true); setError(false); try { await state.remove(id); } catch { setError(true); } finally { setBusy(false); } };
  if (!state.provider) return <p role="status">{messages.unavailable}</p>;
  if (state.loading && !state.data) return <p role="status">{messages.loading}</p>;
  if (state.failed) return <div role="alert">{messages.failed} <button type="button" onClick={() => void state.reload()}>{messages.retry}</button></div>;
  if (!state.data) return null;
  const { data } = state;
  const writable = !props.readonly && !!state.provider.upsertRecord;
  const recordLabel = (record: DatabaseRecord) => display(record.values[data.database.properties.find(p => p.type === PROPERTY_TYPES.TEXT)?.id ?? ""]) || record.id;
  const controls = (record: DatabaseRecord) => <>
    {props.onOpenRecord && <button type="button" onClick={() => props.onOpenRecord?.(record)}>{recordLabel(record)}</button>}
    {writable && <button type="button" disabled={busy} onClick={() => { setEditingRevision(data.database.revision); setEditing({ ...record, values: Object.fromEntries(data.database.properties.filter(p => p.type !== PROPERTY_TYPES.FORMULA && p.type !== PROPERTY_TYPES.ROLLUP).map(p => [p.id, record.values[p.id] ?? null])) }); setError(false); }}>{messages.edit}</button>}
    {!props.readonly && state.provider?.deleteRecord && <button type="button" disabled={busy} onClick={() => void remove(record.id)}>{messages.remove}</button>}
  </>;
  const card = (record: DatabaseRecord) => <article key={record.id} style={{ border: "1px solid currentColor", borderRadius: 6, padding: 12 }}><strong>{recordLabel(record)}</strong><dl>{data.database.properties.map(p => <div key={p.id}><dt>{p.name}</dt><dd>{display(record.values[p.id])}</dd></div>)}</dl>{controls(record)}</article>;
  let body: ReactNode;
  if (view === "table") body = <div style={{ overflowX: "auto" }}><table><thead><tr>{data.database.properties.map(p => <th key={p.id} scope="col">{p.name}</th>)}<th scope="col">{messages.record}</th></tr></thead><tbody>{data.records.map(r => <tr key={r.id}>{data.database.properties.map(p => <td key={p.id}>{display(r.values[p.id])}</td>)}<td>{controls(r)}</td></tr>)}</tbody></table></div>;
  else if (view === "board") {
    const groupId = props.groupPropertyId ?? data.database.properties.find(p => p.type === PROPERTY_TYPES.SELECT)?.id;
    const keys = new Set([...(data.database.properties.find(p => p.id === groupId)?.options ?? []), ...data.records.map(r => display(r.values[groupId ?? ""]))]);
    body = <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>{[...keys].map(key => <section key={key} style={{ minWidth: 220 }}><h4>{key || messages.ungrouped}</h4>{data.records.filter(r => display(r.values[groupId ?? ""]) === key).map(card)}</section>)}</div>;
  } else if (view === "calendar" || view === "timeline") {
    const dateId = props.datePropertyId ?? data.database.properties.find(p => p.type === PROPERTY_TYPES.DATE)?.id;
    const groups = new Map<string, DatabaseRecord[]>();
    for (const record of data.records) { const key = display(record.values[dateId ?? ""]).slice(0, 10); groups.set(key, [...(groups.get(key) ?? []), record]); }
    if (view === "calendar") {
      const first = new Date(Date.UTC(month.year, month.month, 1)), start = new Date(first); start.setUTCDate(1 - (first.getUTCDay() + 6) % 7);
      const changeMonth = (delta: number) => { const date = new Date(Date.UTC(month.year, month.month + delta, 1)); setMonth({ year: date.getUTCFullYear(), month: date.getUTCMonth() }); };
      body = <div style={{ overflowX: "auto" }}><nav aria-label={messages.calendar}><button type="button" onClick={() => changeMonth(-1)}>{messages.previous}</button> <strong>{new Intl.DateTimeFormat(props.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(first)}</strong> <button type="button" onClick={() => changeMonth(1)}>{messages.next}</button></nav>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(100px,1fr))", minWidth: 700, gap: 4 }}>{Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setUTCDate(start.getUTCDate() + index); const key = date.toISOString().slice(0, 10); return <section key={key} style={{ border: "1px solid currentColor", minHeight: 70, padding: 4, opacity: date.getUTCMonth() === month.month ? 1 : 0.5 }}><time dateTime={key}>{date.getUTCDate()}</time>{(groups.get(key) ?? []).map(card)}</section>; })}</div>
        {(groups.get("") ?? []).length > 0 && <section><h4>{messages.ungrouped}</h4>{groups.get("")!.map(card)}</section>}
      </div>;
    } else {
      const dated = data.records.map(record => ({ record, start: Date.parse(display(record.values[dateId ?? ""])), end: Date.parse(display(record.values[props.endDatePropertyId ?? dateId ?? ""])) })).filter(row => Number.isFinite(row.start));
      const minimum = Math.min(...dated.map(row => row.start)), maximum = Math.max(...dated.map(row => Number.isFinite(row.end) ? Math.max(row.start, row.end) : row.start)), span = Math.max(86_400_000, maximum - minimum);
      body = <div>{dated.sort((a, b) => a.start - b.start).map(row => <section key={row.record.id}><span>{recordLabel(row.record)}</span><div style={{ height: 24, marginLeft: `${(row.start - minimum) / span * 90}%`, width: `${Math.max(2, ((Number.isFinite(row.end) ? Math.max(row.start, row.end) : row.start) - row.start) / span * 90)}%`, background: "currentColor", opacity: 0.4 }} />{card(row.record)}</section>)}{(groups.get("") ?? []).map(card)}</div>;
    }
  } else if (view === "map") {
    const latitudeId = props.latitudePropertyId ?? "latitude", longitudeId = props.longitudePropertyId ?? "longitude";
    body = <svg viewBox="0 0 600 300" role="img" aria-label={messages.map} style={{ width: "100%", border: "1px solid currentColor" }}><rect width="600" height="300" fill="currentColor" opacity="0.05" />{Array.from({ length: 7 }, (_, index) => <line key={`x${index}`} x1={index * 100} x2={index * 100} y1="0" y2="300" stroke="currentColor" opacity="0.2" />)}{Array.from({ length: 4 }, (_, index) => <line key={`y${index}`} x1="0" x2="600" y1={index * 100} y2={index * 100} stroke="currentColor" opacity="0.2" />)}{data.records.map(record => { const latitude = record.values[latitudeId], longitude = record.values[longitudeId]; if (typeof latitude !== "number" || typeof longitude !== "number" || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null; return <circle key={record.id} cx={(longitude + 180) / 360 * 600} cy={(90 - latitude) / 180 * 300} r="6" fill="currentColor" onClick={() => props.onOpenRecord?.(record)}><title>{recordLabel(record)} ({latitude}, {longitude})</title></circle>; })}</svg>;
  } else body = <div style={{ display: "grid", gridTemplateColumns: view === "gallery" ? "repeat(auto-fit,minmax(220px,1fr))" : "1fr", gap: 12 }}>{data.records.map(card)}</div>;
  return <section aria-label={data.database.title}>
    <h3>{data.database.title}</h3>{error && <p role="alert">{messages.failed}</p>}
    {writable && <button type="button" onClick={() => { setEditingRevision(data.database.revision); setEditing({ id: state.provider?.createId?.() ?? crypto.randomUUID(), values: defaults(data.database.properties) }); }}>{messages.add}</button>}
    {editing && <form aria-label={messages.edit} onSubmit={e => { e.preventDefault(); void submit(); }}>
      {data.database.properties.filter(p => p.type !== PROPERTY_TYPES.FORMULA && p.type !== PROPERTY_TYPES.ROLLUP).map(p => <label key={p.id} style={{ display: "block" }}>{p.name}<CellInput property={p} value={editing.values[p.id] ?? null} onChange={value => setEditing({ ...editing, values: { ...editing.values, [p.id]: value } })} /></label>)}
      <button disabled={busy} type="submit">{messages.save}</button><button disabled={busy} type="button" onClick={() => setEditing(null)}>{messages.cancel}</button>
    </form>}
    {data.records.length ? body : <p>{messages.empty}</p>}
    <nav aria-label={messages.record}><button type="button" disabled={offset === 0 || state.loading} onClick={() => setOffset(Math.max(0, offset - limit))}>{messages.previous}</button> <span>{Math.min(offset + 1, data.total)}–{Math.min(offset + limit, data.total)} / {data.total}</span> <button type="button" disabled={offset + limit >= data.total || state.loading} onClick={() => setOffset(offset + limit)}>{messages.next}</button></nav>
  </section>;
}
function CellInput({ property, value, onChange }: { property: DatabaseProperty; value: CellValue; onChange: (value: CellValue) => void }): ReactNode {
  if (property.type === PROPERTY_TYPES.CHECKBOX) return <input type="checkbox" checked={value === true} onChange={e => onChange(e.target.checked)} />;
  if (property.type === PROPERTY_TYPES.SELECT) return <select value={display(value)} onChange={e => onChange(e.target.value || null)}><option value="" />{property.options?.map(option => <option key={option}>{option}</option>)}</select>;
  if (property.type === PROPERTY_TYPES.MULTI_SELECT) return <select multiple value={Array.isArray(value) ? value : []} onChange={e => onChange([...e.target.selectedOptions].map(o => o.value))}>{property.options?.map(option => <option key={option}>{option}</option>)}</select>;
  return <input step={property.type === PROPERTY_TYPES.NUMBER ? "any" : undefined} type={property.type === PROPERTY_TYPES.NUMBER ? "number" : property.type === PROPERTY_TYPES.DATE ? "date" : "text"} value={property.type === PROPERTY_TYPES.DATE ? display(value).slice(0, 10) : display(value)} onChange={e => {
    const raw = e.target.value;
    onChange(!raw ? null : property.type === PROPERTY_TYPES.NUMBER ? Number(raw) : property.type === PROPERTY_TYPES.RELATION || property.type === PROPERTY_TYPES.PERSON ? raw.split(",").map(v => v.trim()).filter(Boolean) : raw);
  }} />;
}
