export interface UrlPolicy {
  /** Schemes allowed for absolute URLs. */
  allowedSchemes?: readonly string[];
  /** Whether relative URLs such as `/docs/1`, `#section` and `?q=x` are allowed. */
  allowRelative?: boolean;
}

const DEFAULT_SCHEMES = ["https:", "mailto:", "tel:"] as const;
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

function containsControlOrWhitespace(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint <= 0x1f || codePoint === 0x7f || /\s/u.test(character);
  });
}

function normalizeScheme(value: string): string {
  const lower = value.toLowerCase();
  return lower.endsWith(":") ? lower : `${lower}:`;
}

/**
 * Return a normalized safe URL or `null`.
 *
 * This deliberately uses an allow-list. Escaping a URL for HTML is not enough:
 * values such as `javascript:alert(1)` are valid escaped strings but unsafe
 * navigation targets.
 */
export function safeUrl(value: string, policy: UrlPolicy = {}): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0 || containsControlOrWhitespace(trimmed)) return null;

  const match = SCHEME.exec(trimmed);
  if (!match) return policy.allowRelative === false ? null : trimmed;

  const allowed = new Set(
    (policy.allowedSchemes ?? DEFAULT_SCHEMES).map(normalizeScheme),
  );
  return allowed.has(normalizeScheme(match[1]!)) ? trimmed : null;
}

export function isSafeUrl(value: string, policy: UrlPolicy = {}): boolean {
  return safeUrl(value, policy) !== null;
}

const COLOR_TOKEN = /^[#a-zA-Z0-9(),.%\s-]+$/;

/** Only allow compact CSS color tokens/values for inline color marks. */
export function safeColor(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 64) return null;
  return COLOR_TOKEN.test(normalized) ? normalized : null;
}
