/**
 * Editor localization.
 *
 * English is the only dictionary bundled by the library. Applications can
 * provide partial message overrides without forking DisNote. Components must
 * use message keys instead of embedding user-facing text directly.
 */

export const DEFAULT_EDITOR_LOCALE = "en";

export const EN_EDITOR_MESSAGES = {
  "toolbar.bold": "Bold",
  "toolbar.italic": "Italic",
  "toolbar.underline": "Underline",
  "toolbar.strike": "Strikethrough",
  "toolbar.code": "Inline code",
  "toolbar.link": "Insert link",
  "toolbar.image": "Insert image",
  "toolbar.formatting": "Formatting",
  "slash.paragraph": "Text",
  "slash.heading1": "Heading 1",
  "slash.heading2": "Heading 2",
  "slash.heading3": "Heading 3",
  "slash.bulletList": "Bulleted list",
  "slash.numberedList": "Numbered list",
  "slash.checklist": "Checklist",
  "slash.quote": "Quote",
  "slash.code": "Code block",
  "slash.divider": "Divider",
  "slash.callout": "Callout",
  "placeholder.empty": "Type '/' for commands",
  "link.enterUrl": "Enter a URL",
  "link.apply": "Apply",
  "upload.dropOrClick": "Drop an image or click to upload",
  "upload.uploading": "Uploading…",
  "upload.failed": "Upload failed",
  "a11y.blockMenu": "Block options",
  "a11y.dragHandle": "Drag to move block",
  "a11y.slashCommands": "Slash commands",
  "slash.results": "{{count}} results",
  "slash.noMatches": "No matches",
  "group.advanced": "Advanced",
  "group.headings": "Headings",
  "group.data": "Data",
  "custom.callout.title": "Callout",
  "custom.callout.subtext": "Highlight a tip, note or warning",
  "custom.math.title": "Math Equation",
  "custom.math.subtext": "Create an equation with the visual math editor",
  "custom.bookmark.title": "Web bookmark",
  "custom.bookmark.subtext": "Embed a link preview card",
  "custom.columns2.title": "2 columns",
  "custom.columns2.subtext": "Create a 2-column layout",
  "custom.columns3.title": "3 columns",
  "custom.columns3.subtext": "Create a 3-column layout",
  "custom.toc.title": "Table of contents",
  "custom.toc.subtext": "Generate an outline from headings",
  "custom.breadcrumb.title": "Breadcrumb",
  "custom.breadcrumb.subtext": "Show the current page hierarchy",
  "custom.syncedBlock.title": "Synced block",
  "custom.syncedBlock.subtext": "Keep content synchronized across pages",
  "custom.templateButton.title": "Template button",
  "custom.templateButton.subtext": "Create a reusable duplication button",
  "custom.toggleHeading1.title": "Toggle heading 1",
  "custom.toggleHeading1.subtext": "Create a collapsible H1 section",
  "custom.toggleHeading2.title": "Toggle heading 2",
  "custom.toggleHeading2.subtext": "Create a collapsible H2 section",
  "custom.toggleHeading3.title": "Toggle heading 3",
  "custom.toggleHeading3.subtext": "Create a collapsible H3 section",
  "custom.tableView.title": "Table view",
  "custom.tableView.subtext": "Insert an inline database table",
  "custom.boardView.title": "Board view",
  "custom.boardView.subtext": "Insert an inline Kanban board",
  "custom.listView.title": "List view",
  "custom.listView.subtext": "Insert an inline database list",
  "custom.galleryView.title": "Gallery view",
  "custom.galleryView.subtext": "Insert an inline database gallery",
  "custom.calendarView.title": "Calendar view",
  "custom.calendarView.subtext": "Insert an inline database calendar",
  "custom.timelineView.title": "Timeline view",
  "custom.timelineView.subtext": "Insert an inline database timeline",
  "custom.mapView.title": "Map view",
  "custom.mapView.subtext": "Insert an inline database map",
  "callout.changeStyle": "Change callout style",
  "bookmark.add": "Add a web bookmark",
  "bookmark.pasteLink": "Paste a link here…",
  "bookmark.linkPreview": "Link preview",
  "bookmark.noDescription": "No description available",
  "toc.title": "Table of contents",
  "toc.noHeadings": "No headings",
  "toc.untitledHeading": "Untitled heading",
  "toc.a11y": "Table of contents",
  "breadcrumb.unavailable": "Breadcrumb unavailable",
  "syncedBlock.title": "Synced block",
  "templateButton.defaultLabel": "Template button",
  "database.defaultTitle": "Database",
  "database.reference": "Database reference",
  "math.category.structures": "Structures",
  "math.category.operators": "Operators",
  "math.category.relations": "Relations",
  "math.category.greek": "Greek",
  "math.editor": "Visual equation editor",
  "math.field": "Type directly in the equation",
  "math.empty": "\\text{Type an equation}",
  "math.hint":
    "Click a blank slot to type. Use Tab or the arrow keys to move between slots.",
  "math.invalid": "This equation still has an incomplete part.",
  "math.item.fraction": "Fraction",
  "math.item.superscript": "Superscript",
  "math.item.subscript": "Subscript",
  "math.item.square-root": "Square root",
  "math.item.nth-root": "Nth root",
  "math.item.parentheses": "Scalable parentheses",
  "math.item.absolute": "Absolute value",
  "math.item.binomial": "Binomial coefficient",
  "math.item.vector": "Vector",
  "math.item.overline": "Overline",
  "math.item.matrix-2": "2 by 2 matrix",
  "math.item.cases": "Piecewise cases",
  "math.item.sum": "Summation with limits",
  "math.item.product": "Product with limits",
  "math.item.integral": "Integral with limits",
  "math.item.double-integral": "Double integral",
  "math.item.limit": "Limit",
  "math.item.partial": "Partial derivative symbol",
  "math.item.nabla": "Nabla symbol",
  "math.item.infinity": "Infinity",
  "math.item.plus-minus": "Plus or minus",
  "math.item.times": "Multiplication",
  "math.item.divide": "Division",
  "math.item.dot": "Dot product",
  "math.item.not-equal": "Not equal",
  "math.item.approximately": "Approximately equal",
  "math.item.less-equal": "Less than or equal",
  "math.item.greater-equal": "Greater than or equal",
  "math.item.element": "Element of",
  "math.item.not-element": "Not an element of",
  "math.item.subset": "Subset",
  "math.item.union": "Union",
  "math.item.intersection": "Intersection",
  "math.item.left-arrow": "Left arrow",
  "math.item.right-arrow": "Right arrow",
  "math.item.equivalent": "Equivalent",
  "math.item.alpha": "Alpha",
  "math.item.beta": "Beta",
  "math.item.gamma": "Gamma",
  "math.item.delta": "Delta",
  "math.item.theta": "Theta",
  "math.item.lambda": "Lambda",
  "math.item.mu": "Mu",
  "math.item.pi": "Pi",
  "math.item.rho": "Rho",
  "math.item.sigma": "Sigma",
  "math.item.phi": "Phi",
  "math.item.omega": "Omega",
} as const;

