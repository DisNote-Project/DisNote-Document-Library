import { useMemo, useState, type ReactElement } from "react";
import type { DisNoteBlock } from "../../core/index.js";
import type { I18n } from "../i18n/dictionary.js";
import {
  defaultSlashCommands,
  filterSlashCommands,
  type SlashCommand,
} from "../slash-menu/commands.js";

export interface SlashMenuProps {
  i18n: I18n;
  query: string;
  commands?: SlashCommand[];
  onSelect(block: DisNoteBlock): void;
}

/**
 * Accessible slash menu. Uses a listbox with roving focus and announces the
 * result count for screen readers. Keyboard: ↑/↓ move, Enter selects.
 */
export function SlashMenu({
  i18n,
  query,
  commands = defaultSlashCommands,
  onSelect,
}: SlashMenuProps): ReactElement {
  const results = useMemo(
    () => filterSlashCommands(query, commands),
    [query, commands]
  );
  const [active, setActive] = useState(0);
  const clamped = Math.min(active, Math.max(0, results.length - 1));

  return (
    <div>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        {i18n.t("slash.results", { count: results.length })}
      </div>
      <ul
        role="listbox"
        aria-label={i18n.t("a11y.slashCommands")}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown")
            setActive((a) => Math.min(a + 1, results.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter") {
            const cmd = results[clamped];
            if (cmd) onSelect(cmd.create());
          }
        }}
        style={{ listStyle: "none", margin: 0, padding: 4, minWidth: 220 }}
      >
        {results.map((cmd, i) => (
          <li
            key={cmd.id}
            role="option"
            aria-selected={i === clamped}
            onMouseEnter={() => setActive(i)}
            onClick={() => onSelect(cmd.create())}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              background: i === clamped ? "#f0f0f0" : "transparent",
              cursor: "pointer",
            }}
          >
            {i18n.t(cmd.titleKey)}
          </li>
        ))}
        {results.length === 0 ? (
          <li style={{ padding: "6px 8px", color: "#5c6666" }}>
            {i18n.t("slash.noMatches")}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
