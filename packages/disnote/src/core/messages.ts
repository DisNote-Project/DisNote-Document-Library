/**
 * Stable developer-facing messages emitted by the document library.
 * Keeping them here makes wording changes auditable without coupling callers
 * to implementation modules.
 */
export const LIBRARY_MESSAGES = {
  duplicateBlockId: (id: string) => `block id "${id}" already exists`,
  parentNotFound: (id: string) => `parent "${id}" not found`,
  blockNotFound: (id: string) => `block "${id}" not found`,
  documentAlreadyExists: (id: string) => `Document ${id} already exists.`,
  slugAlreadyExists: (slug: string, locale: string) =>
    `Document slug "${slug}" already exists for locale "${locale}".`,
  DOCUMENT_ID_MISMATCH: "document id must match documentId",
  revisionNotFound: (revision: number, documentId: string) =>
    `Revision ${revision} not found for ${documentId}.`,
  documentNotFound: (id: string) => `Document ${id} not found.`,
  DOCUMENT_REPOSITORY_VALIDATION_FAILED:
    "Document failed repository validation.",
  RENDER_CONTEXT_REQUIRED:
    "DisNote render components must be used inside <DocumentRenderer>.",
  YJS_VALUE_OUTSIDE_CONTRACT:
    "Yjs document contains a value outside the DisNote JSON contract.",
  commentThreadNotFound: (id: string) => `Comment thread ${id} not found`,
  CANNOT_EDIT_ARCHIVED_DOCUMENT: "cannot edit an archived document",
  CANNOT_PUBLISH_ARCHIVED_DOCUMENT: "cannot publish an archived document",
  revisionForDocument: (revision: number, documentId: string) =>
    `revision ${revision} for ${documentId}`,
  LEGAL_EFFECTIVE_DATE_REQUIRED:
    "legal document needs metadata.attributes.effectiveDate",
  DOCUMENT_MUST_BE_OBJECT: "document must be an object",
  CANNOT_MOVE_BLOCK_INTO_ITSELF: "cannot move a block into itself",
  NO_BLOCKS_TO_WRAP: "no blocks to wrap",
  BLOCKS_MUST_BE_CONTIGUOUS_SIBLINGS:
    "blocks to wrap must be contiguous siblings",
  documentMigrationStepInvalid: (from: number, to: number) =>
    `Document migration must step exactly one version (${from} -> ${to}).`,
  documentMigrationAlreadyRegistered: (from: number) =>
    `Document migration from ${from} already registered.`,
  blockMigrationStepInvalid: (type: string, from: number, to: number) =>
    `Block migration must step exactly one version (${type} ${from} -> ${to}).`,
  blockMigrationAlreadyRegistered: (key: string) =>
    `Block migration ${key} already registered.`,
  documentSchemaNewerThanTarget: (schemaVersion: number, target: number) =>
    `Document schema ${schemaVersion} is newer than supported target ${target}.`,
  documentMigrationMissing: (schemaVersion: number) =>
    `No document migration registered from schema ${schemaVersion}.`,
  blockTypeAlreadyRegistered: (type: string) =>
    `Block type "${type}" is already registered.`,
  blockVersionInvalid: (type: string) =>
    `Block "${type}" must have a positive integer version.`,
  unsupportedInlineContent: (type: string) =>
    `Unsupported BlockNote inline content type "${type}".`,
  UPLOADED_FILE_EMPTY: "Uploaded file is empty",
  mimeNotAllowed: (mimeType: string) => `MIME "${mimeType}" is not allowed`,
  fileTooLarge: (maxSize: number) => `File exceeds max size ${maxSize} bytes`,
  ASSET_KEY_COLLISION: "Could not allocate a unique asset key",
  assetSizeMismatch: (declared: number, actual: number) =>
    `Declared size ${declared} does not match payload size ${actual}`,
  assetMimeMismatch: (declared: string, detected: string) =>
    `Declared MIME "${declared}" does not match content "${detected}"`,
  UNSAFE_BLOCK_URL_DROPPED: (blockType: string) =>
    `Dropped unsafe URL from "${blockType}" block.`,
  UNSAFE_LINK_DROPPED: (href: string) => `Dropped unsafe link href "${href}".`,
  unsupportedBlockVersion: (type: string, version: number) =>
    `Block "${type}" version ${version} is newer than this renderer supports.`,
  unknownBlockFallback: (type: string) =>
    `Unknown block type "${type}" rendered as read-only fallback.`,
  unsafeLinkDropped: (href: string) => `Dropped unsafe link href "${href}"`,
  unsafeHrefDropped: (href: string) => `Dropped unsafe href "${href}"`,
  NO_SUPPORTED_HTML: "No supported block-level HTML was found",
  mentionExportedAsText: (label: string) =>
    `Mention "@${label}" exported as plain text`,
  referenceExportedAsText: (label: string) =>
    `Reference "${label}" exported as plain text`,
  UNDERLINE_DROPPED: "Underline has no Markdown equivalent; dropped",
  COLOR_MARK_DROPPED: "Color mark dropped in Markdown export",
  CALLOUT_EXPORTED_AS_QUOTE: "Callout exported as blockquote",
  IMAGE_EXPORTED_AS_ASSET_REFERENCE:
    "Image exported with assetId reference, not a URL",
  unknownBlockOmitted: (type: string) =>
    `Unknown block "${type}" omitted from Markdown`,
  DOCUMENTS_NOT_SEMANTICALLY_EQUAL: "Documents are not semantically equal.",
  expectedValue: (expected: unknown, actual: unknown) =>
    `expected ${String(expected)} but got ${String(actual)}`,
  expectedJson: (expected: unknown, actual: unknown) =>
    `expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`,
  validationFailed: (issueCount: number) =>
    `Document failed validation with ${issueCount} issue(s).`,
  HEADING_PROPS_OBJECT: "heading props must be an object",
  HEADING_LEVEL_INVALID: "heading level must be 1, 2 or 3",
  CODE_BLOCK_PROPS_OBJECT: "codeBlock props must be an object",
  IMAGE_PROPS_OBJECT: "image props must be an object",
  IMAGE_ASSET_ID_REQUIRED: "image requires a non-empty assetId",
  TABLE_ROWS_ARRAY: "table rows must be an array",
  BOOKMARK_URL_UNSAFE: "bookmark URL is unsafe or malformed",
  BOOKMARK_IMAGE_UNSAFE: "bookmark image URL is unsafe or malformed",
  mediaUrlUnsafe: (type: string) => `${type} URL is unsafe or malformed`,
  mediaWidthInvalid: (type: string) =>
    `${type} width must be a positive finite number`,
  COLUMN_WIDTH_INVALID: "column width must be greater than 0 and at most 1",
  MARKS_ARRAY: "marks must be an array",
  MARK_TYPE_STRING: "mark must have a string type",
  unknownMark: (type: string) => `unknown mark "${type}"`,
  markValueString: (type: string) => `${type} requires a string value`,
  markColorInvalid: (type: string) => `${type} contains an invalid color value`,
  LINK_CONTENT_TEXT_ONLY: "link content must contain text nodes only",
  TEXT_STRING: "text must be a string",
  INLINE_CONTENT_ARRAY: "content must be an array of inline nodes",
  INLINE_TYPE_STRING: "inline node must have a string type",
  LINK_HREF_STRING: "link href must be a string",
  URL_UNSAFE: "unsafe or malformed URL",
  LINK_CONTENT_ARRAY: "link content must be an array of text nodes",
  MENTION_ENTITY_TYPE_INVALID: "mention entityType must be user or channel",
  MENTION_ENTITY_ID_REQUIRED: "mention requires a non-empty entityId",
  MENTION_LABEL_STRING: "mention label must be a string",
  REFERENCE_TARGET_TYPE_UNSUPPORTED: "reference targetType is unsupported",
  REFERENCE_TARGET_ID_REQUIRED: "reference requires a non-empty targetId",
  REFERENCE_LABEL_STRING: "reference label must be a string",
  unknownInlineType: (type: string) => `unknown inline type "${type}"`,
  BLOCKS_ARRAY: "blocks must be an array",
  maxDepthExceeded: (depth: number, maxDepth: number) =>
    `nesting depth ${depth} exceeds max ${maxDepth}`,
  BLOCK_OBJECT: "block must be an object",
  BLOCK_CYCLE: "block graph contains a cycle",
  BLOCK_ID_REQUIRED: "block id must be a non-empty string",
  duplicateBlock: (id: string) => `duplicate block id "${id}"`,
  BLOCK_TYPE_REQUIRED: "block type must be a non-empty string",
  BLOCK_VERSION_INVALID: "block version must be a positive integer",
  BLOCK_PROPS_OBJECT: "block props must be an object",
  BLOCK_PROPS_JSON: "block props must be JSON-safe",
  blockTypeNotRegistered: (type: string) =>
    `block type "${type}" is not registered`,
  blockInlineContentUnsupported: (type: string) =>
    `block "${type}" does not support inline content`,
  blockChildrenUnsupported: (type: string) =>
    `block "${type}" does not support children`,
  invalidFormat: (format: string) => `format must be "${format}"`,
  SCHEMA_VERSION_INVALID: "schemaVersion must be a non-negative integer",
  DOCUMENT_ID_REQUIRED: "document id must be a non-empty string",
  METADATA_OBJECT: "metadata must be an object",
  TITLE_STRING: "title must be a string",
  DESCRIPTION_STRING: "description must be a string",
  LOCALE_INVALID: "locale must be en or vi",
  CREATED_AT_ISO: "createdAt must be an ISO date string",
  UPDATED_AT_ISO: "updatedAt must be an ISO date string",
  CREATED_BY_STRING: "createdBy must be a string",
  TAGS_ARRAY: "tags must be an array of strings",
  ATTRIBUTES_JSON: "attributes must be a JSON-safe object",
  TABLE_OF_CONTENTS: "Table of Contents",
  NO_HEADINGS: "No headings",
  DATABASE_REFERENCE: "Database reference",
  BREADCRUMB_UNAVAILABLE: "Breadcrumb unavailable",
  SYNCED_CONTENT: "🔄 Synced Content",
  ADD_WEB_BOOKMARK: "🔗 Add a Web Bookmark",
  SYNCED_BLOCK: "🔄 Synced Block",
} as const;
