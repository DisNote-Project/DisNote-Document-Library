# nextjs-demo

Shows the landing-page integration from the guideline (section 18):

```
Next.js route → Content API → published DisNoteDocument
  → validate + migrate → renderer-html → metadata → cache by revision
```

`app/[slug]/page.tsx` is a server component that fetches a published revision,
validates and migrates it, renders safe HTML with `@disnote/renderer-html`, and
sets metadata. No editor bundle loads on the read-only page. `lib/content.ts`
stubs the Content API so the demo runs without a backend.
