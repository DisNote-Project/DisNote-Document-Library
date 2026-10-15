import { createContext, useContext, useState, type ReactNode } from "react";
import { uiMessages } from "../../ui/messages.js";
export interface DocumentActionProvider { canExecute(id: string): boolean; execute(id: string, idempotencyKey: string): Promise<void> }
export const DocumentActionContext = createContext<DocumentActionProvider | null>(null);
export function ActionProvider({ provider, children }: { provider: DocumentActionProvider; children: ReactNode }): ReactNode { return <DocumentActionContext.Provider value={provider}>{children}</DocumentActionContext.Provider>; }
export function ActionButton({ actionId, label, locale = "en" }: { actionId: string; label: string; locale?: string }): ReactNode {
  const provider = useContext(DocumentActionContext), [busy, setBusy] = useState(false), [error, setError] = useState(false), [key, setKey] = useState<string | null>(null), m = uiMessages(locale);
  const execute = async () => {
    if (!provider?.canExecute(actionId)) return;
    const token = key ?? crypto.randomUUID(); setKey(token); setBusy(true); setError(false);
    try { await provider.execute(actionId, token); setKey(null); } catch { setError(true); } finally { setBusy(false); }
  };
  return <span><button type="button" disabled={busy || !provider?.canExecute(actionId)} onClick={() => void execute()}>{label}</button>{error && <span role="alert">{m.failed}</span>}</span>;
}
