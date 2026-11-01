import { useState } from "react";
import { DiagramView } from "../../diagrams/DiagramView.js";
import { type DiagramFormat } from "../../diagrams/model.js";
import { uiMessages } from "../../ui/messages.js";
export function DiagramEditor({ code, format, locale, editable, onChange }: { code: string; format: DiagramFormat; locale?: string; editable: boolean; onChange(code: string): void }) {
  const messages = uiMessages(locale), [editing, setEditing] = useState(false);
  return <section className="disnote-diagram-editor" contentEditable={false}>
    <header><strong>{messages[format]}</strong>{editable && <button type="button" aria-expanded={editing} onClick={() => setEditing(!editing)}>{messages.diagramCode}</button>}</header>
    {editing && <textarea aria-label={messages.diagramCode} value={code} spellCheck={false} onChange={event => onChange(event.target.value)} />}
    <DiagramView code={code} format={format} locale={locale} />
  </section>;
}
