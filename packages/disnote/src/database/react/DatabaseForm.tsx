import { useState } from "react";
import type { CellValue, DatabaseSavedView, DatabaseQueryResult } from "../model.js";
import type { DatabaseViewProvider } from "./context.js";
import { CellInput } from "./CellInput.js";
import { useDatabaseMessages } from "./customization.js";
export function DatabaseForm({ database, view, provider, locale, reload }: { database: DatabaseQueryResult["database"]; view: DatabaseSavedView; provider: DatabaseViewProvider; locale?: string; reload(): Promise<void> }) {
  const [values, setValues] = useState<Record<string, CellValue>>({}), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false), [sent, setSent] = useState(false);
  const m = useDatabaseMessages(locale);
  if (!provider.submitForm || !view.form) return <p role="status">{m.unavailable}</p>;
  return <form className="disnote-db__form" aria-label={m.form} onSubmit={event => { event.preventDefault(); setBusy(true); setFailed(false); setSent(false); const id = provider.createId?.() ?? crypto.randomUUID(); void provider.submitForm!(database.id, view.id, id, values, database.revision).then(async () => { setValues({}); setSent(true); await reload(); }, () => setFailed(true)).finally(() => setBusy(false)); }}>
    {view.form.fields.map(field => { const property = database.properties.find(item => item.id === field.propertyId); return property ? <label key={field.propertyId}>{property.name}{field.required && <span> *</span>}<CellInput property={property} value={values[field.propertyId] ?? null} provider={provider} locale={locale} onChange={value => { setValues({ ...values, [field.propertyId]: value }); setSent(false); }} /></label> : null; })}
    {failed && <p role="alert">{m.failed}</p>}{sent && <p role="status">{m.formSubmitted}</p>}
    <button type="submit" disabled={busy}>{m.submit}</button>
  </form>;
}
