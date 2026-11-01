import { useEffect, useState } from "react";
import type { DatabaseCommand, DatabaseRecord } from "../model.js";
import type { RecordPageState } from "../record-pages.js";
import type { DatabaseViewProvider } from "./context.js";
import { RecordChoiceInput } from "./RecordChoiceInput.js";
import { useDatabaseMessages } from "./customization.js";
export type RecordTaskChange = Omit<Extract<DatabaseCommand, { kind: "task" }>, "kind" | "recordId">;
export function RecordTaskSettings({ databaseId, state, provider, locale, save, onOpenRecord }: { databaseId: string; state: RecordPageState; provider: DatabaseViewProvider; locale?: string; save?: (changes: RecordTaskChange, revision: number) => Promise<void>; onOpenRecord?(id: string): void }) {
  const [parent, setParent] = useState(state.record.parentId ?? ""), [dependencies, setDependencies] = useState(state.record.dependencies ?? []), [base] = useState(state.databaseRevision), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false), [children, setChildren] = useState<{ records: DatabaseRecord[]; title?: string; total: number } | null>(null), [offset, setOffset] = useState(0);
  const m = useDatabaseMessages(locale);
  useEffect(() => { let active = true; setChildren(null); void provider.query(databaseId, { parentId: state.record.id, offset, limit: 50 }).then(result => { if (active) setChildren({ records: result.records, total: result.total, title: result.database.properties.find(property => property.type === "text")?.id }); }, () => { if (active) setFailed(true); }); return () => { active = false; }; }, [provider, databaseId, state.record.id, state.databaseRevision, offset]);
  return <section aria-label={m.taskLinks}>
    {save ? <form className="disnote-db__form" aria-label={m.taskLinks} onSubmit={event => {
      event.preventDefault(); setBusy(true); setFailed(false);
      const changes: RecordTaskChange = { ...(parent !== (state.record.parentId ?? "") ? { parentId: parent || null } : {}), addDependencies: dependencies.filter(id => !state.record.dependencies?.includes(id)), removeDependencies: (state.record.dependencies ?? []).filter(id => !dependencies.includes(id)) };
      void save(changes, base).catch(() => setFailed(true)).finally(() => setBusy(false));
    }}>
      <label>{m.parentTask}<RecordChoiceInput property={{ id: "parent", name: m.parentTask, type: "relation", targetDatabaseId: databaseId }} multiple={false} value={parent ? [parent] : []} onChange={values => setParent(values[0] ?? "")} provider={provider} locale={locale} /></label>
      <label>{m.dependencies}<RecordChoiceInput property={{ id: "dependencies", name: m.dependencies, type: "relation", targetDatabaseId: databaseId }} value={dependencies} onChange={setDependencies} provider={provider} locale={locale} /></label>
      <button type="submit" disabled={busy}>{m.save}</button>
    </form> : <dl><dt>{m.parentTask}</dt><dd>{state.record.parentId ?? m.emptyCell}</dd><dt>{m.dependencies}</dt><dd>{state.record.dependencies?.join(", ") ?? m.emptyCell}</dd></dl>}
    {failed && <p role="alert">{m.failed}</p>}
    <h3>{m.subitems}</h3>{children && <><ul>{children.records.map(record => <li key={record.id}>{onOpenRecord ? <button type="button" onClick={() => onOpenRecord(record.id)}>{String(record.values[children.title ?? ""] ?? record.id)}</button> : String(record.values[children.title ?? ""] ?? record.id)}</li>)}</ul>{!children.total && <p>{m.empty}</p>}{children.total > 50 && <nav aria-label={m.subitems}><button type="button" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 50))}>{m.previous}</button><button type="button" disabled={offset + 50 >= children.total} onClick={() => setOffset(offset + 50)}>{m.next}</button></nav>}</>}
  </section>;
}
