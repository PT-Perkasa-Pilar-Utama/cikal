import { z } from "zod";
import { pageEnvelope } from "../common/envelope.js";
import { id } from "../common/scalars.js";

/** Pesan error checklist dokumen (api-specs 08 §8.11). */
export const DOCUMENT_CHECKLIST_MESSAGES = {
  noDocumentSelected: "Select at least one document",
  checklistExists: "Document checklist already exists for this combination",
} as const;

const paramId = z.string().trim().min(1).max(50);

export const documentChecklistItemInputSchema = z.object({
  documentType: paramId,
  isMandatory: z.boolean(),
});
export type DocumentChecklistItemInput = z.infer<typeof documentChecklistItemInputSchema>;

/** Daftar kosong dijawab `422 NO_DOCUMENT_SELECTED` oleh API, bukan oleh skema (AC-25.02). */
const items = z
  .array(documentChecklistItemInputSchema)
  .max(100)
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    list.forEach((item, index) => {
      if (seen.has(item.documentType)) {
        ctx.addIssue({ code: "custom", path: [index, "documentType"], message: "Document is selected twice" });
      }
      seen.add(item.documentType);
    });
  });

/** Body `POST /document-checklists` (api-specs 08 §8.11). */
export const documentChecklistCreateRequestSchema = z.object({
  productId: id,
  occupation: paramId,
  marital: paramId,
  items,
});
export type DocumentChecklistCreateRequest = z.infer<typeof documentChecklistCreateRequestSchema>;

/** Body `PUT /document-checklists/{id}` (api-specs 08 §8.12); kombinasi tidak berubah. */
export const documentChecklistUpdateRequestSchema = z.object({ items, isActive: z.boolean() });
export type DocumentChecklistUpdateRequest = z.infer<typeof documentChecklistUpdateRequestSchema>;

/**
 * `newData` ChangeRequest `DOCUMENT_CHECKLIST`: id yang disimpan beserta labelnya saat diajukan, agar halaman
 * "Pending Document Checklist" terbaca tanpa membaca General Parameter.
 */
export const documentChecklistDataSchema = z.object({
  productId: id,
  productName: z.string(),
  occupation: z.string(),
  occupationName: z.string(),
  marital: z.string(),
  maritalName: z.string(),
  items: z.array(documentChecklistItemInputSchema.extend({ documentName: z.string() })),
  isActive: z.boolean(),
});
export type DocumentChecklistData = z.infer<typeof documentChecklistDataSchema>;

/** Query `GET /document-checklists` (api-specs 08 §8.12). */
export const documentChecklistListQuerySchema = z.object({
  productId: id.optional(),
  occupation: paramId.optional(),
  marital: paramId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type DocumentChecklistListQuery = z.infer<typeof documentChecklistListQuerySchema>;

const labelled = z.object({ paramId: z.string(), paramValue: z.string() });

export const documentChecklistListItemSchema = z.object({
  id,
  product: z.object({ id, productCode: z.string(), productName: z.string() }),
  occupation: labelled,
  marital: labelled,
  items: z.array(z.object({ documentType: z.string(), documentName: z.string(), isMandatory: z.boolean() })),
  isActive: z.boolean(),
  hasPendingChange: z.boolean(),
});
export type DocumentChecklistListItem = z.infer<typeof documentChecklistListItemSchema>;

export const documentChecklistListResponseSchema = pageEnvelope(documentChecklistListItemSchema);
export type DocumentChecklistListResponse = z.infer<typeof documentChecklistListResponseSchema>;
