import { useContext, useEffect, useState, type ReactNode } from "react";
import type { DatabaseViewKind } from "../../database/react/DatabaseView.js";
import { DatabaseLinkedView } from "../../database/react/DatabaseLinkedView.js";
import { useDatabaseView } from "../../database/react/useDatabaseView.js";
import { DatabaseViewContext } from "../../database/react/context.js";
import { uiMessages } from "../../ui/messages.js";
export function DatabaseBlockControl({ databaseId, viewId = "", view, locale, editable, onSelect }: { databaseId: string; viewId?: string; view: DatabaseViewKind; locale: string; editable: boolean; onSelect: (id: string, viewId?: string) => void }): ReactNode {
  const provider = useContext(DatabaseViewContext), m = uiMessages(locale), [id, setId] = useState(databaseId);
  useEffect(() => setId(databaseId), [databaseId]);
  const [selected, setSelected] = useState(viewId), metadata = useDatabaseView(databaseId, { limit: 1 }, provider ?? undefined);
  useEffect(() => setSelected(viewId), [viewId, databaseId]);
  return <section>{provider && databaseId && <DatabaseLinkedView databaseId={databaseId} viewId={viewId} fallback={view} locale={locale} readonly={!editable} />}
    {!provider && <p>{m.unavailable}</p>}
    {editable && <form onSubmit={event => { event.preventDefault(); onSelect(id.trim(), selected); }}><input aria-label={m.database} value={id} onChange={event => { setId(event.target.value); setSelected(""); }} /><select aria-label={m.viewName} value={selected} onChange={event => setSelected(event.target.value)}><option value="">{m.all}</option>{metadata.data?.database.views?.map(saved => <option key={saved.id} value={saved.id}>{saved.name}</option>)}</select><button type="submit" disabled={!id.trim()}>{m.save}</button></form>}
  </section>;
}
