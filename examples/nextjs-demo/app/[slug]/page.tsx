import type { Metadata } from "next";
import {
  validateDocument,
  createMigrationRegistry,
  articleRegistry,
} from "@disnote/document-core";
import { renderDocumentToHtml } from "@disnote/renderer-html";
import { getPublishedDocument } from "../../lib/content";

// Revalidate when a new revision is published (see lib/content.ts).
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const published = await getPublishedDocument(params.slug, "en");
  if (!published) return { title: "Not found" };
  return {
    title: published.revision.document.metadata.title ?? published.stored.title,
    description: published.revision.document.metadata.description,
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const published = await getPublishedDocument(params.slug, "en");
  if (!published) return <main>Not found</main>;

  // Migrate older persisted schemas before validating against current block rules.
  const migrated = createMigrationRegistry().migrate(published.revision.document);
  if (!migrated.ok) return <main>Migration failed.</main>;
  const validated = validateDocument(migrated.document, { registry: articleRegistry });
  if (!validated.ok) return <main>Document failed validation.</main>;

  // No editor bundle is loaded on this read-only page.
  const { html } = renderDocumentToHtml({ document: validated.value, registry: articleRegistry });
  return <main dangerouslySetInnerHTML={{ __html: html }} />;
}
