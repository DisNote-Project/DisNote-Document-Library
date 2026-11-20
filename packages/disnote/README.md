# @disnote/core

Vendor-neutral DisNote document model with validation, migrations, builders,
renderers, editor adapters, import/export and revision/storage contracts.

Install a published compatible release with npm install @disnote/core.
For the React editor facade, add @disnote/react. Read-only React consumers can
use @disnote/core/react/view; servers can use @disnote/core/renderer/html.

## Complete documentation

| Guide | Scope |
|---|---|
| [Architecture](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/ARCHITECTURE.md) | Model, modules, security and extension boundaries |
| [TypeScript](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/TYPESCRIPT.md) | React, React Native, Node.js/NestJS and npm |
| [Go backend](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/GO_BACKEND.md) | Separate Go SDK, Gin and Uber Fx |
| [Flutter frontend](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/FLUTTER.md) | Native reader, iframe/WebView editor and NestJS |

Canonical DisNoteDocument JSON is the durable format. UI editability does not
replace server authorization. Registry availability and platform fidelity depend
on the selected adapter; see the guides before integration.

Apache-2.0. See LICENSE and THIRD_PARTY_NOTICES.md.
