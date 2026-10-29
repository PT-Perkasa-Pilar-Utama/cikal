import {
  type DisbursementDetail,
  type DisbursementDetailResponse,
  disbursementDetailResponseMock,
  type MenuCode,
  type QueueCode,
  type SessionMenu,
  type SessionResponse,
  sessionResponseMock,
  type TaskItem,
  type TaskListResponse,
  taskListResponseMock,
} from "@cikal/contracts";
import type { ApiRoutes, StubResponse, stubApi } from "./render-app";

export const APPLICATION_ID = disbursementDetailResponseMock.data.applicationId;
export const DETAIL_KEY = `GET /api/v1/applications/${APPLICATION_ID}/disbursement`;
export const tasksKey = (queueCode: QueueCode): string => `GET /api/v1/tasks?queueCode=${queueCode}&page=1`;

const menu = (menuCode: MenuCode, menuName: string, link: string): SessionMenu => ({
  menuCode,
  menuName,
  link,
  iconName: null,
  actions: ["VIEW", "UPDATE"],
  children: [],
});

/** Sesi Admin Operasional: Validity Check, Print Akad, dan Record Disbursement View dan Update (api-specs 01 §1.11). */
export const operationsSession: StubResponse = {
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
            menu("OPS-VALIDITY", "Validity Check", "/operations/validity"),
            menu("OPS-PRINT-AKAD", "Print Akad", "/operations/print-akad"),
            menu("OPS-DISBURSEMENT", "Record Disbursement", "/operations/disbursement"),
          ],
        },
      ],
    },
  } satisfies SessionResponse,
};

/** Tugas "20102026KPR0000041" di antrean `queueCode` yang dipegang user sesi. */
export function ownTask(queueCode: QueueCode): TaskListResponse {
  const task: TaskItem = {
    ...(taskListResponseMock.data[0] as TaskItem),
    queueCode,
    applicationId: APPLICATION_ID,
    loanId: "20102026KPR0000041",
    status: "ASSIGNED",
    allowedActions: ["PROCEED", "RELEASE"],
  };
  return { data: [task], meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } };
}

export const emptyQueue: TaskListResponse = { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };

export const detailOf = (detail: Partial<DisbursementDetail> = {}): StubResponse => ({
  status: 200,
  body: { data: { ...disbursementDetailResponseMock.data, ...detail } } satisfies DisbursementDetailResponse,
});

export const errorOf = (status: number, code: string, message: string, details: object[] = []): StubResponse => ({
  status,
  body: { code, message, details, correlationId: "c-1" },
});

/** Rute API layar pencairan; `extra` menambah atau mengganti respons. */
export function disbursementRoutes(extra: ApiRoutes = {}): ApiRoutes {
  return { "GET /api/v1/auth/session": operationsSession, [DETAIL_KEY]: detailOf(), ...extra };
}

/** Body request `key` terakhir dan apakah request itu membawa `Idempotency-Key`. */
export function requestOf(fetch: ReturnType<typeof stubApi>, key: string): { body: unknown; idempotent: boolean } {
  const call = fetch.mock.calls.filter(([input, init]) => `${init?.method ?? "GET"} ${String(input)}` === key).at(-1);
  const init = call?.[1];
  return {
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
    idempotent: new Headers(init?.headers).has("Idempotency-Key"),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tanggal bisnis Asia/Jakarta `days` hari dari hari ini. */
export function businessDateIn(days: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(Date.now() + days * DAY_MS));
}
