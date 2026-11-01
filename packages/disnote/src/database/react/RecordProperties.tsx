import { useState } from "react";
import { PROPERTY_TYPES, type CellValue } from "../model.js";
import type { RecordPageState } from "../record-pages.js";
import { useDatabaseMessages } from "./customization.js";
import { CellInput } from "./CellInput.js";
import type { DatabaseViewProvider } from "./context.js";
export function RecordProperties({ state, locale, save, provider }: { state: RecordPageState; locale?: string; provider?: DatabaseViewProvider; save(values: Record<string, CellValue>, revision: number): Promise<void> }) {
  const [draft, setDraft] = useState(() => structuredClone(state.record.values)), [base] = useState(state.databaseRevision), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  const m = useDatabaseMessages(locale);
  return <form className="disnote-db__form" aria-label={m.properties} onSubmit={event => { event.preventDefault(); setBusy(true); setFailed(false); const changed = Object.fromEntries(Object.entries(draft).filter(([id, value]) => JSON.stringify(value) !== JSON.stringify(state.record.values[id] ?? null))); void save(changed, base).catch(() => setFailed(true)).finally(() => setBusy(false)); }}>
    {state.properties.filter(property => property.type !== PROPERTY_TYPES.FORMULA && property.type !== PROPERTY_TYPES.ROLLUP).map(property => <label key={property.id}>{property.name}<CellInput property={property} value={draft[property.id] ?? null} provider={provider} locale={locale} onChange={value => setDraft({ ...draft, [property.id]: value })} /></label>)}
    {failed && <p role="alert">{m.conflict}</p>}<button type="submit" disabled={busy}>{m.save}</button>
  </form>;
}
