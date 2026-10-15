import { validateDocument, type DisNoteDocument } from "../core/index.js";
export const MOBILE_BRIDGE = { VERSION: 1, READY: "ready", DOCUMENT: "document", INITIALIZE: "initialize", EDITABLE: "editable", INVALID: "invalid-mobile-editor-message", MAX_BYTES: 5_000_000 } as const;
export type MobileEditorMessage =
  | { version: 1; kind: "ready" }
  | { version: 1; kind: "document"; document: DisNoteDocument };
export type MobileEditorCommand =
  | { version: 1; kind: "initialize"; document: DisNoteDocument; editable: boolean; locale: string }
  | { version: 1; kind: "editable"; editable: boolean };
export function parseMobileEditorMessage(data: string): MobileEditorMessage {
  if (data.length > MOBILE_BRIDGE.MAX_BYTES) throw new Error(MOBILE_BRIDGE.INVALID);
  const message = JSON.parse(data) as MobileEditorMessage;
  if (!message || typeof message !== "object" || message.version !== MOBILE_BRIDGE.VERSION || (message.kind !== MOBILE_BRIDGE.READY && message.kind !== MOBILE_BRIDGE.DOCUMENT)) throw new Error(MOBILE_BRIDGE.INVALID);
  if (message.kind === MOBILE_BRIDGE.DOCUMENT && !validateDocument(message.document).ok) throw new Error(MOBILE_BRIDGE.INVALID);
  return message;
}
/** JSON stays data, including quotes, script tags and Unicode line separators. */
export function mobileCommandScript(command: MobileEditorCommand): string {
  const data = JSON.stringify(JSON.stringify(command)).replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  return `window.dispatchEvent(new MessageEvent('message',{data:${data}}));true;`;
}
