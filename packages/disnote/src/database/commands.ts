import { DATABASE_ERRORS, type DatabaseCommand, type DatabaseSnapshot } from "./model.js";
import { reconcileDatabaseView } from "./views.js";
/** Draft transformations only. The service authorizes each command and commits once. */
export function applyDatabaseCommand(database: DatabaseSnapshot, command: DatabaseCommand): void {
  switch (command.kind) {
    case "patch": {
      const record = database.records.find(item => item.id === command.recordId);
      if (!record) throw new Error(DATABASE_ERRORS.MISSING);
      record.values = { ...record.values, ...structuredClone(command.values) }; return;
    }
    case "delete":
      database.records = database.records.filter(item => item.id !== command.recordId);
      for (const record of database.records) { if (record.parentId === command.recordId) delete record.parentId; if (record.dependencies) record.dependencies = record.dependencies.filter(id => id !== command.recordId); }
      return;
    case "task": {
      const record = database.records.find(item => item.id === command.recordId);
      if (!record || (command.addDependencies !== undefined && !Array.isArray(command.addDependencies)) || (command.removeDependencies !== undefined && !Array.isArray(command.removeDependencies))) throw new Error(DATABASE_ERRORS.INVALID);
      if (command.parentId !== undefined) { if (command.parentId === null) delete record.parentId; else record.parentId = command.parentId; }
      if (command.addDependencies || command.removeDependencies) record.dependencies = [...new Set([...(record.dependencies ?? []).filter(id => !command.removeDependencies?.includes(id)), ...(command.addDependencies ?? [])])];
      return;
    }
    case "schedule": if (command.schedule === null) delete database.taskSchedule; else database.taskSchedule = structuredClone(command.schedule); return;
    case "move": {
      const at = database.records.findIndex(item => item.id === command.recordId);
      if (at < 0 || command.beforeId === command.recordId) return;
      const [record] = database.records.splice(at, 1);
      const before = command.beforeId === null ? database.records.length : database.records.findIndex(item => item.id === command.beforeId);
      if (before < 0) throw new Error(DATABASE_ERRORS.MISSING);
      database.records.splice(before, 0, record!); return;
    }
    case "properties": {
      database.properties = structuredClone(command.properties);
      const ids = new Set(database.properties.map(property => property.id));
      for (const record of database.records) record.values = Object.fromEntries(Object.entries(record.values).filter(([id]) => ids.has(id)));
      if (database.views) database.views = database.views.map(view => reconcileDatabaseView(view, database.properties));
      if (database.taskSchedule && (!ids.has(database.taskSchedule.startPropertyId) || (database.taskSchedule.endPropertyId && !ids.has(database.taskSchedule.endPropertyId)))) delete database.taskSchedule;
      return;
    }
    case "view": database.views = [...(database.views ?? []).filter(view => view.id !== command.view.id), structuredClone(command.view)]; return;
    case "deleteView": database.views = database.views?.filter(view => view.id !== command.viewId); return;
    default: throw new Error(DATABASE_ERRORS.INVALID);
  }
}
