import { useCallback, useEffect, useRef, useState } from "react";
import type { DatabaseAutomationProvider, DatabaseAutomationRule, DatabaseAutomationSummary } from "../automation/model.js";
import { DATABASE_AUTOMATION_POLL_MS } from "./database-ui.constants.js";
export function useDatabaseAutomations(id: string, provider: DatabaseAutomationProvider, onChanged: () => Promise<void>) {
  const [state, setState] = useState<(DatabaseAutomationSummary & { targets?: { id: string; label: string }[] }) | null>(null), [draft, setDraft] = useState<DatabaseAutomationRule[]>([]), [base, setBase] = useState(0), [failed, setFailed] = useState(false), [busy, setBusy] = useState(false);
  const active = useRef(true), baseline = useRef(""), lastRevision = useRef(0), generation = useRef(0);
  const inFlight = useRef<number | null>(null);
  const changed = useRef(onChanged); changed.current = onChanged;
  const load = useCallback(async (reset = false) => {
    // Background polling must not supersede a slow successful read. Explicit
    // reloads still replace obsolete reads after a save or configuration change.
    if (!reset && inFlight.current !== null) return;
    const request = ++generation.current;
    inFlight.current = request;
    try {
      const next = await provider.read(id); if (!active.current || request !== generation.current) return;
      setState(next); const hash = JSON.stringify(next.rules);
      if (reset) { baseline.current = hash; setDraft(next.rules); setBase(next.revision); setFailed(false); }
      else if (baseline.current === hash) setBase(next.revision);
      else setFailed(true);
      if (lastRevision.current !== next.revision) { lastRevision.current = next.revision; await changed.current(); }
    } catch { if (active.current && request === generation.current) { setFailed(true); setState(null); } }
    finally { if (inFlight.current === request) inFlight.current = null; }
  }, [id, provider]);
  useEffect(() => { active.current = true; setState(null); lastRevision.current = 0; void load(true); const timer = setInterval(() => void load(), DATABASE_AUTOMATION_POLL_MS); return () => { active.current = false; generation.current++; inFlight.current = null; clearInterval(timer); }; }, [load]);
  const run = async (operation: () => Promise<void>, reset: boolean) => { setBusy(true); setFailed(false); try { await operation(); await load(reset); } catch { if (active.current) setFailed(true); } finally { if (active.current) setBusy(false); } };
  return { state, draft, setDraft, failed, busy, reload: () => load(true), save: () => run(() => provider.configure(id, draft, base), true), retry: (job: string) => run(() => provider.retry(id, job, state!.revision), false) };
}
