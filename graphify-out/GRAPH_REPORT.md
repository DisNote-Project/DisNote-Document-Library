# Graph Report - DisNote-Document-Library  (2026-11-18)

## Corpus Check
- 340 files · ~161,109 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 5, .css 4, .zip 2)

## Summary
- 2719 nodes · 7112 edges · 167 communities (148 shown, 19 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 193 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8adeb9da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- docx/import.ts
- transformations/index.ts
- BlockRegistry
- core/index.ts
- validateDocument
- createDocument
- rules.ts
- ref_react
- comments/model.ts
- sheets/package.json
- markdown/import.ts
- DatabaseView.tsx
- import-export.ts
- content-service.ts
- schema.tsx
- DatabaseSnapshot
- package.json
- storage/document-repository.ts
- database/service.ts
- html/import.ts
- src/model.ts
- uiMessages
- formula.ts
- blocks.tsx
- WebSocketCollaborationTransport
- DisNoteEditor.tsx
- editor/react/index.ts
- with
- html.ts
- mongo-update-store.ts
- DisNoteDocument
- react-demo/package.json
- uploader.ts
- model/builders.ts
- services.test.ts
- nextjs-demo/package.json
- renderer-react/index.ts
- math/index.ts
- test/server-adapters.test.ts
- editor/index.ts
- workspace/react/context.tsx
- DisNoteBlock
- collaboration-server/package.json
- EditorEngine
- scripts
- collaboration/index.ts
- validation/index.ts
- convert.ts
- assets.test.ts
- src/react/index.tsx
- SpreadsheetWorkbook
- createParityRuntime
- steps
- peerDependenciesMeta
- peerDependencies
- actions/model.ts
- MathEquationEditor.tsx
- workbook.ts
- compilerOptions
- legal-service-nest/package.json
- compilerOptions
- AdminContentController
- DiagramView.tsx
- overrides
- disnote/package.json
- workspace/model.ts
- presets.ts
- archive.ts
- runtime.ts
- offline/model.ts
- react/package.json
- errors/index.ts
- MobileEditorBridge.tsx
- RevisionDocumentRepository
- go-contract.test.ts
- dependencies
- FormulaParser
- dependencies
- binding.ts
- CommentService
- FormulaEditor.tsx
- DocumentNativeRenderer.tsx
- release-preflight.mjs
- OfflineDocument
- config.json
- compilerOptions
- dictionary.ts
- disnote/tsconfig.json
- react/tsconfig.json
- websocket.test.ts
- editor-engine-lab/package.json
- core/messages.ts
- selection.ts
- sheets/tsconfig.json
- compilerOptions
- collaboration-server/tsconfig.json
- editor-engine-lab/tsconfig.json
- BlockRegistryImpl
- DocumentHistoryService
- manifest.json
- @playwright/test
- exports
- selection-anchor.ts
- DocumentRenderer.stories.tsx
- e2e/tsconfig.json
- IndexedDBOfflineStore
- SearchPanel.tsx
- ./view
- @eslint/js
- CollaborationProvider
- SharedBlockControl.tsx
- peerDependencies
- benchmark.mjs
- @storybook/react-vite
- ./actions
- ./actions/react
- ./assets
- ./collaboration/browser
- ./collaboration
- ./comments
- ./comments/react
- ./database
- ./database/react
- ./diagrams/react
- ./editor
- ./editor/react/collaboration
- ./editor/react
- ./import-export
- ./import-export/docx
- ./import-export/react
- ./legal
- ./math
- ./mobile
- ./offline
- ./persistence/browser
- ./persistence/mongodb
- ./persistence/postgres
- ./presets/legal
- ./presets/workspace
- ./react
- ./react/view
- ./renderer/html
- ./renderer/native
- ./renderer/react
- ./search-ai
- ./search-ai/react
- ./storage
- ./storage/browser
- ./storage/react
- ./styles
- ./testing
- ./ui
- ./workspace
- ./workspace/react
- repository
- scripts
- repository
- publishConfig
- scripts
- tsconfig.json
- storybook@^8.6.19
- @storybook/addon-essentials@^8.6.14
- typescript@^5.4.0
- @blocknote/xl-multi-column@0.52.1
- @disnote/core@^0.7.0
- publishConfig

## God Nodes (most connected - your core abstractions)
1. `DisNoteDocument` - 124 edges
2. `createDocument()` - 73 edges
3. `DisNoteBlock` - 68 edges
4. `paragraph()` - 60 edges
5. `text()` - 57 edges
6. `validateDocument()` - 46 edges
7. `uiMessages()` - 45 edges
8. `createParityRuntime()` - 44 edges
9. `exports` - 44 edges
10. `BlockRegistry` - 41 edges

## Surprising Connections (you probably didn't know these)
- `MongoUpdateStore` --implements--> `UpdatePersistence`  [EXTRACTED]
  examples/collaboration-server/src/mongo-update-store.ts → packages/disnote/src/collaboration/contracts.ts
- `CreateDto` --references--> `DisNoteDocument`  [EXTRACTED]
  examples/legal-service-nest/src/admin-content.controller.ts → packages/disnote/src/core/model/document.ts
- `SaveDraftDto` --references--> `DisNoteDocument`  [EXTRACTED]
  examples/legal-service-nest/src/admin-content.controller.ts → packages/disnote/src/core/model/document.ts
- `MongoDocumentRepository` --implements--> `ContentStore`  [EXTRACTED]
  examples/legal-service-nest/src/mongo-document.repository.ts → packages/disnote/src/legal/application/content-service.ts
- `Page()` --calls--> `validateDocument()`  [EXTRACTED]
  examples/nextjs-demo/app/[slug]/page.tsx → packages/disnote/src/core/validation/index.ts

## Import Cycles
- 2-file cycle: `packages/disnote/src/editor/i18n/dictionary.ts -> packages/disnote/src/editor/i18n/vi.ts -> packages/disnote/src/editor/i18n/dictionary.ts`

## Communities (167 total, 19 thin omitted)

### Community 0 - "docx/import.ts"
Cohesion: 0.06
Nodes (59): canonicalJson(), sortValue(), K, rrot(), sha256Hex(), utf8Bytes(), recordDocumentId(), RecordPageAccess (+51 more)

### Community 1 - "transformations/index.ts"
Cohesion: 0.06
Nodes (52): extractHeadings(), appendBlock(), DocumentTransformError, err(), insertBlock(), InsertBlockInput, insertInto(), mapBlocks() (+44 more)

### Community 2 - "BlockRegistry"
Cohesion: 0.06
Nodes (27): BlockRegistry, createMongoDocumentRepository(), CreateMongoDocumentRepositoryOptions, isDuplicateKey(), MONGO_DOCUMENT_STATE_INDEXES, MongoDocumentStateCollection, MongoDocumentStateRecord, MongoDocumentStateRepository (+19 more)

### Community 3 - "core/index.ts"
Cohesion: 0.10
Nodes (57): audioCore, boardCore, bookmarkCore, breadcrumbCore, bulletListItemCore, calendarCore, CALLOUT_INTENTS, calloutCore (+49 more)

### Community 4 - "validateDocument"
Cohesion: 0.08
Nodes (23): IdempotencyRecord, MongoDocumentRepository, MongoDocumentRepositoryCollections, seed(), snapshotToRevision(), InvalidDocumentError, CURRENT_SCHEMA_VERSION, checksum() (+15 more)

### Community 5 - "createDocument"
Cohesion: 0.10
Nodes (30): clients, makeDocument(), createDocument(), paragraph(), text(), createDefaultRegistry(), runDocumentRepositoryContract(), makeAllMarksDocument() (+22 more)

### Community 6 - "rules.ts"
Cohesion: 0.09
Nodes (25): AUTOMATION_ERRORS, AUTOMATION_LIMITS, AutomationAction, AutomationDependencies, AutomationJobStatus, AutomationTrigger, DatabaseAutomationJob, DatabaseAutomationProvider (+17 more)

### Community 7 - "ref_react"
Cohesion: 0.12
Nodes (28): CellValue, DatabaseChartQuery, DatabaseChartResult, DatabaseCommand, DatabaseProperty, DatabaseQuery, DatabaseQueryResult, DatabaseRecord (+20 more)

### Community 8 - "comments/model.ts"
Cohesion: 0.08
Nodes (23): remapCommentAnchors(), TextEdit, DirectoryEntry, InMemoryMentionProvider, CommentAnchor, CommentEntry, CommentThread, DocumentReference (+15 more)

### Community 9 - "sheets/package.json"
Cohesion: 0.05
Nodes (44): dependencies, fflate@^0.8.2, description, engines, node, exports, ./formula, ./import-export (+36 more)

### Community 10 - "markdown/import.ts"
Cohesion: 0.17
Nodes (32): block(), bulletListItem(), callout(), checklistItem(), codeBlock(), customBlock(), diagram(), divider() (+24 more)

### Community 11 - "DatabaseView.tsx"
Cohesion: 0.14
Nodes (30): shiftRecordDates(), DatabaseViewKind, AutomationRuleEditor(), localDate(), CellInput(), display(), DatabaseViewContext, DatabaseCellValue() (+22 more)

### Community 12 - "import-export.ts"
Cohesion: 0.10
Nodes (41): HASH_CONSTANTS, rotate(), sha256Hex(), appProperties(), attribute(), boundedUnzip(), cellXml(), compareAddresses() (+33 more)

### Community 13 - "content-service.ts"
Cohesion: 0.09
Nodes (18): AuthenticatedRequest, AuthenticatedUser, ContentAdminGuard, ContentController, ContentIdempotencyRecord, ContentModule, AuditSink, ContentApplicationService (+10 more)

### Community 14 - "schema.tsx"
Cohesion: 0.07
Nodes (36): ActionButton(), DocumentActionContext, DocumentActionProvider, useEditorI18n(), boardSpec, bookmarkSpec, breadcrumbSpec, calendarSpec (+28 more)

### Community 15 - "DatabaseSnapshot"
Cohesion: 0.13
Nodes (14): AutomationDomain, DatabaseMutationResult, DatabasePolicy, DatabaseRepository, DatabaseSnapshot, InMemoryDatabaseRepository, DatabaseService, fixture() (+6 more)

### Community 16 - "package.json"
Cohesion: 0.07
Nodes (39): description, devDependencies, @blocknote/xl-multi-column@^0.52.1, @changesets/cli@^2.31.1, eslint@^10.7.0, postcss@^8.5.30, react@^19.2.8, react-dom@^19.2.8 (+31 more)

### Community 17 - "storage/document-repository.ts"
Cohesion: 0.09
Nodes (14): RecordPageProvider, DocumentPublisher, DocumentReader, DocumentRepository, DocumentRevisionSummary, DocumentStatus, DraftWriter, RevisionReader (+6 more)

### Community 18 - "database/service.ts"
Cohesion: 0.14
Nodes (26): applyDatabaseCommand(), DATABASE_DAY_MS, DATABASE_WEEK, shiftToWorkingDays(), compareCells(), evaluateFormula(), matchesFilter(), validateCell() (+18 more)

### Community 19 - "html/import.ts"
Cohesion: 0.14
Nodes (27): ClipboardImportPayload, importClipboard(), DocxDiagnostic, convertDocxToMarkdown(), DocxToMarkdownResult, MarkdownToDocxResult, BLOCK_ELEMENT_NAMES, containsBlockElement() (+19 more)

### Community 20 - "src/model.ts"
Cohesion: 0.12
Nodes (27): CellCoordinate, columnIndexToName(), columnNameToIndex(), expandCellRange(), formatCellAddress(), normalizeCellAddress(), parseCellAddress(), rangesOverlap() (+19 more)

### Community 21 - "uiMessages"
Cohesion: 0.12
Nodes (21): App(), darkTheme, EditorPanel, initialDocument, MobileEditorLab, ParityLab, EditorPanel(), PARITY_ROUTES (+13 more)

### Community 22 - "formula.ts"
Cohesion: 0.13
Nodes (23): FORMULA_ERROR_VALUES, binary(), builtIn(), compare(), evaluateCell(), evaluateFormula(), Expression, finite() (+15 more)

### Community 23 - "blocks.tsx"
Cohesion: 0.17
Nodes (28): ACTION_BLOCK_PROPERTIES, actionButtonBlock(), containsControlOrWhitespace(), DEFAULT_SCHEMES, isSafeUrl(), normalizeScheme(), safeUrl(), AudioBlock() (+20 more)

### Community 24 - "WebSocketCollaborationTransport"
Cohesion: 0.11
Nodes (7): BroadcastChannelCollaborationTransport, COLLABORATION_PROTOCOL, CollaborationPacket, CollaborationTransport, EditorCollaborationProvider, WEBSOCKET_CONSTANTS, WebSocketCollaborationTransport

### Community 25 - "DisNoteEditor.tsx"
Cohesion: 0.11
Nodes (17): EditorLocale, EDITOR_EXTENSION_ERRORS, EditorInsertCommand, validateEditorInsertCommands(), CollaborativeEditor(), CollaborativeEditor, DisNoteEditorBase, DisNoteEditorHandle (+9 more)

### Community 26 - "editor/react/index.ts"
Cohesion: 0.12
Nodes (17): EditorMessageKey, I18n, DocumentCapabilities, ExperimentalEditorAccess, ImageUploadButton(), ImageUploadButtonProps, Status, UploadProvider (+9 more)

### Community 27 - "with"
Cohesion: 0.07
Nodes (28): concurrency, cancel-in-progress, group, GITHUB_TOKEN, NODE_AUTH_TOKEN, NPM_TOKEN, jobs, release (+20 more)

### Community 28 - "html.ts"
Cohesion: 0.16
Nodes (15): safeColor(), AssetReference, clampLevel(), HeadingEntry, HtmlBlockRenderer, HtmlRenderPolicy, HtmlRenderResult, LIST_TYPES (+7 more)

### Community 29 - "mongo-update-store.ts"
Cohesion: 0.11
Nodes (9): CollaborationMetrics, CounterRecord, LockRecord, MongoUpdateStore, MongoUpdateStoreOptions, SnapshotRecord, UpdateRecord, PRESENCE_KINDS (+1 more)

### Community 30 - "DisNoteDocument"
Cohesion: 0.11
Nodes (9): CreateDto, SaveDraftDto, EditorPanelProps, ParityRuntime, StableRevision, MigrationRegistry, MigrationRegistryImpl, DisNoteDocument (+1 more)

### Community 31 - "react-demo/package.json"
Cohesion: 0.10
Nodes (26): dependencies, @blocknote/core@0.52.1, @blocknote/mantine@0.52.1, @blocknote/react@0.52.1, @disnote/core@*, react@^19.2.8, react-dom@^19.2.8, description (+18 more)

### Community 32 - "uploader.ts"
Cohesion: 0.13
Nodes (15): detectMimeType(), Signature, SIGNATURES, AssetValidationError, DEFAULT_ALLOWED, InMemoryAssetUploader, UploaderOptions, AssetReference (+7 more)

### Community 33 - "model/builders.ts"
Cohesion: 0.13
Nodes (19): RFC-4122, toggle(), createDocumentId(), createId(), RandomUuid, setIdGenerator(), InlineReference, LinkInline (+11 more)

### Community 34 - "services.test.ts"
Cohesion: 0.10
Nodes (14): generateMetadata(), Page(), revalidate, getPublishedDocument(), createMigrationRegistry(), articlePreset, articleRegistry, defineDocumentPreset() (+6 more)

### Community 35 - "nextjs-demo/package.json"
Cohesion: 0.09
Nodes (18): metadata, dependencies, @disnote/core@*, next@16.4.3, react@^19.2.8, react-dom@^19.2.8, description, @disnote/core (+10 more)

### Community 36 - "renderer-react/index.ts"
Cohesion: 0.18
Nodes (19): UrlPolicy, HeadingEntry, UnknownBlockProps, DocumentRendererProps, MathRendererProps, AssetResolver, defaultTheme, DocumentRenderContext (+11 more)

### Community 37 - "math/index.ts"
Cohesion: 0.16
Nodes (19): applyMathPaletteItem(), greek, MathFieldTemplate, mathFieldTemplateFor(), MathInsertionResult, mathPaletteByCategory, MathPaletteCategory, MathPaletteItem (+11 more)

### Community 38 - "test/server-adapters.test.ts"
Cohesion: 0.13
Nodes (9): isDuplicateKey(), MONGO_WORKBOOK_INDEXES, MongoWorkbookCollection, MongoWorkbookStateRepository, PostgresWorkbookStateRepository, SpreadsheetSqlExecutor, WorkbookStoreState, state (+1 more)

### Community 39 - "editor/index.ts"
Cohesion: 0.15
Nodes (15): BlockNoteEditorDocument, createBlockNoteAdapter(), EditorAdapter, EnvelopeMeta, normalizeBlocks(), normalizeDocument(), RoundTripReport, BnBlock (+7 more)

### Community 40 - "workspace/react/context.tsx"
Cohesion: 0.13
Nodes (6): SharedBlockSource, SharedSourceViewProvider, WorkspaceBreadcrumbProvider, WorkspacePageViewProvider, WorkspaceViewContext, WorkspaceViewProvider

### Community 41 - "DisNoteBlock"
Cohesion: 0.17
Nodes (13): BlockInit, CreateDocumentInit, DisNoteBlock, DocumentMetadata, DisNoteInline, JsonValue, BlockCapabilities, DefineCoreBlockInput (+5 more)

### Community 42 - "collaboration-server/package.json"
Cohesion: 0.12
Nodes (20): dependencies, @disnote/core@*, mongodb@^6.8.0, ws@^8.18.0, yjs@^13.6.18, description, devDependencies, @types/ws@^8.5.13 (+12 more)

### Community 43 - "EditorEngine"
Cohesion: 0.18
Nodes (7): EditorEngine, EngineState, LabBlock, nextId(), replaceAt(), Selection, Transaction

### Community 44 - "scripts"
Cohesion: 0.10
Nodes (20): scripts, build, build:examples, build-storybook, changeset, clean, lint, release (+12 more)

### Community 45 - "collaboration/index.ts"
Cohesion: 0.17
Nodes (7): Awareness, CollabSnapshot, CollabUpdate, UpdatePersistence, InMemoryUpdateStore, UpdateStoreOptions, SnapshotResult

### Community 46 - "validation/index.ts"
Cohesion: 0.19
Nodes (17): DocumentIssue, DOCUMENT_FORMAT, isJsonValue(), JsonObject, JsonPrimitive, isIsoDateString(), isPlainObject(), Issues (+9 more)

### Community 47 - "convert.ts"
Cohesion: 0.17
Nodes (19): blockFromBn(), blockToBn(), bnToText(), CALLOUT_INTENTS, clampHeadingLevel(), codeText(), DIRECT_TYPES, FROM_BN_TYPE (+11 more)

### Community 48 - "assets.test.ts"
Cohesion: 0.14
Nodes (5): OFFLINE_ASSETS, OfflineAsset, OfflineAssetCache, OfflineAssetLoader, OfflineAssetStore

### Community 49 - "src/react/index.tsx"
Cohesion: 0.29
Nodes (14): DOCUMENT_PAGE_WIDTHS, DocumentPage(), DocumentPageProps, DocumentPageWidth, DocumentEditor, DocumentEditorHandle, DocumentEditorProps, LazyEditor (+6 more)

### Community 50 - "SpreadsheetWorkbook"
Cohesion: 0.15
Nodes (9): FormulaFunction, FormulaFunctionContext, SpreadsheetWorkbook, InMemoryWorkbookStateRepository, RevisionWorkbookRepository, WorkbookStateRepository, createSpreadsheetPluginRegistry(), SpreadsheetPlugin (+1 more)

### Community 51 - "createParityRuntime"
Cohesion: 0.32
Nodes (3): createParityRuntime(), WorkspacePage, WorkspaceDocumentService

### Community 52 - "steps"
Cohesion: 0.11
Nodes (18): runs-on, steps, DISNOTE_TEST_MONGO_URI, jobs, build, name, on, pull_request (+10 more)

### Community 53 - "peerDependenciesMeta"
Cohesion: 0.11
Nodes (19): optional, optional, optional, optional, peerDependenciesMeta, @blocknote/core, @blocknote/mantine, @blocknote/react (+11 more)

### Community 54 - "peerDependencies"
Cohesion: 0.11
Nodes (19): @blocknote/core, @blocknote/mantine, @blocknote/react, @blocknote/xl-multi-column, react, react-dom, y-prosemirror, y-protocols (+11 more)

### Community 55 - "actions/model.ts"
Cohesion: 0.22
Nodes (9): ACTION_ERRORS, ButtonActionPolicy, ButtonActionReceipt, ButtonActionState, ButtonDomainFactories, ButtonTransactionRepository, DocumentButtonAction, DocumentButtonActionService (+1 more)

### Community 56 - "MathEquationEditor.tsx"
Cohesion: 0.14
Nodes (14): createI18n(), EditorMessageOverrides, categoryMessageKeys, categoryOrder, MathEquationEditor(), MathEquationEditorProps, mathFieldStyle, mathItemMessageKey() (+6 more)

### Community 57 - "workbook.ts"
Cohesion: 0.25
Nodes (15): importCsv(), assertWorkbook(), validateWorkbook(), addSheet(), clearCell(), createWorkbook(), createWorksheet(), getCell() (+7 more)

### Community 58 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, composite, declaration, declarationMap, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 59 - "legal-service-nest/package.json"
Cohesion: 0.14
Nodes (17): dependencies, @disnote/core@*, mongodb@^6.8.0, @nestjs/common@^11.1.28, reflect-metadata@^0.2.2, rxjs@^7.8.1, description, @disnote/core (+9 more)

### Community 60 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 62 - "DiagramView.tsx"
Cohesion: 0.25
Nodes (8): DiagramView(), DiagramViewProps, DIAGRAM_FORMATS, DIAGRAM_LIMITS, DIAGRAM_SAMPLES, DiagramFormat, validDiagramSource(), DiagramEditor()

### Community 63 - "overrides"
Cohesion: 0.12
Nodes (17): overrides, postcss, sharp, @tiptap/core, @tiptap/extension-bold, @tiptap/extension-bubble-menu, @tiptap/extension-code, @tiptap/extension-floating-menu (+9 more)

### Community 64 - "disnote/package.json"
Cohesion: 0.12
Nodes (16): bugs, url, description, engines, node, files, homepage, keywords (+8 more)

### Community 65 - "workspace/model.ts"
Cohesion: 0.23
Nodes (8): WORKSPACE_BLOCKS, WORKSPACE_ERRORS, WorkspaceAction, WorkspaceDocumentPolicy, WorkspaceRepository, WorkspaceSnapshot, InMemoryWorkspaceRepository, setup()

### Community 66 - "presets.ts"
Cohesion: 0.15
Nodes (10): DefineDocumentPresetInput, DOCUMENT_PRESET_ERRORS, DocumentPreset, legalPreset, legalRegistry, presets, sharedRegistry, workspacePreset (+2 more)

### Community 67 - "archive.ts"
Cohesion: 0.28
Nodes (12): ARCHIVE, exportDocumentArchive(), importDocumentArchive(), importNotionExport(), NotionExportImport, parseCsv(), readDocumentArchive(), safePath() (+4 more)

### Community 68 - "runtime.ts"
Cohesion: 0.16
Nodes (5): PARITY_LAB, offlineDocument, parityRegistry, IndexedDBRevisionRepository, REVISION_STORAGE

### Community 69 - "offline/model.ts"
Cohesion: 0.24
Nodes (5): OFFLINE_CONSTANTS, OfflinePendingWrite, OfflineRemote, OfflineStore, InMemoryOfflineStore

### Community 70 - "react/package.json"
Cohesion: 0.14
Nodes (13): description, engines, node, files, homepage, license, main, name (+5 more)

### Community 71 - "errors/index.ts"
Cohesion: 0.23
Nodes (7): DocumentError, MigrationError, RenderError, RevisionConflictError, UnknownBlockError, UnsupportedSchemaVersionError, UploadError

### Community 72 - "MobileEditorBridge.tsx"
Cohesion: 0.26
Nodes (8): MOBILE_BRIDGE, mobileCommandScript(), MobileEditorCommand, MobileEditorMessage, parseMobileEditorMessage(), NativeDocumentEditor(), NativeWebViewHandle, NativeWebViewProps

### Community 74 - "go-contract.test.ts"
Cohesion: 0.18
Nodes (7): ContractManifest, root, destination, manifest, repositoryRoot, scriptDirectory, source

### Community 75 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @blocknote/core@0.52.1, @blocknote/mantine@0.52.1, @blocknote/react@0.52.1, y-prosemirror@^1.3.7, y-protocols@^1.0.6, yjs@^13.6.18, @blocknote/core (+5 more)

### Community 77 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, dompurify@^3.4.17, fflate@^0.8.3, katex@^0.19.0, mathlive@^0.110.0, @maxgraph/core@^0.25.0, mermaid@^12.2.0, fflate (+4 more)

### Community 78 - "binding.ts"
Cohesion: 0.29
Nodes (11): applyUpdate(), blockToYMap(), encodeState(), inlineToYArray(), jsonObjectToYMap(), jsonToYValue(), seedYDoc(), snapshotFromYDoc() (+3 more)

### Community 80 - "FormulaEditor.tsx"
Cohesion: 0.23
Nodes (9): evaluateExtendedFormula(), FORMULA_ARITY, invalid(), Formula, FORMULA_OPERATORS, FormulaOperator, EMPTY, formulaOperatorLabels() (+1 more)

### Community 81 - "DocumentNativeRenderer.tsx"
Cohesion: 0.26
Nodes (8): DocumentNativeRenderer(), DocumentNativeRendererProps, NativeBlockRendererApi, NativeBlockRenderers, NativePrimitiveProps, NativeRendererPrimitives, NativeTextRun, projectForNative()

### Community 82 - "release-preflight.mjs"
Cohesion: 0.17
Nodes (7): branch, errors, fetchResult, gitStatus, identities, manifests, registries

### Community 84 - "config.json"
Cohesion: 0.20
Nodes (9): access, baseBranch, changelog, commit, fixed, ignore, linked, $schema (+1 more)

### Community 85 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, emitDecoratorMetadata, experimentalDecorators, noEmit, types, extends, include (+1 more)

### Community 86 - "dictionary.ts"
Cohesion: 0.27
Nodes (7): CreateI18nOptions, DEFAULT_EDITOR_LOCALE, defineEditorMessages(), EditorDictionary, EN_EDITOR_MESSAGES, VI_EDITOR_MESSAGES, defaultSlashCommands

### Community 87 - "disnote/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, lib, outDir, rootDir, exclude, extends, include (+1 more)

### Community 88 - "react/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, lib, outDir, rootDir, extends, include, ../../tsconfig.base.json (+1 more)

### Community 89 - "websocket.test.ts"
Cohesion: 0.42
Nodes (5): CollaborationClaims, createCollaborationToken(), encode(), sign(), verifyCollaborationToken()

### Community 90 - "editor-engine-lab/package.json"
Cohesion: 0.22
Nodes (8): description, license, name, private, scripts, typecheck, type, version

### Community 91 - "core/messages.ts"
Cohesion: 0.25
Nodes (7): LIBRARY_MESSAGES, BlockMigrationFn, DocKey, DocumentMigrationFn, MigrateOptions, MigrationReport, MigrationResult

### Community 92 - "selection.ts"
Cohesion: 0.36
Nodes (8): BlockSelection, changeBlocksTypeInRange(), deleteBlocksInRange(), flattenBlocks(), visit(), getBlocksInRange(), removeBlocksFromTree(), updateBlocksInTree()

### Community 93 - "sheets/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, lib, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json

### Community 94 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, jsx, module, moduleResolution, skipLibCheck, strict, target

### Community 95 - "collaboration-server/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 96 - "editor-engine-lab/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, lib, types, extends, include, ../../tsconfig.base.json

### Community 99 - "manifest.json"
Cohesion: 0.29
Nodes (6): canonicalFixture, canonicalSha256, contractVersion, documentSchemaVersion, invalidFixtures, validFixtures

### Community 101 - "exports"
Cohesion: 0.29
Nodes (7): exports, ./database/styles.css, ./presets/article, ./styles.css, default, import, types

### Community 102 - "selection-anchor.ts"
Cohesion: 0.29
Nodes (3): Position, selectionCommentAnchor(), SelectionState

### Community 103 - "DocumentRenderer.stories.tsx"
Cohesion: 0.29
Nodes (6): Dark, Light, meta, registry, sample, Story

### Community 104 - "e2e/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../tsconfig.test.json

### Community 106 - "SearchPanel.tsx"
Cohesion: 0.40
Nodes (3): SearchPanel(), SearchPanelProvider, SearchResult

### Community 107 - "./view"
Cohesion: 0.33
Nodes (6): exports, ./styles.css, ./view, default, import, types

### Community 108 - "@eslint/js"
Cohesion: 0.40
Nodes (4): @eslint/js@^10.0.1, typescript-eslint@^8.65.0, @eslint/js, typescript-eslint

### Community 110 - "SharedBlockControl.tsx"
Cohesion: 0.60
Nodes (3): SharedBlockControl(), Dialog(), DIALOG_KEYS

### Community 111 - "peerDependencies"
Cohesion: 0.40
Nodes (5): react, react-dom, peerDependencies, react@^18.3.0 || ^19.0.0, react-dom@^18.3.0 || ^19.0.0

### Community 114 - "@storybook/react-vite"
Cohesion: 0.50
Nodes (3): @storybook/react-vite@^8.6.14, @storybook/react-vite, config

### Community 115 - "./actions"
Cohesion: 0.50
Nodes (4): default, import, types, ./actions

### Community 116 - "./actions/react"
Cohesion: 0.50
Nodes (4): default, import, types, ./actions/react

### Community 117 - "./assets"
Cohesion: 0.50
Nodes (4): default, import, types, ./assets

### Community 118 - "./collaboration/browser"
Cohesion: 0.50
Nodes (4): default, import, types, ./collaboration/browser

### Community 119 - "./collaboration"
Cohesion: 0.50
Nodes (4): default, import, types, ./collaboration

### Community 120 - "./comments"
Cohesion: 0.50
Nodes (4): default, import, types, ./comments

### Community 121 - "./comments/react"
Cohesion: 0.50
Nodes (4): default, import, types, ./comments/react

### Community 122 - "./database"
Cohesion: 0.50
Nodes (4): default, import, types, ./database

### Community 123 - "./database/react"
Cohesion: 0.50
Nodes (4): default, import, types, ./database/react

### Community 124 - "./diagrams/react"
Cohesion: 0.50
Nodes (4): default, import, types, ./diagrams/react

### Community 125 - "./editor"
Cohesion: 0.50
Nodes (4): default, import, types, ./editor

### Community 126 - "./editor/react/collaboration"
Cohesion: 0.50
Nodes (4): default, import, types, ./editor/react/collaboration

### Community 127 - "./editor/react"
Cohesion: 0.50
Nodes (4): default, import, types, ./editor/react

### Community 128 - "./import-export"
Cohesion: 0.50
Nodes (4): ./import-export, default, import, types

### Community 129 - "./import-export/docx"
Cohesion: 0.50
Nodes (4): ./import-export/docx, default, import, types

### Community 130 - "./import-export/react"
Cohesion: 0.50
Nodes (4): ./import-export/react, default, import, types

### Community 131 - "./legal"
Cohesion: 0.50
Nodes (4): ./legal, default, import, types

### Community 132 - "./math"
Cohesion: 0.50
Nodes (4): ./math, default, import, types

### Community 133 - "./mobile"
Cohesion: 0.50
Nodes (4): ./mobile, default, import, types

### Community 134 - "./offline"
Cohesion: 0.50
Nodes (4): ./offline, default, import, types

### Community 135 - "./persistence/browser"
Cohesion: 0.50
Nodes (4): ./persistence/browser, default, import, types

### Community 136 - "./persistence/mongodb"
Cohesion: 0.50
Nodes (4): ./persistence/mongodb, default, import, types

### Community 137 - "./persistence/postgres"
Cohesion: 0.50
Nodes (4): ./persistence/postgres, default, import, types

### Community 138 - "./presets/legal"
Cohesion: 0.50
Nodes (4): ./presets/legal, default, import, types

### Community 139 - "./presets/workspace"
Cohesion: 0.50
Nodes (4): ./presets/workspace, default, import, types

### Community 140 - "./react"
Cohesion: 0.50
Nodes (4): ./react, default, import, types

### Community 141 - "./react/view"
Cohesion: 0.50
Nodes (4): ./react/view, default, import, types

### Community 142 - "./renderer/html"
Cohesion: 0.50
Nodes (4): ./renderer/html, default, import, types

### Community 143 - "./renderer/native"
Cohesion: 0.50
Nodes (4): ./renderer/native, default, import, types

### Community 144 - "./renderer/react"
Cohesion: 0.50
Nodes (4): ./renderer/react, default, import, types

### Community 145 - "./search-ai"
Cohesion: 0.50
Nodes (4): ./search-ai, default, import, types

### Community 146 - "./search-ai/react"
Cohesion: 0.50
Nodes (4): ./search-ai/react, default, import, types

### Community 147 - "./storage"
Cohesion: 0.50
Nodes (4): ./storage, default, import, types

### Community 148 - "./storage/browser"
Cohesion: 0.50
Nodes (4): ./storage/browser, default, import, types

### Community 149 - "./storage/react"
Cohesion: 0.50
Nodes (4): ./storage/react, default, import, types

### Community 150 - "./styles"
Cohesion: 0.50
Nodes (4): ./styles, default, import, types

### Community 151 - "./testing"
Cohesion: 0.50
Nodes (4): ./testing, default, import, types

### Community 152 - "./ui"
Cohesion: 0.50
Nodes (4): ./ui, default, import, types

### Community 153 - "./workspace"
Cohesion: 0.50
Nodes (4): ./workspace, default, import, types

### Community 154 - "./workspace/react"
Cohesion: 0.50
Nodes (4): ./workspace/react, default, import, types

### Community 155 - "repository"
Cohesion: 0.50
Nodes (4): repository, directory, type, url

### Community 156 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, clean, prepack

### Community 157 - "repository"
Cohesion: 0.50
Nodes (4): repository, directory, type, url

### Community 158 - "publishConfig"
Cohesion: 0.67
Nodes (3): publishConfig, access, registry

### Community 159 - "scripts"
Cohesion: 0.67
Nodes (3): scripts, build, prepack

## Knowledge Gaps
- **8 isolated node(s):** `../tsconfig.test.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `RFC-4122` (+3 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 811 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@storybook/react` connect `package.json` to `DocumentRenderer.stories.tsx`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `../tsconfig.test.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _8 weakly-connected nodes found - possible missing edges._
- **Should `docx/import.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06134371957156767 - nodes in this community are weakly interconnected._
- **Why does `exports` connect `exports` to `./import-export`, `./import-export/docx`, `./import-export/react`, `./legal`, `./math`, `./mobile`, `./offline`, `./persistence/browser`, `./persistence/mongodb`, `./persistence/postgres`, `./presets/legal`, `./presets/workspace`, `./react`, `./react/view`, `./renderer/html`, `./renderer/native`, `./renderer/react`, `./search-ai`, `./search-ai/react`, `./storage`, `./storage/browser`, `./storage/react`, `./styles`, `./testing`, `./ui`, `./workspace`, `./workspace/react`, `disnote/package.json`, `./actions`, `./actions/react`, `./assets`, `./collaboration/browser`, `./collaboration`, `./comments`, `./comments/react`, `./database`, `./database/react`, `./diagrams/react`, `./editor`, `./editor/react/collaboration`, `./editor/react`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `transformations/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05639097744360902 - nodes in this community are weakly interconnected._
- **Why does `mathlive` connect `MathEquationEditor.tsx` to `disnote/package.json`, `dependencies`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `BlockRegistry` be split into smaller, more focused modules?**
  _Cohesion score 0.057539682539682536 - nodes in this community are weakly interconnected._