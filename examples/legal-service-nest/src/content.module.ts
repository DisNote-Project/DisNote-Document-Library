/**
 * Content bounded context wired into NestJS. Guideline section 18.1: this is a
 * sibling module to the existing Legal domain, not new logic inside it.
 */
import { Module } from "@nestjs/common";
import { ContentApplicationService } from "@disnote/legal-content";
import { createDefaultRegistry } from "@disnote/document-core";
import type { DocumentRevision, StoredDocument } from "@disnote/storage-contracts";
import { createMigrationRegistry } from "@disnote/document-core";
import { ContentController } from "./content.controller.js";
import { AdminContentController } from "./admin-content.controller.js";
import { MongoDocumentRepository } from "./mongo-document.repository.js";
import { MongoClient } from "mongodb";
import { ContentAdminGuard } from "./content-admin-auth.js";

interface ContentIdempotencyRecord {
  key: string;
  documentId: string;
  revision: number;
  createdAt: string;
}

@Module({
  controllers: [ContentController, AdminContentController],
  providers: [
    ContentAdminGuard,
    {
      provide: ContentApplicationService,
      useFactory: async () => {
        const registry = createDefaultRegistry();
        const uri = process.env["MONGODB_URI"];
        if (!uri) throw new Error("MONGODB_URI is required by ContentModule.");
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db(process.env["MONGODB_DATABASE"] ?? "disnote");
        const store = new MongoDocumentRepository(
          client,
          {
            documents: db.collection<StoredDocument>("content_documents"),
            revisions: db.collection<DocumentRevision>("content_revisions"),
            idempotency: db.collection<ContentIdempotencyRecord>("content_idempotency"),
          },
          registry,
        );
        await store.initialize();
        return new ContentApplicationService({ store, registry, migrations: createMigrationRegistry() });
      },
    },
  ],
})
export class ContentModule {}
