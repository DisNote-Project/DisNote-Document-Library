import { PROPERTY_TYPES, type DatabaseFilter, type DatabaseProperty, type DatabaseSavedView } from "./model.js";
function pruneFilter(filter: DatabaseFilter | undefined, ids: Set<string>): DatabaseFilter | undefined {
  if (!filter) return undefined;
  if (filter.kind === "condition") return ids.has(filter.propertyId) ? filter : undefined;
  const filters = filter.filters.map(item => pruneFilter(item, ids)).filter((item): item is DatabaseFilter => !!item);
  return filters.length ? { kind: filter.kind, filters } : undefined;
}
/** Keep saved view references valid after an explicitly authorized property change. */
export function reconcileDatabaseView(source: DatabaseSavedView, properties: DatabaseProperty[]): DatabaseSavedView {
  const view = structuredClone(source), ids = new Set(properties.map(property => property.id));
  if (view.columns) view.columns = view.columns.filter(column => ids.has(column.propertyId));
  for (const key of ["groupPropertyId", "datePropertyId", "endDatePropertyId"] as const) if (view[key] && !ids.has(view[key]!)) delete view[key];
  if (view.query) view.query = { ...view.query, filter: pruneFilter(view.query.filter, ids), sort: view.query.sort?.filter(sort => ids.has(sort.propertyId)), ...(view.query.groupBy && !ids.has(view.query.groupBy) ? { groupBy: undefined } : {}) };
  if (view.chart && (!ids.has(view.chart.groupPropertyId) || (view.chart.valuePropertyId && !ids.has(view.chart.valuePropertyId)))) delete view.chart;
  else if (view.chart) view.chart.filter = pruneFilter(view.chart.filter, ids);
  if (view.form) view.form.fields = view.form.fields.filter(field => properties.some(property => property.id === field.propertyId && property.type !== PROPERTY_TYPES.FORMULA && property.type !== PROPERTY_TYPES.ROLLUP));
  return view;
}
