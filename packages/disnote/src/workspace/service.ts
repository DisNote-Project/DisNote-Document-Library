import { createId, validateDocument, visitBlocks, type DisNoteBlock, type DisNoteDocument } from "../core/index.js";
import { WORKSPACE_BLOCKS, WORKSPACE_ERRORS, type WorkspaceAction, type WorkspaceDocumentPolicy, type WorkspacePage, type WorkspaceRepository, type WorkspaceSnapshot } from "./model.js";

export class WorkspaceDocumentService {
  constructor(private readonly repository: WorkspaceRepository, private readonly policy: WorkspaceDocumentPolicy) {}

  async create(actor: string, id: string): Promise<void> {
    await this.policy.assert(actor, id, "write");
    if (!await this.repository.write({ id, revision: 1, pages: [], sharedBlocks: [] }, null)) throw new Error(WORKSPACE_ERRORS.CONFLICT);
  }

  /** All button actions commit together; a failure leaves the original state intact. */
  async execute(actor: string, id: string, expectedRevision: number, actions: WorkspaceAction[]): Promise<number> {
    await this.policy.assert(actor, id, "write");
    const state = await this.load(actor, id);
    if (state.revision !== expectedRevision) throw new Error(WORKSPACE_ERRORS.CONFLICT);
    if (actions.length > 100) throw new Error(WORKSPACE_ERRORS.INVALID);
    for (const action of actions) {
      if (action.kind === "saveSharedBlock") {
        await this.requirePermission(actor, id, action.source.ownerPageId, "write");
        this.page(state, action.source.ownerPageId);
        const index = state.sharedBlocks.findIndex(s => s.id === action.source.id);
        const current = state.sharedBlocks[index];
        if (action.expectedRevision === null ? !!current : current?.revision !== action.expectedRevision) throw new Error(WORKSPACE_ERRORS.CONFLICT);
        if (current && current.ownerPageId !== action.source.ownerPageId) throw new Error(WORKSPACE_ERRORS.DENIED);
        const source = { ...structuredClone(action.source), revision: (current?.revision ?? 0) + 1 };
        if (!source.id || !validateDocument({ ...this.page(state, source.ownerPageId).document, blocks: source.blocks }).ok) throw new Error(WORKSPACE_ERRORS.INVALID);
        if (index < 0) state.sharedBlocks.push(source); else state.sharedBlocks[index] = source;
        continue;
      }
      const pageId = action.kind === "createPage" ? action.page.id : action.pageId;
      await this.requirePermission(actor, id, pageId, "write");
      if (action.kind === "createPage") {
        if (state.pages.some(p => p.id === pageId) || action.page.document.id !== pageId || !validateDocument(action.page.document).ok) throw new Error(WORKSPACE_ERRORS.INVALID);
        state.pages.push({ ...structuredClone(action.page), revision: 1, trashed: false });
        await this.move(actor, state, pageId, action.page.parentId);
        continue;
      }
      const page = this.page(state, pageId);
      switch (action.kind) {
        case "savePage":
          if (page.revision !== action.expectedRevision) throw new Error(WORKSPACE_ERRORS.CONFLICT);
          if (action.document.id !== pageId || !validateDocument(action.document).ok || page.trashed) throw new Error(WORKSPACE_ERRORS.INVALID);
          page.document = structuredClone(action.document); break;
        case "movePage": await this.move(actor, state, pageId, action.parentId); break;
        case "unsyncBlock": {
          let found = false;
          const replace = async (blocks: DisNoteBlock[], path: Set<string>): Promise<DisNoteBlock[]> => {
            const output: DisNoteBlock[] = [];
            for (const block of blocks) {
              if (block.id === action.blockId || (path.size > 0 && block.type === WORKSPACE_BLOCKS.SYNCED)) {
                const sourceId = block.props["syncedBlockId"];
                if (typeof sourceId !== "string" || !sourceId || path.has(sourceId) || path.size > 32) throw new Error(WORKSPACE_ERRORS.CYCLE);
                const source = state.sharedBlocks.find(s => s.id === sourceId);
                if (!source || this.page(state, source.ownerPageId).trashed) throw new Error(WORKSPACE_ERRORS.SYNC_MISSING);
                await this.requirePermission(actor, id, source.ownerPageId, "read");
                found = true;
                const copies = await replace(structuredClone(source.blocks), new Set(path).add(sourceId));
                const rekey = (items: DisNoteBlock[]): DisNoteBlock[] => items.map(item => ({ ...item, id: createId(), ...(item.children ? { children: rekey(item.children) } : {}) }));
                output.push(...rekey(copies));
              } else output.push({ ...block, ...(block.children ? { children: await replace(block.children, path) } : {}) });
            }
            return output;
          };
          page.document.blocks = await replace(page.document.blocks, new Set());
          if (!found) throw new Error(WORKSPACE_ERRORS.MISSING);
          break;
        }
        case "trashPage":
        case "restorePage": {
          const affected = this.descendants(state, pageId);
          for (const child of affected) await this.requirePermission(actor, id, child.id, "write");
          if (action.kind === "restorePage" && page.parentId && this.page(state, page.parentId).trashed) page.parentId = null;
          for (const child of affected) { child.trashed = action.kind === "trashPage"; if (child.id !== page.id) child.revision++; }
          break;
        }
      }
      page.revision++;
    }
    state.revision++;
    if (!await this.repository.write(state, expectedRevision)) throw new Error(WORKSPACE_ERRORS.CONFLICT);
    return state.revision;
  }

