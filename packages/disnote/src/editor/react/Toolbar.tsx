import type { ReactElement, ReactNode } from "react";
import type { I18n, EditorMessageKey } from "../i18n/dictionary.js";

export interface ToolbarAction {
  key: EditorMessageKey;
  active?: boolean;
  onToggle(): void;
  icon: ReactNode;
}

export interface ToolbarProps {
  i18n: I18n;
  actions: ToolbarAction[];
}

/**
 * Accessible formatting toolbar. Uses real <button> elements with accessible
 * names (tooltip text is never the only accessible name). Overflows on narrow
 * screens via horizontal scroll rather than clipping.
 */
export function Toolbar({ i18n, actions }: ToolbarProps): ReactElement {
  return (
    <div
      role="toolbar"
      aria-label={i18n.t("toolbar.formatting")}
      style={{ display: "flex", gap: 4, overflowX: "auto" }}
    >
      {actions.map((action) => {
        const label = i18n.t(action.key);
        return (
          <button
            key={action.key}
            type="button"
            aria-label={label}
            aria-pressed={action.active ?? false}
            title={label}
            onClick={action.onToggle}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 32,
              height: 32,
              border: "none",
              borderRadius: 6,
              background: action.active ? "var(--disnote-selection, #b8efe6)" : "transparent",
              cursor: "pointer",
            }}
          >
            {action.icon}
            <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
