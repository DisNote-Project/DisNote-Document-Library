import { createHmac, timingSafeEqual } from "node:crypto";

export interface CollaborationClaims {
  sub: string;
  documents: string[];
  exp: number;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createCollaborationToken(
  claims: CollaborationClaims,
  secret: string,
): string {
  const payload = encode(JSON.stringify(claims));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyCollaborationToken(
  token: string,
  documentId: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): CollaborationClaims | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = sign(payload, secret);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    return null;
  }
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CollaborationClaims;
    if (
      typeof claims.sub !== "string" ||
      !Array.isArray(claims.documents) ||
      typeof claims.exp !== "number" ||
      claims.exp <= nowSeconds ||
      !claims.documents.includes(documentId)
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
