import { DATABASE_FILTER_OPERATORS, type DatabaseFilter, type DatabaseProperty } from "../model.js";
import { useDatabaseMessages } from "./customization.js";
import { CellInput } from "./CellInput.js";
export function FilterEditor({ value, properties, onChange, locale, depth = 0 }: { value?: DatabaseFilter; properties: DatabaseProperty[]; onChange(value?: DatabaseFilter): void; locale?: string; depth?: number }) {
  const m = useDatabaseMessages(locale), condition = (): DatabaseFilter => ({ kind: "condition", propertyId: properties[0]?.id ?? "", operator: "equal", value: null });
  if (!properties.length) return null;
  if (!value) return <button type="button" onClick={() => onChange({ kind: "all", filters: [condition()] })}>{m.filter}</button>;
  if (value.kind === "all" || value.kind === "any") return <fieldset className="disnote-db__filter"><legend>{m.filter}</legend>
    <select aria-label={m.filter} value={value.kind} onChange={event => onChange({ ...value, kind: event.target.value as "all" | "any" })}><option value="all">{m.matchAll}</option><option value="any">{m.matchAny}</option></select>
    {value.filters.map((filter, index) => <FilterEditor key={index} value={filter} properties={properties} locale={locale} depth={depth + 1} onChange={next => onChange({ ...value, filters: value.filters.flatMap((item, at) => at === index ? next ? [next] : [] : [item]) })} />)}
    {value.filters.length < 20 && <button type="button" onClick={() => onChange({ ...value, filters: [...value.filters, condition()] })}>{m.addCondition}</button>}
    {depth < 4 && <button type="button" onClick={() => onChange({ ...value, filters: [...value.filters, { kind: "any", filters: [condition()] }] })}>{m.addGroup}</button>}
    <button type="button" onClick={() => onChange()}>{m.remove}</button>
  </fieldset>;
  if (value.kind !== "condition") return null;
  const property = properties.find(item => item.id === value.propertyId) ?? properties[0]!;
  return <div className="disnote-db__filter-condition"><select aria-label={m.propertyName} value={property.id} onChange={event => onChange({ ...value, propertyId: event.target.value, value: null })}>{properties.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
    <select aria-label={m.filter} value={value.operator} onChange={event => onChange({ ...value, operator: event.target.value as typeof value.operator })}>{DATABASE_FILTER_OPERATORS.map(key => <option key={key} value={key}>{m[key === "empty" ? "emptyValue" : key]}</option>)}</select>
    {value.operator !== "empty" && value.operator !== "notEmpty" && <label>{m.value}<CellInput property={property.type === "formula" || property.type === "rollup" ? { ...property, type: "number" } : property} value={value.value ?? null} onChange={next => onChange({ ...value, value: next })} /></label>}
    <button type="button" onClick={() => onChange()}>{m.remove}</button>
  </div>;
}
