/**
 * Public content API (read-only, published revisions only).
 * Reference NestJS integration — requires @nestjs/common at build time.
 * Guideline section 18.3.
 */
import { Controller, Get, Param, Query, NotFoundException } from "@nestjs/common";
import { ContentApplicationService } from "@disnote/legal-content";

@Controller("api/content")
export class ContentController {
  constructor(private readonly content: ContentApplicationService) {}

  @Get("documents/:slug")
  async getDocument(@Param("slug") slug: string, @Query("locale") locale = "en") {
    const result = await this.content.getPublished(slug, locale);
    if (!result.ok) throw new NotFoundException("content unavailable");
    if (!result.value) throw new NotFoundException("not found");
    return {
      slug,
      locale,
      title: result.value.revision.document.metadata.title,
      document: result.value.revision.document, // published DisNoteDocument JSON
      revision: result.value.revision.revision,
    };
  }
}
