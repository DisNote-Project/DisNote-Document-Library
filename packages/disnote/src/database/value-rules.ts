export const DATABASE_VALUE_RULES = {
  WEB_PROTOCOLS: new Set(["http:", "https:"]),
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s().-]{3,64}$/,
  DATE_ONLY: /^\d{4}-\d{2}-\d{2}$/,
} as const;
export function isDatabaseDate(value: string): boolean {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return false;
  return !DATABASE_VALUE_RULES.DATE_ONLY.test(value) || new Date(time).toISOString().slice(0, 10) === value;
}
export function isDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return DATABASE_VALUE_RULES.WEB_PROTOCOLS.has(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}
