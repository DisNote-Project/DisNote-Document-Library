/** Detect a file's real MIME type from its leading bytes (magic numbers). */

interface Signature {
  mime: string;
  bytes: number[];
  offset?: number;
  mask?: (bytes: Uint8Array) => boolean;
}

const SIGNATURES: Signature[] = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  {
    mime: "image/webp",
    bytes: [0x52, 0x49, 0x46, 0x46],
    mask: (b) => b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export function detectMimeType(bytes: Uint8Array): string | null {
  for (const sig of SIGNATURES) {
    const offset = sig.offset ?? 0;
    let matches = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (bytes[offset + i] !== sig.bytes[i]) {
        matches = false;
        break;
      }
    }
    if (matches && (!sig.mask || sig.mask(bytes))) return sig.mime;
  }
  return null;
}
