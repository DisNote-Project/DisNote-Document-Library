import { useContext, type ReactNode } from "react";
import { PROPERTY_TYPES, type CellValue, type DatabaseProperty } from "../model.js";
import { DatabaseViewContext, type DatabaseViewProvider } from "./context.js";
import { RecordChoiceInput } from "./RecordChoiceInput.js";
import { useDatabaseCustomization } from "./customization.js";
import { toLocalDateTime } from "./date-input.js";
function display(value: CellValue | undefined): string { return value == null ? "" : Array.isArray(value) ? value.join(", ") : String(value); }
export function CellInput({ property, value, onChange, provider: supplied, locale }: { property: DatabaseProperty; value: CellValue; onChange: (value: CellValue) => void; provider?: DatabaseViewProvider; locale?: string }): ReactNode {
  const context = useContext(DatabaseViewContext), provider = supplied ?? context;
  const customization = useDatabaseCustomization();
  const Editor = customization.propertyEditors?.[property.id] ?? customization.editors?.[property.type];
  if (Editor) return <Editor property={property} value={value} onChange={onChange} locale={locale} />;
  if (property.type === PROPERTY_TYPES.DATE && (property.dateFormat === "datetime" || (typeof value === "string" && value.includes("T")))) return <input type="datetime-local" value={typeof value === "string" ? toLocalDateTime(value) : ""} onChange={event => { const date = new Date(event.target.value); onChange(Number.isFinite(date.getTime()) ? date.toISOString() : null); }} />;
  if (provider && (property.type === PROPERTY_TYPES.RELATION || (property.type === PROPERTY_TYPES.PERSON && provider.searchPeople))) return <RecordChoiceInput property={property} value={Array.isArray(value) ? value : []} onChange={onChange} provider={provider} locale={locale} />;
  if (property.type === PROPERTY_TYPES.CHECKBOX) return <input type="checkbox" checked={value === true} onChange={e => onChange(e.target.checked)} />;
  if (property.type === PROPERTY_TYPES.SELECT || property.type === PROPERTY_TYPES.STATUS) return <select value={display(value)} onChange={e => onChange(e.target.value || null)}><option value="" />{property.options?.map(option => <option key={option}>{option}</option>)}</select>;
  if (property.type === PROPERTY_TYPES.MULTI_SELECT) return <select multiple value={Array.isArray(value) ? value : []} onChange={e => onChange([...e.target.selectedOptions].map(o => o.value))}>{property.options?.map(option => <option key={option}>{option}</option>)}</select>;
  return <input step={property.type === PROPERTY_TYPES.NUMBER ? "any" : undefined} type={property.type === PROPERTY_TYPES.NUMBER ? "number" : property.type === PROPERTY_TYPES.DATE ? "date" : property.type === PROPERTY_TYPES.URL ? "url" : property.type === PROPERTY_TYPES.EMAIL ? "email" : property.type === PROPERTY_TYPES.PHONE ? "tel" : "text"} value={property.type === PROPERTY_TYPES.DATE ? display(value).slice(0, 10) : display(value)} onChange={e => {
    const raw = e.target.value;
    onChange(!raw ? null : property.type === PROPERTY_TYPES.NUMBER ? Number(raw) : property.type === PROPERTY_TYPES.RELATION || property.type === PROPERTY_TYPES.PERSON ? raw.split(",").map(v => v.trim()).filter(Boolean) : raw);
  }} />;
}
