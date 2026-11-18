export function escapeXml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

export function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, "\"")
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, "&");
}

export function attribute(xml: string, name: string): string | undefined {
  const match = new RegExp(`${name}="([^"]*)"`, "u").exec(xml);
  return match ? unescapeXml(match[1]!) : undefined;
}

export function elements(xml: string, qualifiedName: string): string[] {
  const escaped = qualifiedName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return [...xml.matchAll(new RegExp(`<${escaped}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${escaped}>`, "gu"))].map(
    (match) => match[0],
  );
}

export function textNodes(xml: string): string {
  const text = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gu)]
    .map((match) => unescapeXml(match[1]!))
    .join("");
  return text.replace(/<w:tab\s*\/>/gu, "\t").replace(/<w:br\s*\/>/gu, "\n");
}
