import { useRef } from "react";
import { DATABASE_DAY_MS } from "../dates.js";
import { useDatabaseMessages } from "./customization.js";
export function TimelineItem({ start, end, minimum, span, label, disabled, locale, onMove }: { start: number; end: number; minimum: number; span: number; label: string; disabled: boolean; locale?: string; onMove(date: string): void }) {
  const pointer = useRef<{ x: number; width: number } | null>(null), m = useDatabaseMessages(locale);
  const move = (days: number) => { if (days) onMove(new Date(start + days * DATABASE_DAY_MS).toISOString().slice(0, 10)); };
  return <div className="disnote-db__timeline-item"><label>{m.calendar}<input type="date" aria-label={`${m.calendar}: ${label}`} value={new Date(start).toISOString().slice(0, 10)} disabled={disabled} onChange={event => { if (event.target.value) onMove(event.target.value); }} /></label>
    <div className="disnote-db__timeline-rail"><button type="button" className="disnote-db__timeline-bar" disabled={disabled} aria-label={`${m.moveDate}: ${label}`} style={{ marginLeft: `${(start - minimum) / span * 90}%`, width: `${Math.max(5, (Math.max(start, end) - start) / span * 90)}%` }}
      onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); } }}
      onPointerDown={event => { pointer.current = { x: event.clientX, width: event.currentTarget.parentElement!.clientWidth }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerCancel={() => { pointer.current = null; }}
      onPointerUp={event => { const from = pointer.current; pointer.current = null; if (from) move(Math.round((event.clientX - from.x) / Math.max(1, from.width * .9) * span / DATABASE_DAY_MS)); }}>
      {label}
    </button></div>
  </div>;
}
