import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from "react";
import type { CellValue, DatabaseProperty, DatabaseRecord, DatabaseQueryResult, DatabaseViewKind } from "../model.js";
import { uiMessages, type UIMessageKey } from "../../ui/messages.js";

export interface DatabaseCellProps {
  property: DatabaseProperty;
  value: CellValue;
  locale?: string;
}
export interface DatabaseCellEditorProps extends DatabaseCellProps {
  onChange(value: CellValue): void;
}
export interface DatabaseCardProps {
  record: DatabaseRecord;
  label: string;
  properties: ReactNode;
  controls: ReactNode;
  readonly: boolean;
}
export interface DatabaseSurfaceProps {
  data: DatabaseQueryResult;
  view: DatabaseViewKind;
  readonly: boolean;
  reload(): Promise<void>;
}
/** Trusted application components only. These replace presentation, never server policy. */
export interface DatabaseCustomization {
  messages?: Partial<Record<UIMessageKey, string>>;
  cells?: Partial<Record<DatabaseProperty["type"], ComponentType<DatabaseCellProps>>>;
  editors?: Partial<Record<DatabaseProperty["type"], ComponentType<DatabaseCellEditorProps>>>;
  propertyCells?: Record<string, ComponentType<DatabaseCellProps>>;
  propertyEditors?: Record<string, ComponentType<DatabaseCellEditorProps>>;
  card?: ComponentType<DatabaseCardProps>;
  header?: ComponentType<DatabaseSurfaceProps>;
  toolbar?: ComponentType<DatabaseSurfaceProps>;
  empty?: ComponentType<DatabaseSurfaceProps>;
}
const Context = createContext<DatabaseCustomization>({});
export function DatabaseCustomizationProvider({ value, children }: { value: DatabaseCustomization; children: ReactNode }) {
  const parent = useContext(Context);
  const merged = useMemo(() => ({ ...parent, ...value,
    messages: { ...parent.messages, ...value.messages },
    cells: { ...parent.cells, ...value.cells }, editors: { ...parent.editors, ...value.editors },
    propertyCells: { ...parent.propertyCells, ...value.propertyCells }, propertyEditors: { ...parent.propertyEditors, ...value.propertyEditors },
  }), [parent, value]);
  return <Context.Provider value={merged}>{children}</Context.Provider>;
}
export function useDatabaseCustomization(): DatabaseCustomization { return useContext(Context); }
export function useDatabaseMessages(locale?: string): Record<UIMessageKey, string> {
  const { messages } = useDatabaseCustomization();
  return { ...uiMessages(locale), ...messages };
}
export function DatabaseCellValue(props: DatabaseCellProps) {
  const customization = useDatabaseCustomization();
  const Renderer = customization.propertyCells?.[props.property.id] ?? customization.cells?.[props.property.type];
  if (Renderer) return <Renderer {...props} />;
  const label = props.value == null ? "" : Array.isArray(props.value) ? props.value.join(", ") : String(props.value);
  return <>{label}</>;
}
