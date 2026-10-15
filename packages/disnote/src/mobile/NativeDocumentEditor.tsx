import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { safeUrl, type DisNoteDocument } from "../core/index.js";
import { MOBILE_BRIDGE, mobileCommandScript, parseMobileEditorMessage } from "./bridge.js";
export interface NativeWebViewHandle { injectJavaScript(script: string): void }
export interface NativeWebViewProps {
  ref: (value: NativeWebViewHandle | null) => void;
  source: { uri: string };
  onMessage: (event: { nativeEvent: { data: string } }) => void;
  onShouldStartLoadWithRequest: (request: { url: string }) => boolean;
  javaScriptEnabled: boolean;
  style?: unknown;
}
/** Inject the host's react-native-webview component; no native dependency in core. */
export function NativeDocumentEditor({ WebView, uri, document, editable = true, locale = "en", onDocumentChange, onError, style }: { WebView: ComponentType<NativeWebViewProps>; uri: string; document: DisNoteDocument; editable?: boolean; locale?: string; onDocumentChange: (document: DisNoteDocument) => void; onError?: (error: unknown) => void; style?: unknown }): ReactNode {
  const view = useRef<NativeWebViewHandle | null>(null), ready = useRef(false);
  const trusted = safeUrl(uri, { allowedSchemes: ["https:"] });
  useEffect(() => { ready.current = false; }, [uri, document.id]);
  useEffect(() => { if (ready.current) view.current?.injectJavaScript(mobileCommandScript({ version: MOBILE_BRIDGE.VERSION, kind: MOBILE_BRIDGE.EDITABLE, editable })); }, [editable]);
  if (!trusted) throw new Error(MOBILE_BRIDGE.INVALID);
  return <WebView ref={value => { view.current = value; }} source={{ uri: trusted }} javaScriptEnabled style={style}
    onShouldStartLoadWithRequest={request => request.url === trusted}
    onMessage={event => {
      try {
        const message = parseMobileEditorMessage(event.nativeEvent.data);
        if (message.kind === MOBILE_BRIDGE.READY) {
          ready.current = true;
          view.current?.injectJavaScript(mobileCommandScript({ version: MOBILE_BRIDGE.VERSION, kind: MOBILE_BRIDGE.INITIALIZE, document, editable, locale }));
        } else if (ready.current && editable && message.document.id === document.id) onDocumentChange(message.document);
      } catch (error) { onError?.(error); }
    }} />;
}
