import {
  applicationSectionInputSchema,
  emergencyContactSectionInputSchema,
  occupationSectionInputSchema,
  personalSectionInputSchema,
  type SectionSaveResponse,
  sectionSaveQuerySchema,
} from "@cikal/contracts";
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Put, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { SaveApplicationSectionUseCase } from "../application/save-application-section.use-case.js";
import { SaveEmergencyContactSectionUseCase } from "../application/save-emergency-contact-section.use-case.js";
import { SaveOccupationSectionUseCase } from "../application/save-occupation-section.use-case.js";
import { SavePersonalSectionUseCase } from "../application/save-personal-section.use-case.js";

class SectionSaveQueryDto extends createZodDto(sectionSaveQuerySchema) {}
class ApplicationSectionDto extends createZodDto(applicationSectionInputSchema) {}
class PersonalSectionDto extends createZodDto(personalSectionInputSchema) {}
class OccupationSectionDto extends createZodDto(occupationSectionInputSchema) {}
class EmergencyContactSectionDto extends createZodDto(emergencyContactSectionInputSchema) {}

/** Simpan section form pengajuan, "Next" (`strict=true`) atau "Save as Draft" (api-specs 12 §12.3). */
@Controller("v1/applications/:id/sections")
export class ApplicationSectionsController {
  constructor(
    private readonly application: SaveApplicationSectionUseCase,
    private readonly personal: SavePersonalSectionUseCase,
    private readonly occupation: SaveOccupationSectionUseCase,
    private readonly emergencyContact: SaveEmergencyContactSectionUseCase,
  ) {}

  @Put("application")
  @HttpCode(200)
  @Requires("APP-ENTRY", "UPDATE")
  saveApplication(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: SectionSaveQueryDto,
    @Body() body: ApplicationSectionDto,
  ): Promise<SectionSaveResponse> {
    return this.application.execute(ctx, id, body, query.strict);
  }

  @Put("personal")
  @HttpCode(200)
  @Requires("APP-ENTRY", "UPDATE")
  savePersonal(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: SectionSaveQueryDto,
    @Body() body: PersonalSectionDto,
  ): Promise<SectionSaveResponse> {
    return this.personal.execute(ctx, id, body, query.strict);
  }

  @Put("occupation")
  @HttpCode(200)
  @Requires("APP-ENTRY", "UPDATE")
  saveOccupation(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: SectionSaveQueryDto,
    @Body() body: OccupationSectionDto,
  ): Promise<SectionSaveResponse> {
    return this.occupation.execute(ctx, id, body, query.strict);
  }

  @Put("emergency-contact")
  @HttpCode(200)
  @Requires("APP-ENTRY", "UPDATE")
  saveEmergencyContact(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: SectionSaveQueryDto,
    @Body() body: EmergencyContactSectionDto,
  ): Promise<SectionSaveResponse> {
    return this.emergencyContact.execute(ctx, id, body, query.strict);
  }

  /** Section Backlog (Spouse, Business, Collateral) dan nama section lain belum tersedia: `404 NOT_FOUND`. */
  @Put(":section")
  @Requires("APP-ENTRY", "UPDATE")
  unavailable(): never {
    throw DomainError.standard("NOT_FOUND");
  }
}
