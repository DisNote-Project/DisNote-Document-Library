# Security

## Untrusted sources

Imported HTML, Markdown, pasted content, external URLs, uploaded files, custom
block props, API clients, and old documents in the database are all untrusted.

## Validation layers

```
client convenience → API DTO → document schema → block props → render policy
```

Client validation never replaces server validation.

## URL policy

Allow `https:`, `mailto:` (and `http:` only if explicitly configured in dev).
Deny by default: `javascript:`, `vbscript:`, `file:`, and `data:` except a
specific image policy.

## HTML policy

- No raw executable HTML block in V1.
- Sanitize imported HTML; HTML renderer escapes text by default.
- Embeds use a provider allowlist.

## Reporting

Report vulnerabilities privately to the maintainers before public disclosure.
