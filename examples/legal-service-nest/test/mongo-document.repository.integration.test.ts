import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import {
  createDocument,
  legalRegistry,
  paragraph,
  text,
  type DisNoteDocument,
} from "@disnote/document-core";
import { runDocumentRepositoryContract } from "@disnote/document-testing";
import type {
  DocumentRevision,
  StoredDocument,
} from "@disnote/storage-contracts";
import {
  MongoDocumentRepository,
  type MongoDocumentRepositoryCollections,
} from "../src/mongo-document.repository.js";

const uri = process.env["DISNOTE_TEST_MONGO_URI"];
const clients: MongoClient[] = [];

after(async () => {
  await Promise.all(clients.map((client) => client.close()));
});

const register = (
  name: string,
  fn: () => Promise<void> | void,
): void => {
  test(name, { skip: uri ? false : "DISNOTE_TEST_MONGO_URI is not configured" }, fn);
};

runDocumentRepositoryContract(register, async () => {
  if (!uri) throw new Error("DISNOTE_TEST_MONGO_URI is required.");
  const client = new MongoClient(uri);
  await client.connect();
  clients.push(client);
  const db = client.db(`disnote_contract_${randomUUID().replaceAll("-", "")}`);
  const collections: MongoDocumentRepositoryCollections = {
    documents: db.collection<StoredDocument>("documents"),
    revisions: db.collection<DocumentRevision>("revisions"),
    idempotency: db.collection("idempotency") as MongoDocumentRepositoryCollections["idempotency"],
  };
  const repository = new MongoDocumentRepository(
    client,
    collections,
    legalRegistry,
    () => "2026-01-01T00:00:00.000Z",
  );
  await repository.initialize();

  return {
    reader: repository,
    draftWriter: repository,
    publisher: repository,
    revisions: repository,
    async seed(input: {
      slug: string;
      locale: string;
      title: string;
      document: DisNoteDocument;
    }): Promise<string> {
      const stored = await repository.create({
        slug: input.slug,
        locale: input.locale,
        kind: "ARTICLE",
        title: input.title,
        actor: "contract-test",
        document: input.document,
      });
      return stored.id;
    },
    makeDocument(id: string, _slug: string, body: string): DisNoteDocument {
      return createDocument({
        id,
        now: "2026-01-01T00:00:00.000Z",
        blocks: [paragraph([text(body)])],
      });
    },
  };
});
