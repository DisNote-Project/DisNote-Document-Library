import type { MentionContext, MentionProvider } from "../../comments/index.js";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
export async function mentionSuggestions(provider: MentionProvider, query: string, context: MentionContext, insert: (candidate: { entityType: string; entityId: string; label: string }) => void): Promise<DefaultReactSuggestionItem[]> {
  const candidates = await provider.search(query, context);
  return candidates.slice(0, 50).map(candidate => ({ title: candidate.label, onItemClick: () => insert(candidate) }));
}
