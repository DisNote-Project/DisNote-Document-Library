import { CellInput } from "./CellInput.js";
import { EditableCell } from "./EditableCell.js";
import { DATABASE_DRAG } from "./database-ui.constants.js";
import { DatabaseChart } from "./DatabaseChart.js";
import { DatabaseForm } from "./DatabaseForm.js";
import { shiftRecordDates } from "../dates.js";
import { TimelineItem } from "./TimelineItem.js";
import { useDatabaseDragFeedback } from "./useDatabaseDragFeedback.js";
import type { DatabaseViewKind, DatabaseSavedView, DatabaseCommand } from "../model.js";
export type { DatabaseViewKind } from "../model.js";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PROPERTY_TYPES, type CellValue, type DatabaseProperty, type DatabaseQuery, type DatabaseRecord } from "../model.js";
import { useDatabaseMessages } from "./customization.js";
import { useDatabaseView } from "./useDatabaseView.js";
import type { DatabaseViewProvider } from "./context.js";
import { DatabaseCellValue, useDatabaseCustomization } from "./customization.js";
import { joinClassNames, type DisNoteStyle } from "../../styles/index.js";
export interface DatabaseViewProps {
  className?: string;
  style?: DisNoteStyle;
  columns?: DatabaseSavedView["columns"];
  savedView?: DatabaseSavedView;
  refreshRevision?: number;
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
  const customization = useDatabaseCustomization();
  const messages = useDatabaseMessages(props.locale), view = props.view ?? "table";
  const drag = useDatabaseDragFeedback(props.databaseId);
  const [offset, setOffset] = useState(0), [editing, setEditing] = useState<DatabaseRecord | null>(null), [error, setError] = useState(false), [busy, setBusy] = useState(false);
  const [editingRevision, setEditingRevision] = useState<number>();
  const editingOriginal = useRef<Record<string, CellValue>>({});
  const [selected, setSelected] = useState<string[]>([]), [bulkProperty, setBulkProperty] = useState(""), [bulkValue, setBulkValue] = useState<CellValue>(null);
  useEffect(() => { setSelected([]); }, [props.databaseId]);
  const [month, setMonth] = useState(() => { const date = new Date(); return { year: date.getFullYear(), month: date.getMonth() }; });
  const limit = props.query?.limit ?? 25;
  const state = useDatabaseView(props.databaseId, { ...props.query, offset, limit, ...(props.groupPropertyId ? { groupBy: props.groupPropertyId } : {}) }, props.provider);
  const refreshedRevision = useRef(props.refreshRevision);
  useEffect(() => { if (refreshedRevision.current !== props.refreshRevision) { refreshedRevision.current = props.refreshRevision; void state.reload(); } }, [props.refreshRevision, state.reload]);
  useEffect(() => { setOffset(props.query?.offset ?? 0); }, [props.databaseId, JSON.stringify(props.query)]);
  useEffect(() => { setEditing(null); setEditingRevision(undefined); }, [props.databaseId]);
  const submit = async () => {
    if (!editing) return;
    setBusy(true); setError(false);
    try {
      if (state.provider?.mutate && state.data?.records.some(record => record.id === editing.id)) {
        const changes = Object.fromEntries(Object.entries(editing.values).filter(([id, value]) => JSON.stringify(value) !== JSON.stringify(editingOriginal.current[id] ?? null)));
        if (Object.keys(changes).length) { await state.provider.mutate(props.databaseId, [{ kind: "patch", recordId: editing.id, values: changes }], editingRevision!); await state.reload(); }
      } else await state.save(editing, editingRevision);
      setEditing(null);
    } catch { setError(true); } finally { setBusy(false); }
  };
  const remove = async (id: string) => { setBusy(true); setError(false); try { await state.remove(id); } catch { setError(true); } finally { setBusy(false); } };
  if (!state.provider) return <p role="status">{messages.unavailable}</p>;
  if (state.loading && !state.data) return <p role="status">{messages.loading}</p>;
  if (state.failed) return <div role="alert">{messages.failed} <button type="button" onClick={() => void state.reload()}>{messages.retry}</button></div>;
  if (!state.data) return null;
  const { data } = state;
  const writableProperties = data.database.properties.filter(property => property.type !== PROPERTY_TYPES.FORMULA && property.type !== PROPERTY_TYPES.ROLLUP);
  const configured = props.columns?.map(column => data.database.properties.find(property => property.id === column.propertyId)).filter((property): property is DatabaseProperty => !!property) ?? [];
  const visibleProperties = [...configured, ...data.database.properties.filter(property => !configured.some(item => item.id === property.id))].filter(property => !props.columns?.find(column => column.propertyId === property.id)?.hidden);
  const mutate = async (commands: DatabaseCommand[]) => {
    if (!state.provider?.mutate || busy) return;
    setBusy(true); setError(false);
    try { await state.provider.mutate(props.databaseId, commands, data.database.revision); await state.reload(); return true; }
    catch { setError(true); return false; } finally { setBusy(false); }
  };
  const dropRecord = (event: React.DragEvent, propertyId?: string, value?: CellValue, beforeId?: string) => {
    event.preventDefault(); drag.clear(); if (props.readonly || !state.provider?.mutate || busy) return;
    try { const source = JSON.parse(event.dataTransfer.getData(DATABASE_DRAG.RECORD));
      if (source.databaseId !== props.databaseId || !data.records.some(record => record.id === source.recordId)) return;
      const record = data.records.find(item => item.id === source.recordId)!;
      const values = propertyId && propertyId === (props.datePropertyId ?? data.database.properties.find(property => property.type === PROPERTY_TYPES.DATE)?.id) && typeof value === "string" ? shiftRecordDates(record, propertyId, props.endDatePropertyId, value) : propertyId ? { [propertyId]: value ?? null } : {};
      void mutate([propertyId ? { kind: "patch", recordId: source.recordId, values } : { kind: "move", recordId: source.recordId, beforeId: beforeId ?? null }]);
    } catch { setError(true); }
  };
  const dragProps = (record: DatabaseRecord) => ({ draggable: !props.readonly && !!state.provider?.mutate && !busy, "data-dragging": drag.source === record.id ? "true" : undefined, onDragEnd: drag.clear, onDragStart: (event: React.DragEvent<HTMLElement>) => drag.start(event, record.id, recordLabel(record)) });
  const writable = !props.readonly && !!state.provider.upsertRecord;
  const recordLabel = (record: DatabaseRecord) => display(record.values[data.database.properties.find(p => p.type === PROPERTY_TYPES.TEXT)?.id ?? ""]) || record.id;
  const controls = (record: DatabaseRecord) => <>
    {!props.readonly && state.provider?.mutate && <input type="checkbox" aria-label={`${messages.selected}: ${recordLabel(record)}`} checked={selected.includes(record.id)} onChange={event => setSelected(event.target.checked ? [...selected, record.id] : selected.filter(id => id !== record.id))} />}
    {props.onOpenRecord && <button type="button" onClick={() => props.onOpenRecord?.(record)}>{recordLabel(record)}</button>}
    {writable && <button type="button" disabled={busy} onClick={() => { setEditingRevision(data.database.revision); editingOriginal.current = structuredClone(record.values); setEditing({ ...record, values: Object.fromEntries(data.database.properties.filter(p => p.type !== PROPERTY_TYPES.FORMULA && p.type !== PROPERTY_TYPES.ROLLUP).map(p => [p.id, record.values[p.id] ?? null])) }); setError(false); }}>{messages.edit}</button>}
    {!props.readonly && state.provider?.deleteRecord && <button type="button" disabled={busy} onClick={() => void remove(record.id)}>{messages.remove}</button>}
  </>;
  const card = (record: DatabaseRecord) => {
    const properties = <dl>{visibleProperties.filter(p => p.id !== data.database.properties.find(property => property.type === PROPERTY_TYPES.TEXT)?.id).map(p => <div key={p.id}><dt>{p.name}</dt><dd><DatabaseCellValue property={p} value={record.values[p.id] ?? null} locale={props.locale} /></dd></div>)}</dl>;
    const Card = customization.card;
    return <article key={record.id} className="disnote-db__card" {...dragProps(record)}>{Card
      ? <Card record={record} label={recordLabel(record)} properties={properties} controls={controls(record)} readonly={!!props.readonly} />
      : <><strong>{recordLabel(record)}</strong>{properties}{controls(record)}</>}</article>;
  };
  let body: ReactNode;
  if (view === "chart") body = props.savedView?.chart ? <DatabaseChart revision={data.database.revision} kind={props.savedView.chartStyle} databaseId={props.databaseId} config={props.savedView.chart} provider={state.provider} locale={props.locale} /> : <p>{messages.unavailable}</p>;
  else if (view === "form" && props.savedView) body = props.readonly ? <p>{messages.unavailable}</p> : <DatabaseForm key={props.savedView.id} database={data.database} view={props.savedView} provider={state.provider} locale={props.locale} reload={state.reload} />;
  else if (view === "table") body = <div className="disnote-db__table-scroll"><table style={props.columns ? { tableLayout: "fixed", width: visibleProperties.reduce((sum, property) => sum + (props.columns?.find(column => column.propertyId === property.id)?.width ?? 180), 300) } : undefined}><thead><tr>{visibleProperties.map(p => <th key={p.id} scope="col" style={{ width: props.columns?.find(column => column.propertyId === p.id)?.width ?? 180, minWidth: props.columns?.find(column => column.propertyId === p.id)?.width ?? 180 }}>{p.name}</th>)}<th scope="col" style={{ width: 300 }}>{messages.record}</th></tr></thead><tbody>{data.records.map((r, index) => <tr key={r.id} {...dragProps(r)} data-drop-edge={drag.target === `row:${r.id}:before` ? "before" : drag.target === `row:${r.id}:after` ? "after" : undefined} onDragOver={event => { if (drag.source === r.id) return; const bounds = event.currentTarget.getBoundingClientRect(); drag.over(event, `row:${r.id}:${event.clientY > bounds.top + bounds.height / 2 ? "after" : "before"}`); }} onDragLeave={event => { if (drag.target?.startsWith(`row:${r.id}:`)) drag.leave(event, drag.target); }} onDrop={event => dropRecord(event, undefined, undefined, event.clientY > event.currentTarget.getBoundingClientRect().top + event.currentTarget.getBoundingClientRect().height / 2 ? data.records[index + 1]?.id : r.id)}>{visibleProperties.map(p => <td key={p.id}>{!props.readonly && state.provider?.mutate && writableProperties.includes(p) ? <EditableCell provider={state.provider ?? undefined} key={`${r.id}:${p.id}`} property={p} value={r.values[p.id] ?? null} revision={data.database.revision} locale={props.locale} save={async (value, revision) => { await state.provider!.mutate!(props.databaseId, [{ kind: "patch", recordId: r.id, values: { [p.id]: value } }], revision); await state.reload(); }} /> : <DatabaseCellValue property={p} value={r.values[p.id] ?? null} locale={props.locale} />}</td>)}<td>{controls(r)}{!props.readonly && state.provider?.mutate && index > 0 && <button type="button" disabled={busy} title={messages.moveUp} onClick={() => void mutate([{ kind: "move", recordId: r.id, beforeId: data.records[index - 1]!.id }])}>{messages.moveUp}</button>}{!props.readonly && state.provider?.mutate && index < data.records.length - 1 && <button type="button" disabled={busy} title={messages.moveDown} onClick={() => void mutate([{ kind: "move", recordId: r.id, beforeId: data.records[index + 2]?.id ?? null }])}>{messages.moveDown}</button>}</td></tr>)}</tbody></table></div>;
  else if (view === "board") {
    const groupId = props.groupPropertyId ?? data.database.properties.find(p => p.type === PROPERTY_TYPES.SELECT)?.id;
    const keys = new Set([...(data.database.properties.find(p => p.id === groupId)?.options ?? []), ...data.records.map(r => display(r.values[groupId ?? ""]))]);
    body = <div className="disnote-db__board">{[...keys].map(key => <section key={key} className="disnote-db__column" data-drop-active={drag.target === `board:${key}` ? "true" : undefined} onDragOver={event => drag.over(event, `board:${key}`)} onDragLeave={event => drag.leave(event, `board:${key}`)} onDrop={event => dropRecord(event, groupId, key || null)}><h4><span>{key || messages.ungrouped}</span><small>{data.records.filter(r => display(r.values[groupId ?? ""]) === key).length}</small></h4>{data.records.filter(r => display(r.values[groupId ?? ""]) === key).map(card)}</section>)}</div>;
  } else if (view === "calendar" || view === "timeline") {
    const dateId = props.datePropertyId ?? data.database.properties.find(p => p.type === PROPERTY_TYPES.DATE)?.id;
    const groups = new Map<string, DatabaseRecord[]>();
    for (const record of data.records) { const key = display(record.values[dateId ?? ""]).slice(0, 10); groups.set(key, [...(groups.get(key) ?? []), record]); }
    if (view === "calendar") {
      const first = new Date(Date.UTC(month.year, month.month, 1)), start = new Date(first); start.setUTCDate(1 - (first.getUTCDay() + 6) % 7);
      const changeMonth = (delta: number) => { const date = new Date(Date.UTC(month.year, month.month + delta, 1)); setMonth({ year: date.getUTCFullYear(), month: date.getUTCMonth() }); };
      body = <div style={{ overflowX: "auto" }}><nav aria-label={messages.calendar}><button type="button" onClick={() => changeMonth(-1)}>{messages.previous}</button> <strong>{new Intl.DateTimeFormat(props.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(first)}</strong> <button type="button" onClick={() => changeMonth(1)}>{messages.next}</button></nav>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(100px,1fr))", minWidth: 700, gap: 4 }}>{Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setUTCDate(start.getUTCDate() + index); const key = date.toISOString().slice(0, 10); return <section key={key} className="disnote-db__calendar-day" data-drop-active={drag.target === `date:${key}` ? "true" : undefined} onDragOver={event => drag.over(event, `date:${key}`)} onDragLeave={event => drag.leave(event, `date:${key}`)} onDrop={event => dropRecord(event, dateId, key)} style={{ border: "1px solid var(--disnote-border, #e2e8e8)", minHeight: 70, padding: 4, opacity: date.getUTCMonth() === month.month ? 1 : 0.5 }}><time dateTime={key}>{date.getUTCDate()}</time>{(groups.get(key) ?? []).map(card)}</section>; })}</div>
        {(groups.get("") ?? []).length > 0 && <section><h4>{messages.ungrouped}</h4>{groups.get("")!.map(card)}</section>}
      </div>;
    } else {
      const dated = data.records.map(record => ({ record, start: Date.parse(display(record.values[dateId ?? ""])), end: Date.parse(display(record.values[props.endDatePropertyId ?? dateId ?? ""])) })).filter(row => Number.isFinite(row.start));
      const minimum = Math.min(...dated.map(row => row.start)), maximum = Math.max(...dated.map(row => Number.isFinite(row.end) ? Math.max(row.start, row.end) : row.start)), span = Math.max(86_400_000, maximum - minimum);
      body = <div className="disnote-db__timeline">{dated.sort((a, b) => a.start - b.start).map(row => <article key={row.record.id} className="disnote-db__timeline-row"><div><strong>{recordLabel(row.record)}</strong><div>{controls(row.record)}</div></div><TimelineItem start={row.start} end={Number.isFinite(row.end) ? row.end : row.start} minimum={minimum} span={span} label={recordLabel(row.record)} locale={props.locale} disabled={!!props.readonly || !state.provider?.mutate || busy} onMove={date => { if (dateId) void mutate([{ kind: "patch", recordId: row.record.id, values: shiftRecordDates(row.record, dateId, props.endDatePropertyId, date) }]); }} /></article>)}{(groups.get("") ?? []).map(card)}</div>;
    }
  } else if (view === "map") {
    const latitudeId = props.latitudePropertyId ?? "latitude", longitudeId = props.longitudePropertyId ?? "longitude";
    body = <svg viewBox="0 0 600 300" role="img" aria-label={messages.map} style={{ width: "100%", border: "1px solid var(--disnote-border, #e2e8e8)" }}><rect width="600" height="300" fill="currentColor" opacity="0.05" />{Array.from({ length: 7 }, (_, index) => <line key={`x${index}`} x1={index * 100} x2={index * 100} y1="0" y2="300" stroke="currentColor" opacity="0.2" />)}{Array.from({ length: 4 }, (_, index) => <line key={`y${index}`} x1="0" x2="600" y1={index * 100} y2={index * 100} stroke="currentColor" opacity="0.2" />)}{data.records.map(record => { const latitude = record.values[latitudeId], longitude = record.values[longitudeId]; if (typeof latitude !== "number" || typeof longitude !== "number" || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null; return <circle key={record.id} cx={(longitude + 180) / 360 * 600} cy={(90 - latitude) / 180 * 300} r="6" fill="currentColor" onClick={() => props.onOpenRecord?.(record)}><title>{recordLabel(record)} ({latitude}, {longitude})</title></circle>; })}</svg>;
  } else body = <div style={{ display: "grid", gridTemplateColumns: view === "gallery" ? "repeat(auto-fit,minmax(220px,1fr))" : "1fr", gap: 12 }}>{data.records.map(card)}</div>;
  const surface = { data, view, readonly: !!props.readonly, reload: state.reload };
  const Header = customization.header, Toolbar = customization.toolbar, Empty = customization.empty;
  return <section className={joinClassNames("disnote-db", props.className)} style={props.style} data-drag-active={drag.source ? "true" : undefined} data-disnote-view={view} aria-label={data.database.title}>
    {Header ? <Header {...surface} /> : <header className="disnote-db__header"><h3>{data.database.title}</h3><span>{data.total} {messages.record}</span></header>}{Toolbar && <Toolbar {...surface} />}{error && <p role="alert">{messages.failed}</p>}
    {writable && <button type="button" disabled={busy || state.loading || (props.refreshRevision !== undefined && data.database.revision < props.refreshRevision)} onClick={() => { setEditingRevision(data.database.revision); setEditing({ id: state.provider?.createId?.() ?? crypto.randomUUID(), values: defaults(data.database.properties) }); }}>{messages.add}</button>}
    {!props.readonly && state.provider.mutate && view !== "form" && <fieldset className="disnote-db__bulk"><legend>{messages.selected} ({selected.length})</legend>
      <label><input type="checkbox" aria-label={messages.selectAll} checked={data.records.length > 0 && data.records.every(record => selected.includes(record.id))} onChange={event => setSelected(event.target.checked ? [...new Set([...selected, ...data.records.map(record => record.id)])] : selected.filter(id => !data.records.some(record => record.id === id)))} />{messages.selectAll}</label>
      <select aria-label={messages.propertyName} value={bulkProperty} onChange={event => { setBulkProperty(event.target.value); setBulkValue(null); }}><option value="">{messages.propertyName}</option>{writableProperties.map(property => <option key={property.id} value={property.id}>{property.name}</option>)}</select>
      {writableProperties.find(property => property.id === bulkProperty) && <CellInput provider={state.provider ?? undefined} locale={props.locale} property={writableProperties.find(property => property.id === bulkProperty)!} value={bulkValue} onChange={setBulkValue} />}
      <button type="button" disabled={busy || !selected.length || !bulkProperty} onClick={() => void mutate(selected.map(recordId => ({ kind: "patch", recordId, values: { [bulkProperty]: bulkValue } })))}>{messages.bulkEdit}</button>
      <button type="button" disabled={busy || !selected.length} onClick={() => { void mutate(selected.map(recordId => ({ kind: "delete", recordId }))).then(success => { if (success) setSelected([]); }); }}>{messages.bulkDelete}</button>
    </fieldset>}
    {editing && <form className="disnote-db__form" aria-label={messages.edit} onSubmit={e => { e.preventDefault(); void submit(); }}>
      {data.database.properties.filter(p => p.type !== PROPERTY_TYPES.FORMULA && p.type !== PROPERTY_TYPES.ROLLUP).map(p => <label key={p.id} style={{ display: "block" }}>{p.name}<CellInput provider={state.provider ?? undefined} locale={props.locale} property={p} value={editing.values[p.id] ?? null} onChange={value => setEditing({ ...editing, values: { ...editing.values, [p.id]: value } })} /></label>)}
      <button disabled={busy} type="submit">{messages.save}</button><button disabled={busy} type="button" onClick={() => setEditing(null)}>{messages.cancel}</button>
    </form>}
    {data.records.length || view === "form" || view === "chart" ? body : Empty ? <Empty {...surface} /> : <p>{messages.empty}</p>}
    <nav className="disnote-db__pagination" aria-label={messages.record}><button type="button" disabled={offset === 0 || state.loading} onClick={() => setOffset(Math.max(0, offset - limit))}>{messages.previous}</button> <span>{Math.min(offset + 1, data.total)}–{Math.min(offset + limit, data.total)} / {data.total}</span> <button type="button" disabled={offset + limit >= data.total || state.loading} onClick={() => setOffset(offset + limit)}>{messages.next}</button></nav>
  </section>;
}
