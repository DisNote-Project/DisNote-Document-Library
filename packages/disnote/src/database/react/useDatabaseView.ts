import { useCallback, useContext, useEffect, useRef, useState } from "react";
import type { DatabaseQuery, DatabaseQueryResult, DatabaseRecord } from "../model.js";
import { DatabaseViewContext, type DatabaseViewProvider } from "./context.js";
export function useDatabaseView(id: string, query: DatabaseQuery, supplied?: DatabaseViewProvider) {
  const context = useContext(DatabaseViewContext), provider = supplied ?? context;
  const [snapshot, setSnapshot] = useState<{ id: string; provider: DatabaseViewProvider; data: DatabaseQueryResult } | null>(null), [loading, setLoading] = useState(false), [failed, setFailed] = useState(false);
  const data = snapshot?.id === id && snapshot.provider === provider ? snapshot.data : null;
  const generation = useRef(0), active = useRef(true);
  const controller = useRef<AbortController | null>(null), inFlight = useRef(false), queued = useRef(false), reloadLatest = useRef<() => Promise<void>>(async () => undefined);
  const queryKey = JSON.stringify(query);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    controller.current?.abort();
    if (!provider || !id) { setSnapshot(null); return; }
    const request = new AbortController(); controller.current = request; inFlight.current = true;
    setLoading(true); setFailed(false);
    try {
      const result = await provider.query(id, JSON.parse(queryKey), { signal: request.signal });
      if (active.current && generation.current === current) setSnapshot({ id, provider, data: result });
    } catch { if (active.current && generation.current === current && !request.signal.aborted) { setFailed(true); setSnapshot(null); } }
    finally { if (active.current && generation.current === current) {
      setLoading(false); inFlight.current = false;
      if (queued.current) { queued.current = false; void reloadLatest.current(); }
    } }
  }, [id, provider, queryKey]);
  reloadLatest.current = reload;
  useEffect(() => { active.current = true; queued.current = false; void reload(); return () => { active.current = false; generation.current++; controller.current?.abort(); inFlight.current = false; queued.current = false; }; }, [reload]);
  useEffect(() => provider?.subscribe?.(id, () => { if (inFlight.current) queued.current = true; else void reload(); }), [provider, id, reload]);
  const save = async (record: DatabaseRecord, revision?: number) => {
    if (!provider?.upsertRecord || !data) return;
    await provider.upsertRecord(id, record, revision ?? data.database.revision); await reload();
  };
  const remove = async (recordId: string) => {
    if (!provider?.deleteRecord || !data) return;
    await provider.deleteRecord(id, recordId, data.database.revision); await reload();
  };
  return { data, loading, failed, reload, save, remove, provider };
}
