import { FORMULA_OPERATORS, type Formula, type DatabaseProperty, type CellValue } from "../model.js";
import { FORMULA_ARITY } from "../formula-operations.js";
import { useDatabaseMessages } from "./customization.js";
import { formulaOperatorLabels } from "../../ui/formula-messages.js";
const EMPTY: Formula = { kind: "literal", value: null };
const MAX_UI_DEPTH = 6, MAX_UI_ARGUMENTS = 20;
/** Structured AST editor; unknown depth remains available through explicit JSON editing. */
export function FormulaEditor({ value = EMPTY, properties, onChange, locale, depth = 0 }: { value?: Formula; properties: DatabaseProperty[]; onChange(value: Formula): void; locale?: string; depth?: number }) {
  const m = useDatabaseMessages(locale), labels = formulaOperatorLabels(locale);
  if (depth > MAX_UI_DEPTH) return <p>{m.formulaDepth}</p>;
  const nested = (formula: Formula, change: (value: Formula) => void, label: string) => <fieldset><legend>{label}</legend><FormulaEditor value={formula} properties={properties} onChange={change} locale={locale} depth={depth + 1} /></fieldset>;
  return <div className="disnote-db__formula">
    <label>{m.formulaNode}<select value={value.kind} onChange={event => {
      const kind = event.target.value;
      onChange(kind === "literal" ? EMPTY : kind === "property" ? { kind, propertyId: properties[0]?.id ?? "" } : kind === "if" ? { kind, condition: EMPTY, yes: EMPTY, no: EMPTY } : { kind: "operation", operator: "add", args: [EMPTY, EMPTY] });
    }}><option value="literal">{m.formulaLiteral}</option><option value="property">{m.formulaProperty}</option><option value="operation">{m.formulaOperation}</option><option value="if">{m.formulaIf}</option></select></label>
    {value.kind === "property" && <label>{m.formulaProperty}<select required value={value.propertyId} onChange={event => onChange({ ...value, propertyId: event.target.value })}><option value="" />{properties.map(property => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>}
    {value.kind === "literal" && <>
      <label>{m.formulaValueType}<select value={value.value === null ? "null" : Array.isArray(value.value) ? "list" : typeof value.value} onChange={event => onChange({ kind: "literal", value: event.target.value === "null" ? null : event.target.value === "number" ? 0 : event.target.value === "boolean" ? false : event.target.value === "list" ? [] : "" })}><option value="null">{m.formulaNull}</option><option value="string">{m.property_text}</option><option value="number">{m.property_number}</option><option value="boolean">{m.property_checkbox}</option><option value="list">{m.formulaList}</option></select></label>
      {value.value !== null && <label>{Array.isArray(value.value) ? m.formulaList : m.value}{Array.isArray(value.value) ? <textarea value={value.value.join("\n")} onChange={event => onChange({ ...value, value: event.target.value ? event.target.value.split("\n") : [] })} /> : <input type={typeof value.value === "boolean" ? "checkbox" : typeof value.value === "number" ? "number" : "text"} step="any" checked={value.value === true} value={typeof value.value === "boolean" ? undefined : String(value.value)} onChange={event => onChange({ ...value, value: typeof value.value === "boolean" ? event.target.checked : typeof value.value === "number" ? (event.target.value ? Number(event.target.value) : 0) : event.target.value } as { kind: "literal"; value: CellValue })} />}</label>}
    </>}
    {value.kind === "if" && <>{nested(value.condition, condition => onChange({ ...value, condition }), m.formulaCondition)}{nested(value.yes, yes => onChange({ ...value, yes }), m.formulaYes)}{nested(value.no, no => onChange({ ...value, no }), m.formulaNo)}</>}
    {value.kind === "operation" && <>
      <label>{m.formulaOperation}<select value={value.operator} onChange={event => { const operator = event.target.value as typeof value.operator, arity = FORMULA_ARITY[operator]; onChange({ ...value, operator, args: arity === undefined ? value.args : Array.from({ length: arity }, (_, index) => value.args[index] ?? EMPTY) }); }}>{FORMULA_OPERATORS.map(operator => <option key={operator} value={operator}>{labels[operator]}</option>)}</select></label>
      {value.args.map((argument, index) => <div key={index}>{nested(argument, next => onChange({ ...value, args: value.args.map((item, at) => at === index ? next : item) }), `${m.formulaArgument} ${index + 1}`)}{FORMULA_ARITY[value.operator] === undefined && <button type="button" onClick={() => onChange({ ...value, args: value.args.filter((_, at) => at !== index) })}>{m.remove}</button>}</div>)}
      {FORMULA_ARITY[value.operator] === undefined && <button type="button" disabled={value.args.length >= MAX_UI_ARGUMENTS} onClick={() => onChange({ ...value, args: [...value.args, EMPTY] })}>{m.formulaAddArgument}</button>}
    </>}
  </div>;
}
