import {
  type ApplicationVerificationResponse,
  applicationVerificationResponseMock,
  fileDownloadUrlResponseMock,
  type SessionResponse,
  sessionResponseMock,
  type TaskItem,
  type TaskListResponse,
  taskListResponseMock,
  type VerificationDocument,
} from "@cikal/contracts";
import type { ApiRoutes, StubResponse } from "./render-app";

export const APPLICATION_ID = applicationVerificationResponseMock.data.applicationId;
export const VERIFICATION_PATH = `/operations/verification/${APPLICATION_ID}`;
export const VERIFICATION_KEY = `/api/v1/applications/${APPLICATION_ID}/verification`;
export const TASKS_KEY = "GET /api/v1/tasks?queueCode=VERIFICATION&page=1";

/** Sesi Verifikator: Verification View dan Update (api-specs 01 §1.11). */
export const verifierSession: StubResponse = {
  status: 200,
  body: {
    data: {
      ...sessionResponseMock.data,
      menus: [
        {
          menuCode: "OPS",
          menuName: "Operations",
          link: null,
          iconName: "briefcase",
          actions: ["VIEW"],
          children: [
            {
              menuCode: "OPS-VERIFICATION",
              menuName: "Verification",
              link: "/operations/verification",
              iconName: "clipboard-check",
              actions: ["VIEW", "UPDATE"],
              children: [],
            },
          ],
        },
      ],
    },
  } satisfies SessionResponse,
};

/** Tujuh dokumen wajib terunggah, semuanya belum diperiksa (AC-64.01). */
const SEVEN_DOCUMENTS: [string, string][] = [
  ["KTP", "KTP"],
  ["KK", "Kartu Keluarga"],
  ["NPWP", "NPWP"],
  ["SLIP_GAJI", "Slip Gaji"],
  ["REKENING_KORAN", "Rekening Koran"],
  ["SURAT_KETERANGAN_KERJA", "Surat Keterangan Kerja"],
  ["PBB", "PBB"],
];

export const DOCUMENT_TYPES = SEVEN_DOCUMENTS.map(([documentType]) => documentType);

const pendingDocuments: VerificationDocument[] = SEVEN_DOCUMENTS.map(([documentType, label], index) => ({
  documentType,
  label,
  isMandatory: true,
  fileId: `0192b6d2-000${index + 1}-7000-8000-000000000001`,
  verificationStatus: "PENDING",
  remarks: null,
}));

/** Tujuh dokumen dengan status tersimpan per `documentType`. */
export function documentsWith(saved: Record<string, Partial<VerificationDocument>>): VerificationDocument[] {
  return pendingDocuments.map((document) => ({ ...document, ...saved[document.documentType] }));
}

export function verificationOf(overrides: Partial<ApplicationVerificationResponse["data"]> = {}): StubResponse {
  return {
    status: 200,
    body: {
      data: { ...applicationVerificationResponseMock.data, documents: pendingDocuments, ...overrides },
    } satisfies ApplicationVerificationResponse,
  };
}

/** Tugas Verification "20102026KTA0000013" milik user sesi, dengan tombol Proceed (AC-58.01). */
export const ownTask: TaskItem = {
  ...(taskListResponseMock.data[0] as TaskItem),
  applicationId: APPLICATION_ID,
  status: "ASSIGNED",
  allowedActions: ["PROCEED", "RELEASE"],
};

export const taskPage = (tasks: TaskItem[]): TaskListResponse => ({
  data: tasks,
  meta: { page: 1, pageSize: 20, totalItems: tasks.length, totalPages: tasks.length ? 1 : 0 },
});

/** Rute API layar verifikasi; `extra` menambah atau mengganti respons. */
export function verificationRoutes(extra: ApiRoutes = {}): ApiRoutes {
  return {
    "GET /api/v1/auth/session": verifierSession,
    [`GET ${VERIFICATION_KEY}`]: verificationOf(),
    [`GET /api/v1/files/${pendingDocuments[0]?.fileId}/download-url`]: {
      status: 200,
      body: fileDownloadUrlResponseMock,
    },
    ...extra,
  };
}
