import { Module } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../../../platform/config/config.js";
import { GotenbergPdfConverter } from "./adapters/gotenberg-pdf-converter.js";
import { DocumentFiles } from "./application/document-files.js";
import { FileAccessRegistry } from "./application/file-access-registry.js";
import { GetDownloadUrlUseCase } from "./application/get-download-url.use-case.js";
import { DocumentFilesRepository } from "./db/document-files.repository.js";
import { FilesController } from "./http/files.controller.js";
import { PDF_CONVERTER_PORT } from "./ports/pdf-converter.port.js";

/** Document: file, template, generate PDF, penomoran dokumen (technical-specs 05 §5.9). */
@Module({
  controllers: [FilesController],
  providers: [
    {
      provide: PDF_CONVERTER_PORT,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new GotenbergPdfConverter(config.gotenbergUrl),
    },
    DocumentFilesRepository,
    DocumentFiles,
    FileAccessRegistry,
    GetDownloadUrlUseCase,
  ],
  exports: [DocumentFiles, FileAccessRegistry],
})
export class DocumentModule {}
