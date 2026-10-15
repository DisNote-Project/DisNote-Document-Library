import { createId, type DisNoteBlock } from "../core/index.js";
export const ACTION_BLOCK_PROPERTIES = { ID: "actionId" } as const;
export function actionButtonBlock(actionId: string, label: string): DisNoteBlock { return { id: createId(), type: "templateButton", version: 1, props: { actionId, label } }; }
