import { checksum, validateDocument, type BlockRegistry, type DisNoteDocument } from "../core/index.js";
import { applyOperations, previewDiff, validateOperations, type AIDocumentOperation, type DiffEntry } from "./ai-operations.js";
export const AI_ERRORS = { DENIED: "ai-document-access-denied", INVALID: "invalid-ai-operations", STALE: "ai-preview-stale", PROMPT: "invalid-ai-prompt" } as const;
export interface DocumentAIProvider {
  generate(input: { prompt: string; document: DisNoteDocument; context: DisNoteDocument[]; signal?: AbortSignal }): Promise<AIDocumentOperation[]>;
}
export interface DocumentAIPolicy { assert(actor: string, documentId: string, action: "read" | "edit"): Promise<void> }
export interface DocumentAIPreview { baseChecksum: string; operations: AIDocumentOperation[]; diff: DiffEntry[]; document: DisNoteDocument }
export class DocumentAIService {
  constructor(private readonly provider: DocumentAIProvider, private readonly policy: DocumentAIPolicy, private readonly registry: BlockRegistry) {}
  async preview(actor: string, document: DisNoteDocument, prompt: string, context: DisNoteDocument[] = [], signal?: AbortSignal): Promise<DocumentAIPreview> {
    if (!prompt.trim() || prompt.length > 10000 || context.length > 20) throw new Error(AI_ERRORS.PROMPT);
    await this.policy.assert(actor, document.id, "edit");
    for (const related of context) await this.policy.assert(actor, related.id, "read");
    const operations = await this.provider.generate({ prompt, document: structuredClone(document), context: structuredClone(context), ...(signal ? { signal } : {}) });
    const next = this.apply(document, operations);
    return { baseChecksum: checksum(document), operations, diff: previewDiff(document, next), document: next };
  }
  async confirm(actor: string, current: DisNoteDocument, preview: DocumentAIPreview): Promise<DisNoteDocument> {
    await this.policy.assert(actor, current.id, "edit");
    if (checksum(current) !== preview.baseChecksum) throw new Error(AI_ERRORS.STALE);
    return this.apply(current, preview.operations);
  }
  private apply(document: DisNoteDocument, operations: AIDocumentOperation[]): DisNoteDocument {
    if (!Array.isArray(operations) || operations.length > 1000 || validateOperations(document, operations).length) throw new Error(AI_ERRORS.INVALID);
    const result = applyOperations(document, operations);
    if (!result.ok || !validateDocument(result.document, { registry: this.registry, strictUnknownBlocks: true }).ok) throw new Error(AI_ERRORS.INVALID);
    return result.document;
  }
}
