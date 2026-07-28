/**
 * <DisNoteEditor> — the public editor facade.
 *
 * Requires BlockNote (@blocknote/core, @blocknote/react) and a BlockNote UI
 * package (@blocknote/mantine) plus React as peer dependencies. It is built
 * separately from the pure adapter (see tsconfig.react.json) so a read-only
 * consumer never needs the editor bundle.
 *
 * The facade deliberately does NOT expose the BlockNote editor object from its
 * stable surface. Advanced integrations can reach it through the guarded
 * `ExperimentalEditorAccess` escape hatch, which carries no stability guarantee.
 */
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type ReactElement,
  type Ref,
} from "react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import type { DisNoteBlock, DisNoteDocument } from "../../core/index.js";
import { createBlockNoteAdapter, type BlockNoteEditorDocument } from "../adapter/adapter.js";
import { disNoteBlockNoteSchema } from "./schema.js";
import { importClipboard } from "../../import-export/index.js";

export interface DocumentCapabilities {
  canRead: boolean;
  canEdit: boolean;
  canComment: boolean;
  canPublish: boolean;
  canManage: boolean;
}

export interface DisNoteEditorHandle {
  focus(): void;
  getDocument(): DisNoteDocument;
  insertBlock(block: DisNoteBlock): void;
  setEditable(editable: boolean): void;
  /**
   * Vendor-specific access for integrations that cannot use the stable facade.
   * This API intentionally carries no compatibility guarantee.
   */
  getExperimentalAccess(): ExperimentalEditorAccess;
}

export interface ExperimentalEditorAccess {
  readonly vendor: "blocknote";
  getVendorEditor(): unknown;
}

export interface DisNoteEditorProps {
  initialDocument: DisNoteDocument;
  editable?: boolean;
  /** Visual theme for the editing surface. */
  theme?: "light" | "dark";
  onDocumentChange?: (document: DisNoteDocument) => void;
  className?: string;
}

