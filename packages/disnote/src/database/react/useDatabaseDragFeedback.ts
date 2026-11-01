import { useEffect, useRef, useState, type DragEvent } from "react";
import { DATABASE_DRAG } from "./database-ui.constants.js";

/** Presentation only: mutations and their revision checks stay in the view/domain. */
export function useDatabaseDragFeedback(databaseId: string) {
  const [source, setSource] = useState<string | null>(null), [target, setTarget] = useState<string | null>(null);
  const owned = useRef<string | null>(null), preview = useRef<HTMLElement | null>(null);
  const clear = () => { owned.current = null; setSource(null); setTarget(null); preview.current?.remove(); preview.current = null; };
  useEffect(() => {
    clear();
    const end = () => clear(), escape = (event: KeyboardEvent) => { if (event.key === "Escape") clear(); };
    document.addEventListener("dragend", end); document.addEventListener("drop", end); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("dragend", end); document.removeEventListener("drop", end); document.removeEventListener("keydown", escape); preview.current?.remove(); owned.current = null; };
  }, [databaseId]);
  const start = (event: DragEvent<HTMLElement>, recordId: string, label: string) => {
    clear();
    if ((event.target as HTMLElement).closest("button,input,select,textarea,a,[contenteditable=true]")) { event.preventDefault(); return; }
    owned.current = recordId; setSource(recordId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DATABASE_DRAG.RECORD, JSON.stringify({ databaseId, recordId }));
    const host = document.createElement("div"); host.className = "disnote-db disnote-db__drag-preview";
    host.setAttribute("aria-hidden", "true");
    // Keep the temporary image out of layout even when optional styles are omitted.
    Object.assign(host.style, { position: "fixed", left: "-10000px", top: "0", pointerEvents: "none" });
    const root = event.currentTarget.closest(".disnote-db"), computed = getComputedStyle(root ?? event.currentTarget);
    for (const token of ["--disnote-background", "--disnote-text", "--disnote-border", "--disnote-focus", "--disnote-radius", "--disnote-font-family", "--disnote-drag-accent", "--disnote-drag-surface", "--disnote-drag-shadow"]) host.style.setProperty(token, computed.getPropertyValue(token));
    const card = document.createElement("div"); card.className = "disnote-db__drag-preview-card";
    const grip = document.createElement("span"); grip.className = "disnote-db__drag-grip"; grip.setAttribute("aria-hidden", "true");
    const title = document.createElement("strong"); title.textContent = label;
    card.append(grip, title); host.append(card); document.body.append(host); preview.current = host;
    event.dataTransfer.setDragImage(card, 24, 22);
  };
  const over = (event: DragEvent<HTMLElement>, key: string) => {
    if (!owned.current || !event.dataTransfer.types.includes(DATABASE_DRAG.RECORD)) return;
    event.preventDefault(); event.dataTransfer.dropEffect = "move"; setTarget(key);
  };
  const leave = (event: DragEvent<HTMLElement>, key: string) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setTarget(current => current === key ? null : current);
  };
  return { source, target, start, clear, over, leave };
}
