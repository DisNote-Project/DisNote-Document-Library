import React, { useCallback, useMemo, useState } from "react";
import { MobileEditorBridge } from "@disnote/core/editor/react";
export function MobileEditorLab(): JSX.Element {
  const [message, setMessage] = useState("");
  const parentOrigin = (() => { try { return document.referrer ? new URL(document.referrer).origin : ""; } catch { return ""; } })();
  const allowedHostOrigins = useMemo(() => [window.location.origin], []);
  const postMessage = useCallback((value: string) => {
    const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (data: string) => void } }).ReactNativeWebView;
    if (bridge) bridge.postMessage(value);
    else if (window.parent !== window && parentOrigin === window.location.origin) window.parent.postMessage(value, parentOrigin);
    setMessage(value);
  }, [parentOrigin]);
  return <main style={{ padding: 12 }}><MobileEditorBridge postMessage={postMessage} allowedHostOrigins={allowedHostOrigins} /><pre data-testid="mobile-output" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message}</pre></main>;
}
