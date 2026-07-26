/**
 * @disnote/document-core — the vendor-neutral heart of DisNote Document.
 * Pure TypeScript: no React, DOM, database or BlockNote imports.
 */

// Model + builders
export * from "./model/index.js";

// Registry + core block definitions
export * from "./registry/index.js";
export {
  coreBlockDefinitions,
  createDefaultRegistry,
  paragraphCore,
  headingCore,
  bulletListItemCore,
  numberedListItemCore,
  toggleCore,
  checklistItemCore,
  quoteCore,
  codeBlockCore,
  imageCore,
  dividerCore,
  calloutCore,
  tableCore,
  mathCore,
  tableOfContentsCore,
  breadcrumbCore,
  syncedBlockCore,
  templateButtonCore,
  toggleHeading1Core,
  toggleHeading2Core,
  toggleHeading3Core,
  bookmarkCore,
  videoCore,
  audioCore,
  fileCore,
  tableDbCore,
  boardCore,
  listDbCore,
  galleryCore,
  calendarCore,
  timelineCore,
  mapCore,
} from "./registry/core-blocks.js";

// Validation
export * from "./validation/index.js";

// Traversal
export * from "./traversal/index.js";

// Transformations
export * from "./transformations/index.js";

// Serialization
export * from "./serialization/index.js";

// Migrations
export * from "./migrations/index.js";

// Errors
export * from "./errors/index.js";

// Presets
export * from "./presets.js";

// Selection Engine
export * from "./selection/selection.js";

