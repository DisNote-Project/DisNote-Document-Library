import { useEffect, useRef, useState } from "react";
import { PROPERTY_TYPES, type DatabaseProperty } from "../model.js";
import { useDatabaseMessages } from "./customization.js";
import { FormulaEditor } from "./FormulaEditor.js";
function PropertyFields({ property, properties, update, locale }: { property: DatabaseProperty; properties: DatabaseProperty[]; update(property: DatabaseProperty): void; locale?: string }) {
  const m = useDatabaseMessages(locale), [advanced, setAdvanced] = useState(JSON.stringify({ ...(property.formula ? { formula: property.formula } : {}), ...(property.rollup ? { rollup: property.rollup } : {}), ...(property.targetDatabaseId ? { targetDatabaseId: property.targetDatabaseId } : {}) }, null, 2)), [invalid, setInvalid] = useState(false);
  const configInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { configInput.current?.setCustomValidity(invalid ? m.failed : ""); }, [invalid, m.failed]);
  return <div><label>{m.propertyName}<input value={property.name} onChange={event => update({ ...property, name: event.target.value })} /></label>
    <label>{m.propertyType}<select value={property.type} onChange={event => update({ id: property.id, name: property.name, type: event.target.value as DatabaseProperty["type"], ...(event.target.value === PROPERTY_TYPES.FORMULA ? { formula: { kind: "literal", value: null } } : {}) })}>{Object.values(PROPERTY_TYPES).map(type => <option key={type} value={type}>{m[`property_${type}`]}</option>)}</select></label>
    {(property.type === PROPERTY_TYPES.SELECT || property.type === PROPERTY_TYPES.MULTI_SELECT || property.type === PROPERTY_TYPES.STATUS) && <label>{m.options}<textarea value={(property.options ?? []).join("\n")} onChange={event => update({ ...property, options: event.target.value.split("\n").filter(Boolean) })} /></label>}
    {property.type === PROPERTY_TYPES.DATE && <label>{m.dateDisplay}<select value={property.dateFormat ?? "date"} onChange={event => update({ ...property, dateFormat: event.target.value as "date" | "datetime" })}><option value="date">{m.dateOnly}</option><option value="datetime">{m.dateTime}</option></select></label>}
    {property.type === PROPERTY_TYPES.FORMULA && <FormulaEditor value={property.formula} properties={properties.filter(item => item.id !== property.id)} locale={locale} onChange={formula => { update({ ...property, formula }); setAdvanced(JSON.stringify({ formula }, null, 2)); setInvalid(false); }} />}
    {[PROPERTY_TYPES.FORMULA, PROPERTY_TYPES.ROLLUP, PROPERTY_TYPES.RELATION].includes(property.type as "formula") && <label>{m.advancedConfig}<textarea ref={configInput} value={advanced} onChange={event => { setAdvanced(event.target.value); try { const config = JSON.parse(event.target.value); if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error(); update({ ...property, formula: config.formula, rollup: config.rollup, targetDatabaseId: config.targetDatabaseId }); setInvalid(false); event.target.setCustomValidity(""); } catch { setInvalid(true); event.target.setCustomValidity(m.failed); } }} />{invalid && <span role="alert">{m.failed}</span>}</label>}
  </div>;
}
export function PropertySettings({ properties, revision, save, locale }: { properties: DatabaseProperty[]; revision: number; save(properties: DatabaseProperty[], revision: number): Promise<void>; locale?: string }) {
  const [draft, setDraft] = useState(() => structuredClone(properties)), [base] = useState(revision), [failed, setFailed] = useState(false), [busy, setBusy] = useState(false);
  const m = useDatabaseMessages(locale);
  return <form className="disnote-db__form" aria-label={m.properties} onSubmit={event => { event.preventDefault(); setFailed(false); setBusy(true); void save(draft, base).catch(() => setFailed(true)).finally(() => setBusy(false)); }}>
    {draft.map(property => <fieldset key={property.id}><PropertyFields key={`${property.id}:${property.type}`} property={property} properties={draft} locale={locale} update={value => setDraft(draft.map(item => item.id === property.id ? value : item))} /><button type="button" onClick={() => setDraft(draft.filter(item => item.id !== property.id))}>{m.remove}</button></fieldset>)}
    <button type="button" onClick={() => setDraft([...draft, { id: crypto.randomUUID(), name: m.newProperty, type: PROPERTY_TYPES.TEXT }])}>{m.newProperty}</button>
    {failed && <p role="alert">{m.conflict}</p>}<button type="submit" disabled={busy}>{m.save}</button>
  </form>;
}
