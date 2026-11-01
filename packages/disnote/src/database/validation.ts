import { DATABASE_ERRORS, PROPERTY_TYPES, DATABASE_VIEW_KINDS, type DatabaseSnapshot } from "./model.js";
import { validateCell, validateFormula, validateFilter } from "./evaluate.js";
import { validateTaskGraph } from "./tasks.js";
export function validateDatabaseSnapshot(database: DatabaseSnapshot): void {
  if (!database || !database.id || typeof database.title !== "string" || !Number.isInteger(database.revision) || database.revision < 1 || !Array.isArray(database.properties) || !Array.isArray(database.records) || database.properties.length > 200 || database.records.length > 10000) throw new Error(DATABASE_ERRORS.INVALID);
  const ids = new Set<string>();
  for (const property of database.properties) {
    if (!property || typeof property.id !== "string" || !property.id || ids.has(property.id) || typeof property.name !== "string" || !Object.values(PROPERTY_TYPES).includes(property.type)) throw new Error(DATABASE_ERRORS.INVALID);
    ids.add(property.id);
    if (property.dateFormat !== undefined && (property.type !== PROPERTY_TYPES.DATE || !["date", "datetime"].includes(property.dateFormat))) throw new Error(DATABASE_ERRORS.INVALID);
    if (property.options && (!Array.isArray(property.options) || property.options.some(value => typeof value !== "string") || new Set(property.options).size !== property.options.length)) throw new Error(DATABASE_ERRORS.INVALID);
    if (property.type === PROPERTY_TYPES.FORMULA && !property.formula) throw new Error(DATABASE_ERRORS.INVALID);
    if (property.type === PROPERTY_TYPES.ROLLUP && !property.rollup) throw new Error(DATABASE_ERRORS.INVALID);
    if (property.type === PROPERTY_TYPES.RELATION && !property.targetDatabaseId) throw new Error(DATABASE_ERRORS.INVALID);
  }
  if (database.views !== undefined) {
    if (!Array.isArray(database.views) || database.views.length > 50) throw new Error(DATABASE_ERRORS.LIMIT);
    const views = new Set<string>();
    for (const view of database.views) {
      if (!view || typeof view.id !== "string" || !view.id || views.has(view.id) || typeof view.name !== "string" || !view.name.trim() || view.name.length > 200 || !DATABASE_VIEW_KINDS.includes(view.kind)) throw new Error(DATABASE_ERRORS.INVALID);
      views.add(view.id);
      if (view.query?.search !== undefined && (typeof view.query.search !== "string" || view.query.search.length > 200)) throw new Error(DATABASE_ERRORS.INVALID);
      for (const property of [view.groupPropertyId, view.datePropertyId, view.endDatePropertyId]) if (property !== undefined && !ids.has(property)) throw new Error(DATABASE_ERRORS.INVALID);
      if (view.query?.filter) validateFilter(view.query.filter, ids);
      if (view.query?.sort && (!Array.isArray(view.query.sort) || view.query.sort.some(sort => !ids.has(sort.propertyId) || !["asc", "desc"].includes(sort.direction)))) throw new Error(DATABASE_ERRORS.INVALID);
      if (view.query?.groupBy && !ids.has(view.query.groupBy)) throw new Error(DATABASE_ERRORS.INVALID);
      if (view.columns && (!Array.isArray(view.columns) || new Set(view.columns.map(column => column.propertyId)).size !== view.columns.length || view.columns.some(column => !ids.has(column.propertyId) || !Number.isFinite(column.width) || column.width < 100 || column.width > 800 || (column.hidden !== undefined && typeof column.hidden !== "boolean")))) throw new Error(DATABASE_ERRORS.INVALID);
      if (view.chart) {
        if (view.chartStyle && !["bar", "line", "donut"].includes(view.chartStyle)) throw new Error(DATABASE_ERRORS.INVALID);
        if (!ids.has(view.chart.groupPropertyId) || (view.chart.valuePropertyId && !ids.has(view.chart.valuePropertyId)) || !["count", "sum", "average", "min", "max"].includes(view.chart.aggregate)) throw new Error(DATABASE_ERRORS.INVALID);
        if (view.chart.filter) validateFilter(view.chart.filter, ids);
      }
      if (view.form && (!Array.isArray(view.form.fields) || new Set(view.form.fields.map(field => field.propertyId)).size !== view.form.fields.length || view.form.fields.some(field => !ids.has(field.propertyId) || typeof field.required !== "boolean" || database.properties.some(property => property.id === field.propertyId && [PROPERTY_TYPES.FORMULA, PROPERTY_TYPES.ROLLUP].includes(property.type as "formula"))))) throw new Error(DATABASE_ERRORS.INVALID);
    }
  }
  for (const property of database.properties) {
    if (property.formula) validateFormula(property.formula, ids);
    if (property.rollup && (!ids.has(property.rollup.relationId) || database.properties.find(p => p.id === property.rollup!.relationId)?.type !== PROPERTY_TYPES.RELATION || !["count", "sum", "average", "min", "max"].includes(property.rollup.aggregate))) throw new Error(DATABASE_ERRORS.INVALID);
  }
  const records = new Set<string>();
  for (const record of database.records) {
    if (!record || typeof record.id !== "string" || !record.id || records.has(record.id) || !record.values || typeof record.values !== "object" || Array.isArray(record.values)) throw new Error(DATABASE_ERRORS.INVALID);
    records.add(record.id);
    for (const [id, value] of Object.entries(record.values)) {
      const property = database.properties.find(p => p.id === id);
      if (!property || !validateCell(property, value)) throw new Error(DATABASE_ERRORS.INVALID);
    }
  }
  validateTaskGraph(database);
}
