import { useState } from "react";
import type { CellValue, DatabaseProperty } from "../model.js";
import { useDatabaseMessages } from "./customization.js";
import { CellInput } from "./CellInput.js";
import type { DatabaseViewProvider } from "./context.js";
import { DatabaseCellValue } from "./customization.js";
export function EditableCell({ property, value, revision, locale, save, provider }: { property: DatabaseProperty; value: CellValue; revision: number; locale?: string; provider?: DatabaseViewProvider; save(value: CellValue, revision: number): Promise<void> }) {
  const [draft, setDraft] = useState(value), [base, setBase] = useState(revision), [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  const m = useDatabaseMessages(locale);
  if (!editing) return <button type="button" className="disnote-db__cell" aria-label={`${m.editCell}: ${property.name}`} onClick={() => { setDraft(value); setBase(revision); setEditing(true); setFailed(false); }}>{value === null || value === "" ? m.emptyCell : <DatabaseCellValue property={property} value={value} locale={locale} />}</button>;
  return <form className="disnote-db__cell-editor" onKeyDown={event => { if (event.key === "Escape" && !busy) { event.stopPropagation(); setEditing(false); } }} onSubmit={event => { event.preventDefault(); setBusy(true); setFailed(false); void save(draft, base).then(() => setEditing(false), () => setFailed(true)).finally(() => setBusy(false)); }}>
    <label>{property.name}<CellInput property={property} value={draft} onChange={setDraft} provider={provider} locale={locale} /></label>
    {failed && <span role="alert">{m.conflict}</span>}
    <button type="submit" disabled={busy}>{m.save}</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>{m.cancel}</button>
  </form>;
}
