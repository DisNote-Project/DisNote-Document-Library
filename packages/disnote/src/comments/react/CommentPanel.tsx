import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { CommentAnchor } from "../model.js";
import type { CommentState } from "../service.js";
import { uiMessages } from "../../ui/messages.js";
export interface CommentPanelProvider {
  list(documentId: string): Promise<CommentState>;
  create(documentId: string, anchor: CommentAnchor, body: string, revisionBase: number, expectedRevision: number): Promise<void>;
  reply(documentId: string, threadId: string, body: string, expectedRevision: number): Promise<void>;
  status(documentId: string, threadId: string, status: "open" | "resolved", expectedRevision: number): Promise<void>;
}
export function CommentPanel({ documentId, revision, provider, anchor = { type: "document" }, locale = "en", canComment = true, canResolve = true }: { documentId: string; revision: number; provider: CommentPanelProvider; anchor?: CommentAnchor; locale?: string; canComment?: boolean; canResolve?: boolean }): ReactNode {
  const messages = uiMessages(locale);
  const [state, setState] = useState<CommentState | null>(null), [error, setError] = useState(false), [busy, setBusy] = useState(false), [drafts, setDrafts] = useState<Record<string, string>>({});
  const generation = useRef(0);
  const reload = useCallback(async (expected = generation.current) => { const next = await provider.list(documentId); if (generation.current === expected) setState(next); }, [provider, documentId]);
  useEffect(() => { const current = ++generation.current; setState(null); setDrafts({}); setError(false); setBusy(false); void provider.list(documentId).then(next => { if (generation.current === current) setState(next); }, () => { if (generation.current === current) setError(true); }); return () => { generation.current++; }; }, [provider, documentId]);
  const run = async (work: () => Promise<void>, draft?: string) => { const current = generation.current; setBusy(true); setError(false); try { await work(); await reload(current); if (draft && generation.current === current) setDrafts(value => ({ ...value, [draft]: "" })); } catch { if (generation.current === current) setError(true); } finally { if (generation.current === current) setBusy(false); } };
  return <aside aria-label={messages.comments}><h3>{messages.comments}</h3>{error && <p role="alert">{messages.failed}<button type="button" onClick={() => void run(() => reload())}>{messages.retry}</button></p>}
    {!state && !error && <p role="status">{messages.loading}</p>}
    {state?.threads.map(thread => <article key={thread.id}>
      {thread.orphaned && <p>{messages.orphaned}</p>}
      {thread.comments.map(comment => <div key={comment.id}><strong>{comment.author}</strong> <time dateTime={comment.createdAt}>{comment.createdAt}</time><p>{comment.body}</p></div>)}
      {canResolve && <button type="button" disabled={busy} onClick={() => void run(() => provider.status(documentId, thread.id, thread.status === "open" ? "resolved" : "open", state.revision))}>{thread.status === "open" ? messages.resolve : messages.reopen}</button>}
      {canComment && <form onSubmit={e => { e.preventDefault(); void run(() => provider.reply(documentId, thread.id, drafts[thread.id] ?? "", state.revision), thread.id); }}><textarea aria-label={messages.reply} value={drafts[thread.id] ?? ""} onChange={e => setDrafts({ ...drafts, [thread.id]: e.target.value })} /><button type="submit" disabled={busy || !drafts[thread.id]?.trim()}>{messages.reply}</button></form>}
    </article>)}
    {state && canComment && <form onSubmit={e => { e.preventDefault(); void run(() => provider.create(documentId, anchor, drafts[documentId] ?? "", revision, state.revision), documentId); }}><textarea aria-label={messages.addComment} value={drafts[documentId] ?? ""} onChange={e => setDrafts({ ...drafts, [documentId]: e.target.value })} /><button type="submit" disabled={busy || !drafts[documentId]?.trim()}>{messages.addComment}</button></form>}
  </aside>;
}
