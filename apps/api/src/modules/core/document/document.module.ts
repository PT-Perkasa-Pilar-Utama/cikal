import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../../../platform/config/config.js";
import { CHANGE_REQUEST_PORT } from "../../../platform/http/change-request-port.js";
import type { ChangeRequestPort } from "../change-request/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { GotenbergPdfConverter } from "./adapters/gotenberg-pdf-converter.js";
import { DocumentFiles } from "./application/document-files.js";
import { DocumentGenerator } from "./application/document-generator.js";
import { DocumentNumbering } from "./application/document-numbering.js";
import { FileAccessRegistry } from "./application/file-access-registry.js";
import { GetDownloadUrlUseCase } from "./application/get-download-url.use-case.js";
import { ListNumberFormatsUseCase } from "./application/list-number-formats.use-case.js";
import { NumberFormatActivation } from "./application/number-format-activation.js";
import { NumberFormatChangeHandler } from "./application/number-format-change-handler.js";
import { NumberPreview } from "./application/number-preview.js";
import { PreviewNumberUseCase } from "./application/preview-number.use-case.js";
import { RequestNumberFormatUpdateUseCase } from "./application/request-number-format-update.use-case.js";
import { DocumentFilesRepository } from "./db/document-files.repository.js";
import { DocumentNumberCountersRepository } from "./db/document-number-counters.repository.js";
import { DocumentNumberFormatsRepository } from "./db/document-number-formats.repository.js";
import { DocumentTemplatesRepository } from "./db/document-templates.repository.js";
import { DocumentNumberFormatsController } from "./http/document-number-formats.controller.js";
import { FilesController } from "./http/files.controller.js";
import { NumberFormatActivationJob } from "./jobs/number-format-activation.job.js";
import { PDF_CONVERTER_PORT } from "./ports/pdf-converter.port.js";

/** Document: file, template, generate PDF, penomoran dokumen (technical-specs 05 §5.9). */
@Module({
  imports: [TenancyModule],
  controllers: [FilesController, DocumentNumberFormatsController],
  providers: [
    {
      provide: PDF_CONVERTER_PORT,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new GotenbergPdfConverter(config.gotenbergUrl),
    },
    DocumentFilesRepository,
    DocumentTemplatesRepository,
    DocumentFiles,
    DocumentGenerator,
    FileAccessRegistry,
    GetDownloadUrlUseCase,
    DocumentNumberFormatsRepository,
    DocumentNumberCountersRepository,
    DocumentNumbering,
    NumberPreview,
    NumberFormatActivation,
    NumberFormatActivationJob,
    NumberFormatChangeHandler,
    ListNumberFormatsUseCase,
    PreviewNumberUseCase,
    RequestNumberFormatUpdateUseCase,
  ],
  exports: [DocumentFiles, DocumentGenerator, DocumentNumbering, FileAccessRegistry],
})
export class DocumentModule implements OnModuleInit {
  constructor(
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
    private readonly numberFormatHandler: NumberFormatChangeHandler,
  ) {}

  /** `registerEntity` untuk `DOCUMENT_NUMBER_FORMAT` (technical-specs 05 §5.6). */
  onModuleInit(): void {
    this.changeRequests.register(this.numberFormatHandler);
  }
}