/** Default slash menu items plus DisNote's custom blocks. */
function disNoteSlashItems(editor: {
  updateBlock: unknown;
}): DefaultReactSuggestionItem[] {
  const ed = editor as never;
  const customItems: DefaultReactSuggestionItem[] = [
    {
      title: "Callout",
      subtext: "Highlight a tip, note or warning",
      aliases: ["callout", "note", "info", "tip", "warning"],
      group: "Advanced",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 7 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/>
            <path d="M9 18h6"/>
            <path d="M10 22h4"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "callout", props: { intent: "info" } } as never);
      },
    },
    {
      title: "Math Equation",
      subtext: "Render a LaTeX mathematical equation",
      aliases: ["math", "latex", "equation", "formula"],
      group: "Advanced",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 4H5l7 8-7 8h14"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "math", props: { code: "" } } as never);
      },
    },
    {
      title: "Web Bookmark",
      subtext: "Embed a link preview card",
      aliases: ["bookmark", "link", "card"],
      group: "Advanced",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "bookmark", props: { url: "" } } as never);
      },
    },
    {
      title: "2 Columns",
      subtext: "Create a 2-column layout",
      aliases: ["columns", "cols", "2cols", "layout"],
      group: "Advanced",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M12 3v18"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, {
          type: "columnList",
          children: [
            { type: "column", children: [{ type: "paragraph" }] },
            { type: "column", children: [{ type: "paragraph" }] }
          ]
        } as never);
      },
    },
    {
      title: "3 Columns",
      subtext: "Create a 3-column layout",
      aliases: ["3cols", "3columns", "three", "triple"],
      group: "Advanced",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M9 3v18"/>
            <path d="M15 3v18"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, {
          type: "columnList",
          children: [
            { type: "column", children: [{ type: "paragraph" }] },
            { type: "column", children: [{ type: "paragraph" }] },
            { type: "column", children: [{ type: "paragraph" }] }
          ]
        } as never);
      },
    },
    {
      title: "Table of Contents",
      subtext: "Generate outline from headings",
      aliases: ["toc", "index", "outline"],
      group: "Advanced",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" x2="3" y1="6" y2="6"/>
            <line x1="21" x2="9" y1="12" y2="12"/>
            <line x1="21" x2="7" y1="18" y2="18"/>
            <path d="M3 12h3"/>
            <path d="M3 18h1"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "tableOfContents", props: {} } as never);
      },
    },
    {
      title: "Breadcrumb",
      subtext: "Show current page hierarchy path",
      aliases: ["breadcrumb", "path", "navigation"],
      group: "Advanced",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 17 5-5-5-5"/>
            <path d="m13 17 5-5-5-5"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "breadcrumb", props: {} } as never);
      },
    },
    {
      title: "Synced Block",
      subtext: "Keep contents synced across pages",
      aliases: ["synced", "sync", "reuse"],
      group: "Advanced",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            <path d="M3 21v-5h5"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "syncedBlock", props: { syncedBlockId: "" } } as never);
      },
    },
    {
      title: "Template Button",
      subtext: "Duplicator button template creator",
      aliases: ["template", "button", "duplicate"],
      group: "Advanced",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 12h8"/>
            <path d="M12 8v8"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "templateButton", props: { label: "Template Button" } } as never);
      },
    },
    {
      title: "Toggle Heading 1",
      subtext: "Toggle section with H1 size",
      aliases: ["toggle h1", "h1 toggle"],
      group: "Headings",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "toggleHeading1", props: {} } as never);
      },
    },
    {
      title: "Toggle Heading 2",
      subtext: "Toggle section with H2 size",
      aliases: ["toggle h2", "h2 toggle"],
      group: "Headings",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "toggleHeading2", props: {} } as never);
      },
    },
    {
      title: "Toggle Heading 3",
      subtext: "Toggle section with H3 size",
      aliases: ["toggle h3", "h3 toggle"],
      group: "Headings",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "toggleHeading3", props: {} } as never);
      },
    },
    {
      title: "Table View",
      subtext: "Insert an inline database table view",
      aliases: ["table db", "database table"],
      group: "Data",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3h18v18H3z"/>
            <path d="M21 9H3"/>
            <path d="M21 15H3"/>
            <path d="M12 3v18"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "tableDb", props: { title: "Table View" } } as never);
      },
    },
    {
      title: "Board View",
      subtext: "Insert an inline kanban board view",
      aliases: ["board", "kanban", "board db"],
      group: "Data",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M12 3v18"/>
            <path d="M8 3v18"/>
            <path d="M16 3v18"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "board", props: { title: "Board View" } } as never);
      },
    },
    {
      title: "List View",
      subtext: "Insert an inline list database view",
      aliases: ["list db", "database list"],
      group: "Data",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" x2="21" y1="6" y2="6"/>
            <line x1="8" x2="21" y1="12" y2="12"/>
            <line x1="8" x2="21" y1="18" y2="18"/>
            <line x1="3" x2="3.01" y1="6" y2="6"/>
            <line x1="3" x2="3.01" y1="12" y2="12"/>
            <line x1="3" x2="3.01" y1="18" y2="18"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "listDb", props: { title: "List View" } } as never);
      },
    },
    {
      title: "Gallery View",
      subtext: "Insert a gallery database view",
      aliases: ["gallery", "portfolio", "cards"],
      group: "Data",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1"/>
            <rect width="7" height="5" x="14" y="3" rx="1"/>
            <rect width="7" height="9" x="14" y="12" rx="1"/>
            <rect width="7" height="5" x="3" y="16" rx="1"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "gallery", props: { title: "Gallery View" } } as never);
      },
    },
    {
      title: "Calendar View",
      subtext: "Insert a calendar database view",
      aliases: ["calendar", "dates", "schedule"],
      group: "Data",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "calendar", props: { title: "Calendar View" } } as never);
      },
    },
    {
      title: "Timeline View",
      subtext: "Insert a timeline database view",
      aliases: ["timeline", "gantt", "roadmap"],
      group: "Data",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 22h14"/>
            <path d="M5 2h14"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "timeline", props: { title: "Timeline View" } } as never);
      },
    },
    {
      title: "Map View",
      subtext: "Insert a map database view",
      aliases: ["map", "location", "places"],
      group: "Data",
      icon: (
        <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6 9 3l6 3 6-3v15l-6 3-6-3-6 3V6z"/>
            <path d="M9 3v15"/>
            <path d="M15 6v15"/>
          </svg>
        </span>
      ),
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(ed, { type: "map", props: { title: "Map View" } } as never);
      },
    }
  ];
  return [...getDefaultReactSlashMenuItems(ed), ...customItems];
}

