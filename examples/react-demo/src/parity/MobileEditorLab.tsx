import React, { useCallback, useState } from "react";
import { MobileEditorBridge } from "@disnote/core/editor/react";
export function MobileEditorLab(): JSX.Element {
  const [message, setMessage] = useState("");
  const postMessage = useCallback((value: string) => {
    const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (data: string) => void } }).ReactNativeWebView;
    bridge?.postMessage(value); setMessage(value);
  }, []);
  return <main style={{ padding: 12 }}><MobileEditorBridge postMessage={postMessage} /><pre data-testid="mobile-output" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message}</pre></main>;
}
