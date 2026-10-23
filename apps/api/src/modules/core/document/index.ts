export { DocumentFiles, type StoredFile } from "./application/document-files.js";
export { type FileAccessPolicy, FileAccessRegistry } from "./application/file-access-registry.js";
/** Hanya untuk foreign key modul lain (XM-05); modul lain tidak membaca tabel ini (XM-02). */
export { documentFiles } from "./db/schema.js";
export { documentData } from "./document.data.js";
export { DocumentModule } from "./document.module.js";
export type { UploadCandidate } from "./domain/upload-rules.js";
