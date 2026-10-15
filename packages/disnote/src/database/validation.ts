import { DATABASE_ERRORS, PROPERTY_TYPES, type DatabaseSnapshot } from "./model.js";
import { validateCell, validateFormula } from "./evaluate.js";
export function validateDatabaseSnapshot(database: DatabaseSnapshot): void {
  if (!database || !database.id || typeof database.title !== "string" || !Number.isInteger(database.revision) || database.revision < 1 || !Array.isArray(database.properties) || !Array.isArray(database.records) || database.properties.length > 200 || database.records.length > 10000) throw new Error(DATABASE_ERRORS.INVALID);
  const ids = new Set<string>();
  for (const property of database.properties) {
    if (!property || typeof property.id !== "string" || !property.id || ids.has(property.id) || typeof property.name !== "string" || !Object.values(PROPERTY_TYPES).includes(property.type)) throw new Error(DATABASE_ERRORS.INVALID);
    ids.add(property.id);
    if (property.options && (!Array.isArray(property.options) || property.options.some(value => typeof value !== "string") || new Set(property.options).size !== property.options.length)) throw new Error(DATABASE_ERRORS.INVALID);
    if (property.type === PROPERTY_TYPES.FORMULA && !property.formula) throw new Error(DATABASE_ERRORS.INVALID);
    if (property.type === PROPERTY_TYPES.ROLLUP && !property.rollup) throw new Error(DATABASE_ERRORS.INVALID);
    if (property.type === PROPERTY_TYPES.RELATION && !property.targetDatabaseId) throw new Error(DATABASE_ERRORS.INVALID);
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
}
