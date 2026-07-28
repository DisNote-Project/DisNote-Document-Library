import { LIBRARY_MESSAGES } from "../core/messages.js";
import type { DisNoteDocument } from "../core/index.js";
import { collectBlockIds } from "../core/index.js";
import type { CommentAnchor, CommentEntry, CommentThread } from "./model.js";

export interface CreateThreadInput {
  documentId: string;
  revisionBase: number;
  anchor: CommentAnchor;
  author: string;
  body: string;
}

export interface CommentStoreOptions {
  now?: () => string;
  generateId?: () => string;
}

/** In-memory reference comment store. Threads survive block deletion as orphans. */
export class InMemoryCommentStore {
  private readonly threads = new Map<string, CommentThread>();
  private readonly now: () => string;
  private seq = 0;
  private readonly genId: () => string;

  constructor(options: CommentStoreOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.genId = options.generateId ?? (() => `cmt_${this.seq++}`);
  }

  createThread(input: CreateThreadInput): CommentThread {
    const ts = this.now();
    const thread: CommentThread = {
      id: this.genId(),
      documentId: input.documentId,
      revisionBase: input.revisionBase,
      anchor: clone(input.anchor),
      status: "open",
      orphaned: false,
      comments: [
        {
          id: this.genId(),
          author: input.author,
          body: input.body,
          createdAt: ts,
        },
      ],
    };
    this.threads.set(thread.id, thread);
    return clone(thread);
  }

  addComment(threadId: string, author: string, body: string): CommentEntry {
    const thread = this.require(threadId);
    const entry: CommentEntry = {
      id: this.genId(),
      author,
      body,
      createdAt: this.now(),
    };
    thread.comments.push(entry);
    return clone(entry);
  }

  setStatus(threadId: string, status: "open" | "resolved"): CommentThread {
    const thread = this.require(threadId);
    thread.status = status;
    return clone(thread);
  }

  listForDocument(documentId: string): CommentThread[] {
    return [...this.threads.values()]
      .filter((t) => t.documentId === documentId)
      .map(clone);
  }

  /**
   * Reconcile anchors against the current document: threads whose anchored
   * block no longer exists become orphaned but are never deleted.
   */
  reconcile(document: DisNoteDocument): void {
    const ids = new Set(collectBlockIds(document));
    for (const thread of this.threads.values()) {
      if (thread.documentId !== document.id) continue;
      if (
        thread.anchor.type === "block" ||
        thread.anchor.type === "inline-range"
      ) {
        thread.orphaned = !ids.has(thread.anchor.blockId);
      }
    }
  }

  private require(id: string): CommentThread {
    const t = this.threads.get(id);
    if (!t) throw new Error(LIBRARY_MESSAGES.commentThreadNotFound(id));
    return t;
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
