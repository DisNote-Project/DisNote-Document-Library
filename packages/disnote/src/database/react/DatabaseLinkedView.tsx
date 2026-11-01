import { DatabaseView } from "./DatabaseView.js";
import type { DatabaseViewKind } from "../model.js";
import { useDatabaseView } from "./useDatabaseView.js";
import { useDatabaseMessages } from "./customization.js";
export function DatabaseLinkedView({ databaseId, viewId = "", fallback = "table", readonly = true, locale }: { databaseId: string; viewId?: string; fallback?: DatabaseViewKind; readonly?: boolean; locale?: string }) {
  const state = useDatabaseView(viewId ? databaseId : "", { limit: 1 }), m = useDatabaseMessages(locale);
  if (!viewId) return <DatabaseView databaseId={databaseId} view={fallback} readonly={readonly} locale={locale} />;
  if (!state.provider) return <p role="status">{m.unavailable}</p>;
  if (state.failed) return <p role="alert">{m.failed}</p>;
  if (!state.data) return <p role="status">{m.loading}</p>;
  const view = state.data.database.views?.find(item => item.id === viewId);
  if (!view) return <p role="status">{m.unavailable}</p>;
  return <DatabaseView databaseId={databaseId} view={view.kind} query={view.query} columns={view.columns} groupPropertyId={view.groupPropertyId} datePropertyId={view.datePropertyId} endDatePropertyId={view.endDatePropertyId} savedView={view} readonly={readonly} locale={locale} />;
}
