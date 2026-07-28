import { safeColor, safeUrl } from "../../core/index.js";

export interface LinkPolicy {
  /** Schemes allowed for links. Default: https, mailto, tel. */
  allowedSchemes?: string[];
  /** When true, http: is also allowed (development). */
  allowHttp?: boolean;
  /** Defaults to true. */
  allowRelative?: boolean;
}

/** Backwards-compatible HTML-renderer alias for the shared URL policy. */
export function safeHref(href: string, policy: LinkPolicy = {}): string | null {
  const allowedSchemes = [...(policy.allowedSchemes ?? ["https:", "mailto:", "tel:"])];
  if (policy.allowHttp) allowedSchemes.push("http:");
  return safeUrl(href, {
    allowedSchemes,
    allowRelative: policy.allowRelative ?? true,
  });
}

export { safeColor };
