import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DATABASE_VIEW_KINDS, PROPERTY_TYPES, type DatabaseSavedView } from "../model.js";
import { useDatabaseMessages } from "./customization.js";
import { DatabaseViewContext, type DatabaseViewProvider } from "./context.js";
import { useDatabaseView } from "./useDatabaseView.js";
import { DatabaseView } from "./DatabaseView.js";
import { FilterEditor } from "./FilterEditor.js";
import { PropertySettings } from "./PropertySettings.js";
import { DATABASE_COLUMN_WIDTH, DATABASE_DRAG } from "./database-ui.constants.js";
import { reconcileDatabaseView } from "../views.js";
import { TaskScheduleSettings } from "./TaskScheduleSettings.js";
import { DatabaseAutomationPanel } from "./DatabaseAutomationPanel.js";

export interface DatabaseWorkbenchProps { databaseId: string; provider?: DatabaseViewProvider; locale?: string; readonly?: boolean; canManage?: boolean; onOpenRecord?: Parameters<typeof DatabaseView>[0]["onOpenRecord"] }
export function DatabaseWorkbench(props: DatabaseWorkbenchProps) {
  const context = useContext(DatabaseViewContext), raw = props.provider ?? context;
  const metadata = useDatabaseView(props.databaseId, { limit: 1 }, raw ?? undefined), m = useDatabaseMessages(props.locale);
  const [activeId, setActiveId] = useState("default-table"), [draft, setDraft] = useState<DatabaseSavedView | null>(null), [localViews, setLocalViews] = useState<DatabaseSavedView[]>([]);
  const [base, setBase] = useState(0), [failed, setFailed] = useState(false), [busy, setBusy] = useState(false), [propertiesOpen, setPropertiesOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [pendingWrites, setPendingWrites] = useState(0);
  const write = useCallback(async (operation: () => Promise<unknown>) => {
    setPendingWrites(value => value + 1);
    try { await operation(); await metadata.reload(); }
    finally { setPendingWrites(value => value - 1); }
  }, [metadata.reload]);
  const baseline = useRef<string | undefined>(undefined);
  const provider = useMemo<DatabaseViewProvider | undefined>(() => raw ? {
    ...raw,
    query: (...args) => raw.query(...args),
    ...(raw.subscribe ? { subscribe: (id: string, listener: () => void) => raw.subscribe!(id, listener) } : {}),
    ...(raw.searchPeople ? { searchPeople: (query: string) => raw.searchPeople!(query) } : {}),
    ...(raw.aggregate ? { aggregate: (...args: Parameters<NonNullable<DatabaseViewProvider["aggregate"]>>) => raw.aggregate!(...args) } : {}),
    ...(raw.createId ? { createId: () => raw.createId!() } : {}),
    ...(raw.mutate ? { mutate: (...args: Parameters<NonNullable<DatabaseViewProvider["mutate"]>>) => write(() => raw.mutate!(...args)) } : {}),
    ...(raw.upsertRecord ? { upsertRecord: (...args: Parameters<NonNullable<DatabaseViewProvider["upsertRecord"]>>) => write(() => raw.upsertRecord!(...args)) } : {}),
    ...(raw.deleteRecord ? { deleteRecord: (...args: Parameters<NonNullable<DatabaseViewProvider["deleteRecord"]>>) => write(() => raw.deleteRecord!(...args)) } : {}),
    ...(raw.submitForm ? { submitForm: (...args: Parameters<NonNullable<DatabaseViewProvider["submitForm"]>>) => write(() => raw.submitForm!(...args)) } : {}),
  } : undefined, [raw, write]);
  const database = metadata.data?.database;
  const views = new Map<string, DatabaseSavedView>();
  if (database) for (const kind of DATABASE_VIEW_KINDS) views.set(`default-${kind}`, {
    id: `default-${kind}`, name: m[kind], kind,
    ...(database.properties.find(property => property.type === PROPERTY_TYPES.SELECT) ? { groupPropertyId: database.properties.find(property => property.type === PROPERTY_TYPES.SELECT)!.id } : {}),
    ...(database.properties.find(property => property.type === PROPERTY_TYPES.DATE) ? { datePropertyId: database.properties.find(property => property.type === PROPERTY_TYPES.DATE)!.id } : {}),
    columns: database.properties.map(property => ({ propertyId: property.id, width: DATABASE_COLUMN_WIDTH.DEFAULT })),
    ...(kind === "chart" ? { chart: { groupPropertyId: database.properties.find(property => property.type === PROPERTY_TYPES.SELECT)?.id ?? database.properties[0]?.id ?? "", aggregate: "count" } } : {}),
    ...(kind === "form" ? { form: { fields: database.properties.filter(property => property.type !== PROPERTY_TYPES.FORMULA && property.type !== PROPERTY_TYPES.ROLLUP).map((property, index) => ({ propertyId: property.id, required: index === 0 })) } } : {}),
  });
  for (const view of [...localViews, ...(database?.views ?? [])]) views.set(view.id, view);
  useEffect(() => {
    if (!database) return;
    setDraft(structuredClone(views.get(activeId) ?? views.values().next().value!)); setBase(database.revision);
    baseline.current = JSON.stringify(database.views?.find(view => view.id === activeId)); setFailed(false);
  }, [activeId, !!database, props.databaseId]);
  useEffect(() => {
    if (database && baseline.current === JSON.stringify(database.views?.find(view => view.id === activeId))) setBase(database.revision);
  }, [database?.revision, activeId]);
  const propertyKey = JSON.stringify(database?.properties);
  useEffect(() => {
    if (!database) return;
    setDraft(current => {
      if (!current) return current;
      const reconciled = reconcileDatabaseView(current, database.properties);
      reconciled.columns = [...(reconciled.columns ?? []), ...database.properties.filter(property => !reconciled.columns?.some(column => column.propertyId === property.id)).map(property => ({ propertyId: property.id, width: DATABASE_COLUMN_WIDTH.DEFAULT }))];
      return reconciled;
    });
  }, [propertyKey, activeId]);
  if (metadata.failed) return <p role="alert">{m.failed}<button type="button" onClick={() => void metadata.reload()}>{m.retry}</button></p>;
  if (!database || !draft || !provider) return <p role="status">{m.loading}</p>;
  const manage = !!props.canManage && !props.readonly && !!provider.mutate;
  const query = draft.query ?? {};
  const update = (next: Partial<DatabaseSavedView>) => setDraft({ ...draft, ...next });
  const saveView = async () => {
    if (!provider.mutate) return;
    setBusy(true); setFailed(false);
    try { const saved = { ...draft, ...(draft.chart ? { chart: { ...draft.chart, ...(query.filter ? { filter: query.filter } : {}) } } : {}) }; const revision = baseline.current === JSON.stringify(database.views?.find(view => view.id === activeId)) ? database.revision : base; await provider.mutate(props.databaseId, [{ kind: "view", view: saved }], revision); baseline.current = JSON.stringify(saved); setBase(revision + 1); }
    catch { setFailed(true); } finally { setBusy(false); }
  };
  const moveColumn = (id: string, beforeId: string | null) => {
    const columns = [...(draft.columns ?? [])], from = columns.findIndex(column => column.propertyId === id), before = beforeId === null ? columns.length : columns.findIndex(column => column.propertyId === beforeId);
    if (from < 0 || before < 0 || from === before) return;
    const [column] = columns.splice(from, 1); columns.splice(beforeId === null ? columns.length : columns.findIndex(item => item.propertyId === beforeId), 0, column!); update({ columns });
  };
  const stored = database.views?.find(view => view.id === draft.id);
  return <section className="disnote-db disnote-db-workbench">
    <nav className="disnote-db__views" aria-label={m.database}>{[...views.values()].map(view => <button type="button" key={view.id} disabled={busy || pendingWrites > 0 || metadata.loading} aria-pressed={activeId === view.id} onClick={() => setActiveId(view.id)}>{view.name}</button>)}
      {manage && <button type="button" onClick={() => { const view = { ...draft, id: crypto.randomUUID(), name: m.newView }; setLocalViews([...localViews, view]); setActiveId(view.id); }}>{m.newView}</button>}
    </nav>
    <details className="disnote-db__settings"><summary>{m.columnSettings} · {m.filter} · {m.sort}</summary>
      <label>{m.search}<input type="search" maxLength={200} value={query.search ?? ""} onChange={event => update({ query: { ...query, search: event.target.value || undefined } })} /></label>
      <label>{m.pageSize}<select value={query.limit ?? 25} onChange={event => update({ query: { ...query, limit: Number(event.target.value) } })}>{[10, 25, 50, 100, 250, 500].map(limit => <option key={limit} value={limit}>{limit}</option>)}</select></label>
      <label>{m.viewName}<input value={draft.name} onChange={event => update({ name: event.target.value })} /></label>
      <label>{m.group}<select value={draft.groupPropertyId ?? ""} onChange={event => update({ groupPropertyId: event.target.value || undefined })}><option value="">{m.all}</option>{database.properties.map(property => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
      <FilterEditor properties={database.properties} value={query.filter} locale={props.locale} onChange={filter => update({ query: { ...query, filter } })} />
      {(query.sort ?? []).map((sort, index) => <div key={index}><label>{m.sort}<select value={sort.propertyId} onChange={event => update({ query: { ...query, sort: query.sort!.map((item, at) => at === index ? { ...item, propertyId: event.target.value } : item) } })}>{database.properties.map(property => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
        <select aria-label={m.sort} value={sort.direction} onChange={event => update({ query: { ...query, sort: query.sort!.map((item, at) => at === index ? { ...item, direction: event.target.value as "asc" | "desc" } : item) } })}><option value="asc">{m.ascending}</option><option value="desc">{m.descending}</option></select>
        <button type="button" onClick={() => update({ query: { ...query, sort: query.sort!.filter((_, at) => at !== index) } })}>{m.remove}</button></div>)}
      {database.properties.length > 0 && (query.sort?.length ?? 0) < 10 && <button type="button" onClick={() => update({ query: { ...query, sort: [...(query.sort ?? []), { propertyId: database.properties[0]!.id, direction: "asc" }] } })}>{m.addSort}</button>}
      {(draft.columns ?? []).map((column, index, columns) => <div className="disnote-db__column-setting" key={column.propertyId} draggable onDragStart={event => event.dataTransfer.setData(DATABASE_DRAG.COLUMN, column.propertyId)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); moveColumn(event.dataTransfer.getData(DATABASE_DRAG.COLUMN), column.propertyId); }}>
        <span>{database.properties.find(property => property.id === column.propertyId)?.name}</span>
        <label><input type="checkbox" checked={!!column.hidden} onChange={event => update({ columns: columns.map(item => item.propertyId === column.propertyId ? { ...item, hidden: event.target.checked } : item) })} />{m.hideColumn}</label>
        <input aria-label={`${m.resizeColumn}: ${database.properties.find(property => property.id === column.propertyId)?.name}`} type="range" min={DATABASE_COLUMN_WIDTH.MIN} max={DATABASE_COLUMN_WIDTH.MAX} value={column.width} onChange={event => update({ columns: columns.map(item => item.propertyId === column.propertyId ? { ...item, width: Number(event.target.value) } : item) })} />
        <button type="button" disabled={index === 0} onClick={() => moveColumn(column.propertyId, columns[index - 1]!.propertyId)}>{m.moveUp}</button>
        <button type="button" disabled={index === columns.length - 1} onClick={() => moveColumn(column.propertyId, columns[index + 2]?.propertyId ?? null)}>{m.moveDown}</button>
      </div>)}
      {draft.chart && <div><label>{m.aggregation}<select value={draft.chart.aggregate} onChange={event => update({ chart: { ...draft.chart!, aggregate: event.target.value as NonNullable<DatabaseSavedView["chart"]>["aggregate"] } })}>{(["count", "sum", "average", "min", "max"] as const).map(value => <option key={value} value={value}>{m[value]}</option>)}</select></label>
        <label>{m.group}<select value={draft.chart.groupPropertyId} onChange={event => update({ chart: { ...draft.chart!, groupPropertyId: event.target.value } })}>{database.properties.map(property => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
        <label>{m.valueProperty}<select value={draft.chart.valuePropertyId ?? ""} onChange={event => update({ chart: { ...draft.chart!, valuePropertyId: event.target.value || undefined } })}><option value="">{m.all}</option>{database.properties.filter(property => [PROPERTY_TYPES.NUMBER, PROPERTY_TYPES.FORMULA, PROPERTY_TYPES.ROLLUP].includes(property.type as "number")).map(property => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label></div>}
      {draft.chart && <label>{m.chartStyle}<select value={draft.chartStyle ?? "bar"} onChange={event => update({ chartStyle: event.target.value as DatabaseSavedView["chartStyle"] })}><option value="bar">{m.barChart}</option><option value="line">{m.lineChart}</option><option value="donut">{m.donutChart}</option></select></label>}
      {draft.kind === "chart" && !draft.chart && database.properties.length > 0 && <button type="button" onClick={() => update({ chart: { groupPropertyId: database.properties[0]!.id, aggregate: "count" } })}>{m.chart}</button>}
      {draft.form && database.properties.filter(property => property.type !== PROPERTY_TYPES.FORMULA && property.type !== PROPERTY_TYPES.ROLLUP).map(property => { const field = draft.form!.fields.find(item => item.propertyId === property.id); return <div key={property.id}><span>{property.name}</span><label><input type="checkbox" disabled={!manage} checked={!!field} aria-label={`${m.includeField}: ${property.name}`} onChange={event => update({ form: { fields: event.target.checked ? [...draft.form!.fields, { propertyId: property.id, required: false }] : draft.form!.fields.filter(item => item.propertyId !== property.id) } })} />{m.includeField}</label>{field && <label><input type="checkbox" disabled={!manage} checked={field.required} aria-label={`${m.required}: ${property.name}`} onChange={event => update({ form: { fields: draft.form!.fields.map(item => item.propertyId === property.id ? { ...item, required: event.target.checked } : item) } })} />{m.required}</label>}</div>; })}
      {manage && <button type="button" disabled={busy || pendingWrites > 0 || metadata.loading} onClick={() => void saveView()}>{m.saveView}</button>}
      {manage && !draft.id.startsWith("default-") && <button type="button" disabled={busy} onClick={() => { setBusy(true); void provider.mutate!(props.databaseId, [{ kind: "deleteView", viewId: draft.id }], base).then(() => { setLocalViews(localViews.filter(view => view.id !== draft.id)); setActiveId("default-table"); }, () => setFailed(true)).finally(() => setBusy(false)); }}>{m.deleteView}</button>}
    </details>
    {manage && <button type="button" aria-expanded={propertiesOpen} onClick={() => setPropertiesOpen(!propertiesOpen)}>{m.properties}</button>}
    {propertiesOpen && <PropertySettings properties={database.properties} revision={database.revision} locale={props.locale} save={async (properties, revision) => { await provider.mutate!(props.databaseId, [{ kind: "properties", properties }], revision); if (stored) baseline.current = JSON.stringify(reconcileDatabaseView(stored, properties)); setBase(revision + 1); setPropertiesOpen(false); }} />}
    {failed && <p role="alert">{m.conflict}</p>}
    {manage && provider.automation && <details open={automationOpen} onToggle={event => setAutomationOpen(event.currentTarget.open)}><summary>{m.automations}</summary>{automationOpen && <DatabaseAutomationPanel databaseId={props.databaseId} provider={provider as DatabaseViewProvider & { automation: NonNullable<DatabaseViewProvider["automation"]> }} properties={database.properties} locale={props.locale} onChanged={metadata.reload} />}</details>}
    {manage && <details open={scheduleOpen} onToggle={event => setScheduleOpen(event.currentTarget.open)}><summary>{m.taskSchedule}</summary>{scheduleOpen && <TaskScheduleSettings key={database.id} properties={database.properties} value={database.taskSchedule} revision={database.revision} locale={props.locale} save={async (schedule, revision) => { await provider.mutate!(props.databaseId, [{ kind: "schedule", schedule }], revision); setScheduleOpen(false); }} />}</details>}
    {draft.kind === "form" && (!stored || JSON.stringify(stored.form) !== JSON.stringify(draft.form)) ? <p role="status">{m.saveView}</p> : <DatabaseView refreshRevision={database.revision} databaseId={props.databaseId} provider={provider} locale={props.locale} readonly={props.readonly} view={draft.kind} query={query} groupPropertyId={draft.groupPropertyId} datePropertyId={draft.datePropertyId} endDatePropertyId={draft.endDatePropertyId} columns={draft.columns} savedView={{ ...draft, ...(draft.chart ? { chart: { ...draft.chart, filter: query.filter } } : {}) }} onOpenRecord={props.onOpenRecord} />}
  </section>;
}