export type EditorMessageKey = keyof typeof EN_EDITOR_MESSAGES;
export type EditorDictionary = Record<EditorMessageKey, string>;
export type EditorMessageOverrides = Partial<EditorDictionary>;
export type EditorLocale = string;

export interface CreateI18nOptions {
  locale?: EditorLocale;
  messages?: EditorMessageOverrides;
}

export interface I18n {
  locale: EditorLocale;
  messages: Readonly<EditorDictionary>;
  t(key: EditorMessageKey, params?: Record<string, string | number>): string;
}

export function defineEditorMessages(
  overrides: EditorMessageOverrides = {}
): EditorDictionary {
  return { ...EN_EDITOR_MESSAGES, ...overrides };
}

/**
 * Create an editor translator. Passing a locale string remains supported for
 * compatibility; since English is the sole bundled locale, other languages
 * should also provide `messages`.
 */
export function createI18n(
  options: EditorLocale | CreateI18nOptions = DEFAULT_EDITOR_LOCALE
): I18n {
  const normalized =
    typeof options === "string" ? { locale: options } : options;
  const locale = normalized.locale ?? DEFAULT_EDITOR_LOCALE;
  const messages = defineEditorMessages(normalized.messages);

  return {
    locale,
    messages,
    t: (key, params = {}) =>
      Object.entries(params).reduce(
        (message, [name, value]) =>
          message.replaceAll(`{{${name}}}`, String(value)),
        messages[key]
      ),
  };
}
