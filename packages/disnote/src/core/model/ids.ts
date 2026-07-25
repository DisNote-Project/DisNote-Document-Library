/**
 * Stable block/document IDs. IDs must stay constant across moves and edits, and
 * be regenerated on clone. Never derive an ID from an array index.
 */

type RandomUuid = () => string;

let randomUuid: RandomUuid = defaultRandomUuid;

function defaultRandomUuid(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // RFC-4122 v4 fallback for environments without crypto.randomUUID.
  let out = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += "-";
    else if (i === 14) out += "4";
    else {
      const r = (Math.random() * 16) | 0;
      out += (i === 19 ? (r & 0x3) | 0x8 : r).toString(16);
    }
  }
  return out;
}

/** Override the ID generator (useful for deterministic tests). */
export function setIdGenerator(fn: RandomUuid): void {
  randomUuid = fn;
}

/** Generate a new unique block/document ID. */
export function createId(prefix = "blk"): string {
  return `${prefix}_${randomUuid()}`;
}

export function createDocumentId(): string {
  return createId("doc");
}
