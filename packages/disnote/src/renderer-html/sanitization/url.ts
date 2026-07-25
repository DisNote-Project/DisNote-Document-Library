export interface LinkPolicy {
  /** Schemes allowed for links. Default: https, mailto. */
  allowedSchemes?: string[];
  /** When true, http: is also allowed (development). */
  allowHttp?: boolean;
}

const DEFAULT_SCHEMES = ["https:", "mailto:"];

/** Returns a safe href, or null if the URL should be dropped. */
export function safeHref(href: string, policy: LinkPolicy = {}): string | null {
  const trimmed = href.trim();
  const allowed = new Set(policy.allowedSchemes ?? DEFAULT_SCHEMES);
  if (policy.allowHttp) allowed.add("http:");

  // Relative URLs (no scheme) are allowed.
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (!schemeMatch) return trimmed;

  const scheme = schemeMatch[1]!.toLowerCase() + ":";
  return allowed.has(scheme) ? trimmed : null;
}

const COLOR_TOKEN = /^[#a-zA-Z0-9(),.%\s-]+$/;

/** Only allow simple color tokens/values for inline color marks. */
export function safeColor(value: string): string | null {
  const v = value.trim();
  if (v.length > 64) return null;
  return COLOR_TOKEN.test(v) ? v : null;
}
