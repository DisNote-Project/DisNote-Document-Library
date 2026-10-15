export {
  buildSearchProjection,
  type DocumentSearchProjection,
  type SearchReference,
} from "./projection.js";
export {
  validateOperations,
  applyOperations,
  previewDiff,
  type AIDocumentOperation,
  type OperationIssue,
  type ApplyResult,
  type DiffEntry,
} from "./ai-operations.js";
export * from "./search.js";
export * from "./provider.js";
