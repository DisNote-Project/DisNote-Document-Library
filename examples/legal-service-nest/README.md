# legal-service-nest

Reference integration for Milestone 9. Shows how a NestJS service adds a
**Content** bounded context (guideline section 18) without touching existing
Legal domain logic:

- `content.controller.ts` — public API, published revisions only.
- `admin-content.controller.ts` — admin CRUD; the controller is only the HTTP
  boundary, all rules live in `@disnote/legal-content`'s `ContentApplicationService`.
- `mongo-document.repository.ts` — implements `ContentStore` with Mongo
  transactions, optimistic concurrency, immutable revisions and idempotency.
  It uses separate `content_documents`, `content_revisions`, and
  `content_idempotency` collections.
- `content.module.ts` — wiring.

Set `MONGODB_URI` and optionally `MONGODB_DATABASE` before creating the Nest
application. `MongoDocumentRepository.initialize()` creates the required unique
indexes. The application/domain layer remains pure and fully unit-tested.

`ContentAdminGuard` expects the host authentication layer to populate
`request.user` with `sub` and a `content:admin` permission. `ContentActor`
forwards that real subject into revision and audit records.
