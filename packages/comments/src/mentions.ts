import type { MentionCandidate, MentionContext, MentionProvider, ResolvedMention } from "./model.js";

export interface DirectoryEntry {
  entityType: "user" | "channel";
  entityId: string;
  label: string;
  href?: string;
}

/**
 * A trivial in-memory MentionProvider for tests/demos. Core never calls a User
 * Service — consumers supply a provider like this.
 */
export class InMemoryMentionProvider implements MentionProvider {
  constructor(private readonly directory: DirectoryEntry[]) {}

  async search(query: string, _context: MentionContext): Promise<MentionCandidate[]> {
    const q = query.toLowerCase();
    return this.directory
      .filter((e) => e.label.toLowerCase().includes(q))
      .map(({ entityType, entityId, label }) => ({ entityType, entityId, label }));
  }

  async resolve(entityType: string, entityId: string): Promise<ResolvedMention | null> {
    const found = this.directory.find((e) => e.entityType === entityType && e.entityId === entityId);
    if (!found) return null;
    const resolved: ResolvedMention = { entityType: found.entityType, entityId: found.entityId, label: found.label };
    if (found.href) resolved.href = found.href;
    return resolved;
  }
}
