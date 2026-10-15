import type { CommentAnchor, CommentThread } from "./model.js";
export const COMMENT_ERRORS = { DENIED: "comment-access-denied", MISSING: "comment-not-found", CONFLICT: "comment-revision-conflict", INVALID: "invalid-comment" } as const;
export interface CommentState {
  documentId: string;
  revision: number;
  threads: CommentThread[];
  /** Persist alongside threads. A host outbox dispatcher delivers/deduplicates by id. */
  events: { id: string; threadId: string; actor: string; kind: "created" | "replied" | "resolved" | "reopened" }[];
}
export interface CommentRepository {
  read(documentId: string): Promise<CommentState | null>;
  write(state: CommentState, expectedRevision: number | null): Promise<boolean>;
}
export interface CommentPolicy {
  assert(actor: string, documentId: string, action: "read" | "comment" | "resolve"): Promise<void>;
}
export class CommentService {
  constructor(private readonly repository: CommentRepository, private readonly policy: CommentPolicy, private readonly generateId: () => string = () => crypto.randomUUID(), private readonly now: () => string = () => new Date().toISOString()) {}
  async list(actor: string, documentId: string): Promise<CommentState> {
    await this.policy.assert(actor, documentId, "read");
    return await this.repository.read(documentId) ?? { documentId, revision: 0, threads: [], events: [] };
  }
  async create(actor: string, documentId: string, anchor: CommentAnchor, body: string, revisionBase: number, expectedRevision: number): Promise<CommentState> {
    return this.change(actor, documentId, "comment", expectedRevision, state => {
      this.validateBody(body);
      if (anchor.type === "inline-range" && (!Number.isInteger(anchor.start) || !Number.isInteger(anchor.end) || anchor.start < 0 || anchor.end <= anchor.start)) throw new Error(COMMENT_ERRORS.INVALID);
      if (!Number.isInteger(revisionBase) || revisionBase < 0) throw new Error(COMMENT_ERRORS.INVALID);
      const id = this.generateId();
      state.threads.push({ id, documentId, revisionBase, anchor: structuredClone(anchor), status: "open", orphaned: false, comments: [{ id: this.generateId(), author: actor, body, createdAt: this.now() }] });
      state.events.push({ id: this.generateId(), threadId: id, actor, kind: "created" });
    });
  }
  async reply(actor: string, documentId: string, threadId: string, body: string, expectedRevision: number): Promise<CommentState> {
    return this.change(actor, documentId, "comment", expectedRevision, state => {
      this.validateBody(body);
      this.thread(state, threadId).comments.push({ id: this.generateId(), author: actor, body, createdAt: this.now() });
      state.events.push({ id: this.generateId(), threadId, actor, kind: "replied" });
    });
  }
  async status(actor: string, documentId: string, threadId: string, status: "open" | "resolved", expectedRevision: number): Promise<CommentState> {
    return this.change(actor, documentId, "resolve", expectedRevision, state => {
      this.thread(state, threadId).status = status;
      state.events.push({ id: this.generateId(), threadId, actor, kind: status === "open" ? "reopened" : "resolved" });
    });
  }
  private async change(actor: string, documentId: string, action: "comment" | "resolve", expectedRevision: number, mutate: (state: CommentState) => void): Promise<CommentState> {
    await this.policy.assert(actor, documentId, action);
    const stored = await this.repository.read(documentId);
    const state = structuredClone(stored ?? { documentId, revision: 0, threads: [], events: [] });
    if (state.revision !== expectedRevision) throw new Error(COMMENT_ERRORS.CONFLICT);
    mutate(state); state.revision++;
    if (!await this.repository.write(state, stored ? expectedRevision : null)) throw new Error(COMMENT_ERRORS.CONFLICT);
    return state;
  }
  private thread(state: CommentState, id: string): CommentThread {
    const thread = state.threads.find(t => t.id === id); if (!thread) throw new Error(COMMENT_ERRORS.MISSING); return thread;
  }
  private validateBody(body: string): void { if (!body.trim() || body.length > 10000) throw new Error(COMMENT_ERRORS.INVALID); }
}
export class InMemoryCommentRepository implements CommentRepository {
  private readonly states = new Map<string, CommentState>();
  async read(id: string): Promise<CommentState | null> { return structuredClone(this.states.get(id) ?? null); }
  async write(state: CommentState, expectedRevision: number | null): Promise<boolean> {
    const current = this.states.get(state.documentId);
    if (expectedRevision === null ? !!current : current?.revision !== expectedRevision) return false;
    this.states.set(state.documentId, structuredClone(state)); return true;
  }
}
