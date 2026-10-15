import { useContext, useEffect, useState, type ReactNode } from "react";
import { safeUrl } from "../../core/index.js";
import { uiMessages } from "../../ui/messages.js";
import { WorkspaceViewContext } from "./context.js";
export function WorkspaceBreadcrumb({ locale = "en" }: { locale?: string }): ReactNode {
  const provider = useContext(WorkspaceViewContext), m = uiMessages(locale), [items, setItems] = useState<{ id: string; title: string; href?: string }[]>([]);
  useEffect(() => { let active = true; const reload = () => { void provider?.breadcrumbs().then(value => { if (active) setItems(value); }, () => { if (active) setItems([]); }); }; reload(); const unsubscribe = provider?.subscribe?.(reload); return () => { active = false; unsubscribe?.(); }; }, [provider]);
  return <nav aria-label={m.breadcrumb}>{items.length ? items.map((item, index) => { const href = item.href ? safeUrl(item.href, { allowedSchemes: ["https:", "http:"], allowRelative: true }) : null; return <span key={item.id}>{index ? " / " : ""}{href ? <a href={href}>{item.title}</a> : item.title}</span>; }) : m.unavailable}</nav>;
}
