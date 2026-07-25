/** Comments are stored OUTSIDE document content (guideline section 22.1). */

export type CommentAnchor =
  | { type: "document" }
  | { type: "block"; blockId: string }
  | { type: "inline-range"; blockId: string; start: number; end: number };

export interface CommentEntry {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface CommentThread {
  id: string;
  documentId: string;
  revisionBase: number;
  anchor: CommentAnchor;
  status: "open" | "resolved";
  orphaned: boolean;
  comments: CommentEntry[];
}

/* --------------------- mentions & connected references -------------------- */

export interface MentionCandidate {
  entityType: "user" | "channel";
  entityId: string;
  label: string;
}

export interface ResolvedMention {
  entityType: "user" | "channel";
  entityId: string;
  label: string;
  href?: string;
}

export interface MentionContext {
  documentId?: string;
  actorId?: string;
}

export interface MentionProvider {
  search(query: string, context: MentionContext): Promise<MentionCandidate[]>;
  resolve(entityType: string, entityId: string): Promise<ResolvedMention | null>;
}

export interface DocumentReference {
  targetType: "message" | "task" | "file" | "meeting" | "slide" | "sticky";
  targetId: string;
  label: string;
  snapshot?: { title?: string; preview?: string };
}
