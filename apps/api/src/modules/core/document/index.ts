export { DocumentFiles, type StoredFile } from "./application/document-files.js";
export { DocumentGenerator, type GenerateDocument } from "./application/document-generator.js";
export { DocumentNumbering, type NumberScope } from "./application/document-numbering.js";
export { type FileAccessPolicy, FileAccessRegistry } from "./application/file-access-registry.js";
export { provisionNumberFormats } from "./application/number-format-provisioning.js";
/** Hanya untuk foreign key modul lain (XM-05); modul lain tidak membaca tabel ini (XM-02). */
export { documentFiles } from "./db/schema.js";
export { documentData } from "./document.data.js";
export { DocumentModule } from "./document.module.js";
export { akadDocumentCode, type TemplateData } from "./domain/document-template.js";
export type { UploadCandidate } from "./domain/upload-rules.js";
export { seedNumberFormatIds } from "./seed/dev-number-formats.js";
export { seedTemplateIds } from "./seed/qa-templates.js";