  async pages(actor: string, id: string, trash = false): Promise<WorkspacePage[]> {
    const state = await this.load(actor, id);
    const result: WorkspacePage[] = [];
    for (const page of state.pages) if (page.trashed === trash && await this.policy.can(actor, id, page.id, "read")) {
      const visible = structuredClone(page);
      if (visible.parentId && !await this.policy.can(actor, id, visible.parentId, "read")) visible.parentId = null;
      result.push(visible);
    }
    return result;
  }

  async sharedSources(actor: string, id: string): Promise<{ id: string; ownerPageId: string; revision: number }[]> {
    const state = await this.load(actor, id), result: { id: string; ownerPageId: string; revision: number }[] = [];
    for (const source of state.sharedBlocks) if (!this.page(state, source.ownerPageId).trashed && await this.policy.can(actor, id, source.ownerPageId, "read")) result.push({ id: source.id, ownerPageId: source.ownerPageId, revision: source.revision });
    return result;
  }

  async sharedSource(actor: string, id: string, sourceId: string): Promise<import("./model.js").SharedBlockSource> {
    const state = await this.load(actor, id), source = state.sharedBlocks.find(s => s.id === sourceId);
    if (!source || this.page(state, source.ownerPageId).trashed) throw new Error(WORKSPACE_ERRORS.SYNC_MISSING);
    await this.requirePermission(actor, id, source.ownerPageId, "read");
    return structuredClone(source);
  }

  async breadcrumbs(actor: string, id: string, pageId: string): Promise<{ id: string; title: string }[]> {
    const state = await this.load(actor, id), result: { id: string; title: string }[] = [], seen = new Set<string>();
    let cursor: string | null = pageId;
    while (cursor) {
      if (seen.has(cursor)) throw new Error(WORKSPACE_ERRORS.CYCLE);
      seen.add(cursor);
      if (!await this.policy.can(actor, id, cursor, "read")) break;
      const page = this.page(state, cursor);
      if (page.trashed) break;
      result.unshift({ id: page.id, title: page.document.metadata.title ?? "" });
      cursor = page.parentId;
    }
    return result;
  }

