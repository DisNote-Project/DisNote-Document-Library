import { createDocument, heading, paragraph, text } from "@disnote/document-core";
import type { PublishedDocument } from "@disnote/storage-contracts";

/**
 * Stand-in for the DisNote Content API. In production this calls
 * `GET /api/content/documents/:slug?locale=en` and returns the published
 * revision only. Here we return a static document so the demo runs offline.
 */
export async function getPublishedDocument(slug: string, locale: string): Promise<PublishedDocument | null> {
  const document = createDocument({
    id: `doc_${slug}`,
    metadata: { title: "Privacy Policy", description: "How we handle your data.", locale: locale as "en" },
    blocks: [
      heading(1, [text("Privacy Policy")], { id: "h" }),
      paragraph([text("This document is rendered on the server from a published revision.")], { id: "p" }),
    ],
  });
  const now = document.metadata.createdAt;
  return {
    stored: {
      id: document.id,
      slug,
      locale,
      kind: "LEGAL_POLICY",
      title: "Privacy Policy",
      status: "published",
      currentRevision: 1,
      publishedRevision: 1,
      schemaVersion: document.schemaVersion,
      createdBy: "system",
      createdAt: now,
      updatedAt: now,
    },
    revision: {
      documentId: document.id,
      revision: 1,
      document,
      plainText: "Privacy Policy",
      checksum: "demo",
      createdBy: "system",
      createdAt: now,
      source: "editor",
    },
  };
}
