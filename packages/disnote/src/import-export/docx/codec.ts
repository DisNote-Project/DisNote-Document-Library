import { DOCX_ERRORS } from "./constants.js";
import type { DocxBlockCodec } from "./model.js";

/** Map extension codecs by block type, validating uniqueness. */
export function codecMap(
  codecs: readonly DocxBlockCodec[] | undefined,
): Map<string, DocxBlockCodec> {
  const result = new Map<string, DocxBlockCodec>();
  for (const codec of codecs ?? []) {
    if (!codec.blockType || result.has(codec.blockType)) {
      throw new Error(DOCX_ERRORS.EXTENSION_CODEC_INVALID);
    }
    result.set(codec.blockType, codec);
  }
  return result;
}
