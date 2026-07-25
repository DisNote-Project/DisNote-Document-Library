import { useState, type ReactElement } from "react";
import type { I18n } from "../i18n/dictionary.js";

const UNSAFE_SCHEME = /^\s*(javascript|vbscript|file|data):/i;

export interface LinkEditorProps {
  i18n: I18n;
  initialHref?: string;
  onApply(href: string): void;
  onCancel?(): void;
}

/** A tiny link editor that refuses unsafe URL schemes. */
export function LinkEditor({ i18n, initialHref = "", onApply, onCancel }: LinkEditorProps): ReactElement {
  const [href, setHref] = useState(initialHref);
  const invalid = href.length > 0 && UNSAFE_SCHEME.test(href);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid && href) onApply(href);
      }}
      style={{ display: "flex", gap: 4, alignItems: "center" }}
    >
      <input
        type="url"
        value={href}
        onChange={(e) => setHref(e.target.value)}
        placeholder={i18n.t("link.enterUrl")}
        aria-label={i18n.t("link.enterUrl")}
        aria-invalid={invalid}
        style={{ padding: "4px 8px", border: "1px solid #e0e4e4", borderRadius: 6 }}
      />
      <button type="submit" disabled={invalid || !href}>
        {i18n.t("link.apply")}
      </button>
      {onCancel ? (
        <button type="button" onClick={onCancel}>
          ✕
        </button>
      ) : null}
      {invalid ? (
        <span role="alert" style={{ color: "#dc2626" }}>
          unsafe URL
        </span>
      ) : null}
    </form>
  );
}
