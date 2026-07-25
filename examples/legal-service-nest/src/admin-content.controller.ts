/**
 * Admin content API protected by ContentAdminGuard. Guideline section 18.4.
 * The controller is only an HTTP boundary; all rules live in the application service.
 */
import { Body, Controller, Get, Param, Patch, Post, BadRequestException, UseGuards } from "@nestjs/common";
import { ContentApplicationService } from "@disnote/legal-content";
import type { DisNoteDocument } from "@disnote/document-core";
import { ContentActor, ContentAdminGuard } from "./content-admin-auth.js";

interface CreateDto {
  slug: string;
  locale: string;
  kind: "LEGAL_POLICY" | "ARTICLE" | "PRODUCT_UPDATE" | "CHANGELOG" | "LANDING_PAGE";
  title: string;
  document: DisNoteDocument;
}

interface SaveDraftDto {
  expectedRevision: number;
  document: DisNoteDocument;
  idempotencyKey: string;
}

@Controller("api/admin/content/documents")
@UseGuards(ContentAdminGuard)
export class AdminContentController {
  constructor(private readonly content: ContentApplicationService) {}

  @Post()
  async create(@Body() dto: CreateDto, @ContentActor() actor: string) {
    const result = await this.content.createDraft({ ...dto, actor });
    if (!result.ok) throw new BadRequestException(result.error);
    return result.value;
  }

  @Patch(":id/draft")
  async saveDraft(@Param("id") id: string, @Body() dto: SaveDraftDto, @ContentActor() actor: string) {
    const result = await this.content.saveDraft({ documentId: id, actor, ...dto });
    if (!result.ok) throw new BadRequestException(result.error);
    return result.value;
  }

  @Post(":id/publish")
  async publish(@Param("id") id: string, @Body() body: { revision: number }, @ContentActor() actor: string) {
    const result = await this.content.publish({ documentId: id, revision: body.revision, actor });
    if (!result.ok) throw new BadRequestException(result.error);
    return result.value.stored;
  }

  @Post(":id/unpublish")
  unpublish(@Param("id") id: string, @ContentActor() actor: string) {
    return this.content.unpublish({ documentId: id, actor });
  }

  @Post(":id/archive")
  archive(@Param("id") id: string, @ContentActor() actor: string) {
    return this.content.archive({ documentId: id, actor });
  }

  @Get(":id/revisions")
  revisions(@Param("id") id: string) {
    return this.content.listRevisions(id);
  }
}
