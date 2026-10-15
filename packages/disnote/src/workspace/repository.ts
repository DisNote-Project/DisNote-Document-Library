import type { WorkspaceRepository, WorkspaceSnapshot } from "./model.js";
export class InMemoryWorkspaceRepository implements WorkspaceRepository {
  private readonly states = new Map<string, WorkspaceSnapshot>();
  async read(id: string): Promise<WorkspaceSnapshot | null> { return structuredClone(this.states.get(id) ?? null); }
  async write(snapshot: WorkspaceSnapshot, expectedRevision: number | null): Promise<boolean> {
    const current = this.states.get(snapshot.id);
    if (expectedRevision === null ? !!current : current?.revision !== expectedRevision) return false;
    this.states.set(snapshot.id, structuredClone(snapshot));
    return true;
  }
}
