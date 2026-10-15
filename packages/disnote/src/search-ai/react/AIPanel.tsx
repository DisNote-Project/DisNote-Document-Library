import { useEffect, useState, type ReactNode } from "react";
import type { DocumentAIPreview } from "../provider.js";
import { uiMessages } from "../../ui/messages.js";
export interface AIPanelProvider { preview(prompt: string, signal: AbortSignal): Promise<DocumentAIPreview>; confirm(preview: DocumentAIPreview): Promise<void> }
export function AIPanel({ provider, renderPreview, locale = "en" }: { provider: AIPanelProvider; renderPreview: (preview: DocumentAIPreview) => ReactNode; locale?: string }): ReactNode {
  const m = uiMessages(locale), [prompt, setPrompt] = useState(""), [preview, setPreview] = useState<DocumentAIPreview | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(false), [request, setRequest] = useState<AbortController | null>(null);
  useEffect(() => () => request?.abort(), [request]);
  const generate = async () => {
    request?.abort(); const controller = new AbortController(); setRequest(controller); setBusy(true); setError(false); setPreview(null);
    try { const next = await provider.preview(prompt, controller.signal); if (!controller.signal.aborted) setPreview(next); }
    catch { if (!controller.signal.aborted) setError(true); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const confirm = async () => { if (!preview) return; setBusy(true); setError(false); try { await provider.confirm(preview); setPreview(null); } catch { setError(true); } finally { setBusy(false); } };
  return <section aria-label={m.aiPreview}><form onSubmit={e => { e.preventDefault(); void generate(); }}><textarea aria-label={m.aiPrompt} value={prompt} onChange={e => setPrompt(e.target.value)} /><button type="submit" disabled={busy || !prompt.trim()}>{m.aiGenerate}</button></form>
    {error && <p role="alert">{m.failed}</p>}{preview && <div>{renderPreview(preview)}<button type="button" disabled={busy} onClick={() => void confirm()}>{m.aiApply}</button><button type="button" disabled={busy} onClick={() => setPreview(null)}>{m.cancel}</button></div>}
  </section>;
}
