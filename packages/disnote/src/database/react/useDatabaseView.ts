import { useCallback, useContext, useEffect, useRef, useState } from "react";
import type { DatabaseQuery, DatabaseQueryResult, DatabaseRecord } from "../model.js";
import { DatabaseViewContext, type DatabaseViewProvider } from "./context.js";
export function useDatabaseView(id: string, query: DatabaseQuery, supplied?: DatabaseViewProvider) {
  const context = useContext(DatabaseViewContext), provider = supplied ?? context;
  const [data, setData] = useState<DatabaseQueryResult | null>(null), [loading, setLoading] = useState(false), [failed, setFailed] = useState(false);
  const generation = useRef(0), active = useRef(true);
  const queryKey = JSON.stringify(query);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    if (!provider || !id) { setData(null); return; }
    setLoading(true); setFailed(false);
    try {
      const result = await provider.query(id, JSON.parse(queryKey));
      if (active.current && generation.current === current) setData(result);
    } catch { if (active.current && generation.current === current) { setFailed(true); setData(null); } }
    finally { if (active.current && generation.current === current) setLoading(false); }
  }, [id, provider, queryKey]);
  useEffect(() => { active.current = true; void reload(); return () => { active.current = false; generation.current++; }; }, [reload]);
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
