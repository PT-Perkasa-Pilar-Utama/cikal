import type { FileDownloadUrlResponse } from "./files.schema.js";

/** Pratinjau KTP yang diunggah sebagai "ktp.jpg" (api-specs 10 §10.1). */
export const fileDownloadUrlResponseMock = {
  data: {
    url: "http://localhost:9000/cikal-dev/tenants/0192b6a0-0001-7000-8000-000000000001/document/0192b6e0-0001-7000-8000-000000000001?X-Amz-Expires=300&X-Amz-Signature=mock",
    expiresAt: "2026-10-21T08:20:00.000Z",
    fileName: "ktp.pdf",
    contentType: "application/pdf",
    sizeBytes: 819200,
  },
} satisfies FileDownloadUrlResponse;