  async backlinks(actor: string, id: string, targetPageId: string): Promise<WorkspacePage[]> {
    await this.requirePermission(actor, id, targetPageId, "read");
    const state = await this.load(actor, id);
    const result: WorkspacePage[] = [];
    for (const page of state.pages) {
      if (page.trashed || !await this.policy.can(actor, id, page.id, "read")) continue;
      let found = false;
      visitBlocks(page.document, ({ block }) => {
        const scan = (nodes: NonNullable<DisNoteBlock["content"]>): void => {
          for (const node of nodes) {
            if (node.type === "reference" && node.targetType === "document" && node.targetId === targetPageId) found = true;
            if (node.type === "link") scan(node.content);
          }
        };
        scan(block.content ?? []);
      });
      if (found) result.push(structuredClone(page));
    }
    return result;
  }

  async resolveDocument(actor: string, id: string, pageId: string): Promise<DisNoteDocument> {
    const state = await this.load(actor, id);
    await this.requirePermission(actor, id, pageId, "read");
    const page = this.page(state, pageId);
    if (page.trashed) throw new Error(WORKSPACE_ERRORS.MISSING);
    const expand = async (blocks: DisNoteBlock[], path: Set<string>): Promise<DisNoteBlock[]> => {
      if (path.size > 32) throw new Error(WORKSPACE_ERRORS.CYCLE);
      const output: DisNoteBlock[] = [];
      for (const block of blocks) {
        const copy = structuredClone(block);
        const sourceId = copy.props["syncedBlockId"];
        if (copy.type === WORKSPACE_BLOCKS.SYNCED && typeof sourceId === "string" && sourceId) {
          if (path.has(sourceId)) throw new Error(WORKSPACE_ERRORS.CYCLE);
          const source = state.sharedBlocks.find(s => s.id === sourceId);
          if (!source || this.page(state, source.ownerPageId).trashed) throw new Error(WORKSPACE_ERRORS.SYNC_MISSING);
          await this.requirePermission(actor, id, source.ownerPageId, "read");
          const expanded = await expand(source.blocks, new Set(path).add(sourceId));
          // Namespaced projection IDs avoid duplicate DOM anchors. Source IDs stay canonical.
          const namespace = (items: DisNoteBlock[]): DisNoteBlock[] => items.map(item => ({ ...item, id: `${copy.id}/${item.id}`, ...(item.children ? { children: namespace(item.children) } : {}) }));
          copy.children = namespace(expanded);
          delete copy.content;
        } else if (copy.children) copy.children = await expand(copy.children, path);
        output.push(copy);
      }
      return output;
    };
    return { ...structuredClone(page.document), blocks: await expand(page.document.blocks, new Set()) };
  }

  private async load(actor: string, id: string): Promise<WorkspaceSnapshot> {
    await this.policy.assert(actor, id, "read");
    const state = await this.repository.read(id);
    if (!state) throw new Error(WORKSPACE_ERRORS.MISSING);
    return structuredClone(state);
  }
  private page(state: WorkspaceSnapshot, id: string): WorkspacePage {
    const page = state.pages.find(p => p.id === id);
    if (!page) throw new Error(WORKSPACE_ERRORS.MISSING);
    return page;
  }
  private async requirePermission(actor: string, id: string, pageId: string, action: "read" | "write"): Promise<void> {
    if (!await this.policy.can(actor, id, pageId, action)) throw new Error(WORKSPACE_ERRORS.DENIED);
  }
  private async move(actor: string, state: WorkspaceSnapshot, pageId: string, parentId: string | null): Promise<void> {
    let cursor = parentId;
    const seen = new Set([pageId]);
    if (parentId) await this.requirePermission(actor, state.id, parentId, "write");
    while (cursor) {
      if (seen.has(cursor)) throw new Error(WORKSPACE_ERRORS.CYCLE);
      seen.add(cursor);
      const parent = this.page(state, cursor);
      if (parent.trashed) throw new Error(WORKSPACE_ERRORS.INVALID);
      cursor = parent.parentId;
    }
    this.page(state, pageId).parentId = parentId;
  }
  private descendants(state: WorkspaceSnapshot, pageId: string): WorkspacePage[] {
    const ids = new Set([pageId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const page of state.pages) if (page.parentId && ids.has(page.parentId) && !ids.has(page.id)) { ids.add(page.id); changed = true; }
    }
    return state.pages.filter(p => ids.has(p.id));
  }
}
