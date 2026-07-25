import type { MetadataRoute } from "next";

/**
 * Sitemap for published content. In production this queries the Content API for
 * every published slug + locale. Archived documents are excluded (they return
 * null from getPublished and must not appear here).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const published: Array<{ slug: string; updatedAt: string }> = [
    { slug: "privacy", updatedAt: "2026-01-01T00:00:00.000Z" },
  ];
  return published.map((p) => ({
    url: `https://disnote.dev/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
}
