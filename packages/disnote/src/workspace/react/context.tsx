import { createContext, type ReactNode } from "react";
import type { SharedBlockSource, WorkspacePage } from "../model.js";
import type { DisNoteDocument } from "../../core/index.js";
export interface WorkspacePageViewProvider {
  pages(trash: boolean): Promise<WorkspacePage[]>;
  create(document: DisNoteDocument, parentId: string | null): Promise<void>;
  move(pageId: string, parentId: string | null): Promise<void>;
  trash(pageId: string): Promise<void>;
  restore(pageId: string): Promise<void>;
  subscribe?(listener: () => void): () => void;
}
export interface SharedSourceViewProvider {
  sharedSources(): Promise<{ id: string; ownerPageId: string; revision: number }[]>;
  sharedSource(id: string): Promise<SharedBlockSource>;
  saveSharedSource(source: SharedBlockSource, expectedRevision: number): Promise<void>;
  canEditSharedSource?(id: string): boolean;
  subscribe?(listener: () => void): () => void;
}
export interface WorkspaceBreadcrumbProvider {
  breadcrumbs(): Promise<{ id: string; title: string; href?: string }[]>;
  /** Must unsubscribe when the component unmounts. Hosts dispatch committed changes. */
  subscribe?(listener: () => void): () => void;
}
/** Convenience composition for applications mounting the full workspace surface. */
export interface WorkspaceViewProvider extends WorkspacePageViewProvider, SharedSourceViewProvider, WorkspaceBreadcrumbProvider {}
export const WorkspaceViewContext = createContext<WorkspaceViewProvider | null>(null);
export function WorkspaceProvider({ provider, children }: { provider: WorkspaceViewProvider; children: ReactNode }): ReactNode { return <WorkspaceViewContext.Provider value={provider}>{children}</WorkspaceViewContext.Provider>; }
