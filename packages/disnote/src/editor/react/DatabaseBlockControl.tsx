import { useContext, useEffect, useState, type ReactNode } from "react";
import { DatabaseView, type DatabaseViewKind } from "../../database/react/DatabaseView.js";
import { DatabaseViewContext } from "../../database/react/context.js";
import { uiMessages } from "../../ui/messages.js";
export function DatabaseBlockControl({ databaseId, view, locale, editable, onSelect }: { databaseId: string; view: DatabaseViewKind; locale: string; editable: boolean; onSelect: (id: string) => void }): ReactNode {
  const provider = useContext(DatabaseViewContext), m = uiMessages(locale), [id, setId] = useState(databaseId);
  useEffect(() => setId(databaseId), [databaseId]);
  return <section>{provider && databaseId && <DatabaseView databaseId={databaseId} view={view} locale={locale} readonly={!editable} />}
    {!provider && <p>{m.unavailable}</p>}
    {editable && <form onSubmit={event => { event.preventDefault(); onSelect(id.trim()); }}><input aria-label={m.database} value={id} onChange={event => setId(event.target.value)} /><button type="submit" disabled={!id.trim()}>{m.save}</button></form>}
  </section>;
}
