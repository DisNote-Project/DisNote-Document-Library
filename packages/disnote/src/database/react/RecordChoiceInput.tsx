import { useEffect, useState } from "react";
import { PROPERTY_TYPES, type DatabaseProperty } from "../model.js";
import type { DatabaseViewProvider } from "./context.js";
import { useDatabaseMessages } from "./customization.js";
const PAGE_SIZE = 50, SEARCH_DELAY_MS = 250;
/** Suggestions always come from the actor-scoped host; selected IDs survive paging. */
export function RecordChoiceInput({ property, value, onChange, provider, locale, multiple = true }: { property: DatabaseProperty; value: string[]; onChange(value: string[]): void; provider: DatabaseViewProvider; locale?: string; multiple?: boolean }) {
  const [search, setSearch] = useState(""), [choices, setChoices] = useState<{ id: string; label: string }[]>([]), [offset, setOffset] = useState(0), [more, setMore] = useState(false), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const m = useDatabaseMessages(locale), person = property.type === PROPERTY_TYPES.PERSON;
  useEffect(() => {
    let active = true; setBusy(true); setFailed(false);
    const timer = setTimeout(() => { void (async () => {
      if (person) { if (!provider.searchPeople) throw new Error(); return { choices: await provider.searchPeople(search), more: false }; }
      if (!property.targetDatabaseId) throw new Error();
      const metadata = await provider.query(property.targetDatabaseId, { limit: 1 }), title = metadata.database.properties.find(item => item.type === PROPERTY_TYPES.TEXT)?.id;
      const result = await provider.query(property.targetDatabaseId, { offset, limit: PAGE_SIZE, ...(search && title ? { filter: { kind: "condition", propertyId: title, operator: "contains", value: search } } : {}) });
      return { choices: result.records.map(record => ({ id: record.id, label: String(record.values[title ?? ""] ?? record.id) })), more: offset + result.records.length < result.total };
    })().then(result => { if (active) { setChoices(current => offset ? [...current, ...result.choices.filter(choice => !current.some(item => item.id === choice.id))] : result.choices); setMore(result.more); } }, () => { if (active) setFailed(true); }).finally(() => { if (active) setBusy(false); }); }, SEARCH_DELAY_MS);
    return () => { active = false; clearTimeout(timer); };
  }, [provider, property.targetDatabaseId, person, search, offset, attempt]);
  const options = [...choices, ...value.filter(id => !choices.some(choice => choice.id === id)).map(id => ({ id, label: id }))];
  return <span className="disnote-db__choices">
    <input type="search" aria-label={`${m.search}: ${property.name}`} value={search} onChange={event => { setSearch(event.target.value); setOffset(0); }} />
    {busy && <span role="status">{m.loading}</span>}
    {failed && <span role="alert">{m.failed}<button type="button" onClick={() => setAttempt(attempt + 1)}>{m.retry}</button></span>}
    <select multiple={multiple} aria-label={property.name} value={multiple ? value : value[0] ?? ""} disabled={busy} onChange={event => onChange([...event.target.selectedOptions].map(option => option.value).filter(Boolean))}>{!multiple && <option value="">{m.emptyCell}</option>}{options.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select>
    {more && <button type="button" disabled={busy} onClick={() => setOffset(offset + PAGE_SIZE)}>{m.next}</button>}
  </span>;
}