function DisNoteEditorImpl(props: DisNoteEditorProps, ref: Ref<DisNoteEditorHandle>): ReactElement {
  const adapter = useMemo(() => createBlockNoteAdapter(), []);
  const [editable, setEditable] = useState(props.editable ?? true);
  const envelopeRef = useRef<BlockNoteEditorDocument["envelope"]>(
    adapter.toEditor(props.initialDocument).envelope,
  );

  const editor = useCreateBlockNote({
    schema: disNoteBlockNoteSchema,
    initialContent: adapter.toEditor(props.initialDocument).blocks as never,
  });

  useEffect(() => {
    setEditable(props.editable ?? true);
  }, [props.editable]);

  const readCurrentDocument = (): DisNoteDocument =>
    adapter.fromEditor({
      blocks: editor.document as never,
      envelope: envelopeRef.current,
    });

  useImperativeHandle(ref, () => ({
    focus: () => editor.focus(),
    getDocument: readCurrentDocument,
    insertBlock: (block: DisNoteBlock) => {
      const [bn] = adapter.toEditor({ ...props.initialDocument, blocks: [block] }).blocks;
      if (!bn) return;
      const cursor = editor.getTextCursorPosition();
      const reference = cursor?.block ?? editor.document[editor.document.length - 1];
      if (reference) editor.insertBlocks([bn as never], reference as never, "after");
    },
    setEditable: (editable: boolean) => {
      editor.isEditable = editable;
      setEditable(editable);
    },
    getExperimentalAccess: () => ({
      vendor: "blocknote",
      getVendorEditor: () => editor,
    }),
  }));

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>): void => {
    const text = event.clipboardData.getData("text/plain");
    const html = event.clipboardData.getData("text/html");

    // 1. If paste target is an input field or a non-contenteditable area (like the Mantine URL popover input), do not intercept.
    const target = event.target as HTMLElement;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable === false)
    ) {
      if (target.tagName === "INPUT") {
        const placeholder = target.getAttribute("placeholder") || "";
        const ariaLabel = target.getAttribute("aria-label") || "";
        const isLinkInput =
          placeholder.toLowerCase().includes("url") ||
          placeholder.toLowerCase().includes("link") ||
          ariaLabel.toLowerCase().includes("url") ||
          ariaLabel.toLowerCase().includes("link");

        if (isLinkInput) {
          // Let the paste complete first, then trigger Enter to apply the link immediately
          setTimeout(() => {
            const enterDown = new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            });
            target.dispatchEvent(enterDown);
          }, 50);
        }
      }
      return;
    }

    // 2. If it is simple inline text (single line, no HTML block tags), let the editor handle it natively (e.g. pasting a URL to format a link).
    const isSingleLine = !text.includes("\n") && !text.includes("\r");
    const hasBlockHtml = html && /<(?:p|div|h[1-6]|ul|ol|li|blockquote|pre|table|hr|aside)\b/i.test(html);
    if (isSingleLine && !hasBlockHtml) {
      return;
    }

    const { document: clipboardDocument } = importClipboard({ text, html });

    if (clipboardDocument.blocks.length === 0) return;

    event.preventDefault();
    event.stopPropagation();

    const bnBlocks = adapter.toEditor({
      ...props.initialDocument,
      blocks: clipboardDocument.blocks,
    }).blocks;
    const cursor = editor.getTextCursorPosition();
    const reference = cursor?.block ?? editor.document[editor.document.length - 1];

    if (reference) {
      const currentBlock = editor.getBlock(reference.id);
      const isEmptyParagraph =
        currentBlock?.type === "paragraph" &&
        (!currentBlock.content || currentBlock.content.length === 0);

      if (currentBlock && isEmptyParagraph) {
        editor.replaceBlocks([currentBlock as never], bnBlocks as never);
      } else {
        editor.insertBlocks(bnBlocks as never, reference as never, "after");
      }
    } else if (editor.document[0]) {
      editor.insertBlocks(bnBlocks as never, editor.document[0] as never, "before");
    }
  };

  return (
    <div className={props.className ?? "disnote-editor"} onPasteCapture={handlePaste}>
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={props.theme ?? "light"}
        slashMenu={false}
        onChange={() => props.onDocumentChange?.(readCurrentDocument())}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => filterSuggestionItems(disNoteSlashItems(editor), query)}
        />
      </BlockNoteView>
    </div>
  );
}

export const DisNoteEditor = forwardRef(DisNoteEditorImpl);
