# Collaboration and position-based comments

`DisNoteEditor` and the quick `DocumentEditor` facade accept
`onCommentAnchorChange(anchor)`. The callback returns the SDK `CommentAnchor`
union, keeping vendor selection positions out of the public contract:

```tsx
const [anchor, setAnchor] = useState<CommentAnchor>({ type: "document" });
<DocumentEditor initialDocument={document} onCommentAnchorChange={setAnchor} />
<CommentPanel documentId={document.id} revision={savedRevision}
  provider={comments} anchor={anchor}
  onClearAnchor={() => setAnchor({ type: "document" })} />
```

A selection within one text block produces UTF-16 offsets only when the editor's
text matches canonical SDK inline text exactly. A caret, cross-block selection or
non-text mismatch falls back to a block anchor; no matching block yields a document
anchor. Rich table/formula/embed substructures do not promise inline coordinates.
`CommentPanel` labels the selected scope and allows returning to whole-document
comments. Hosts must validate anchors against the authoritative saved revision.

The DisNote host flushes its collaborative projection before creating a selected
comment, supplies that resulting revision, and refuses stale positions server-side.
RecordPageDialog requires saving the document body before creating a comment.
Server-side block-ID/text bounds are checked independently from React.

Anchor remapping and document history share a host aggregate CAS. Insertions
directly before a quote shift its start/end; insertions directly after it do not
expand it. Interior insertions expand the range. Removed blocks and collapsed
quotes become orphaned. A conservative diff cannot reconstruct arbitrary authors'
semantic intent; it does not claim full editor-operation history mapping.

`EditorCollaborationProvider` supports awareness through an injected transport.
The authenticated DisNote HTTP transport publishes only its own client's state,
and forwards server-approved peer updates to the editor's cursor renderer. The
server binds each live client to a verified actor and collaboration generation,
rebuilds its user/color fields, validates cursor positions and checks current
resource access before returning peers. Expired/departed/revoked peers are removed.
This is ephemeral document presence, independent from account social presence.

Record comments use a durable outbox in the record aggregate. The host rechecks
database/row access before notification acceptance and again through the existing
notification recipient policy. Stable event IDs deduplicate delivery. Notifications
keep database/record scope so the product can reopen the correct record dialog.
Production delivery and native integration require their own runtime evidence.

Tests: SDK `test/comments/{selection-anchor,anchor-affinity}.test.ts`; host
`document-awareness-codec`, `document-collaboration-presence`,
`document-comment-anchor`, `document-record-page`, `document-comment-delivery` and
notification policy specs. Product browser `e2e/documents.spec.ts` covers selection,
remote cursors/offline convergence, saved comments/history and anchor movement.
Consult the queue ledger for the actual latest passing browser checkpoint.
