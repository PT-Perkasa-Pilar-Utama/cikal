import {
  type ProcessTimelineResponse,
  type SessionResponse,
  type SkipReason,
  type StepCode,
  sessionResponseMock,
  type TimelineStep,
} from "@cikal/contracts";
import type { ApiRoutes, StubResponse } from "./render-app";

export const APPLICATION_ID = "0192b6b0-0001-7000-8000-000000000013";
export const LOAN_ID = "20102026KTA0000013";
export const INITIAL_PROCESS_ID = "0192b6b1-0001-7000-8000-000000000013";
export const RECONTEST_PROCESS_ID = "0192b6b1-0002-7000-8000-000000000013";

/** Sesi Sales: Data Entry untuk membuka pengajuan dan Application Inquiry View untuk tab Workflow (api-specs 01 §1.11). */
export const inquirySession: StubResponse = {
  status: 200,
  body: {
    data: {
      ...sessionResponseMock.data,
      menus: [
        {
          menuCode: "APP",
          menuName: "Application",
          link: null,
          iconName: "file-stack",
          actions: ["VIEW"],
          children: [
            {
              menuCode: "APP-ENTRY",
              menuName: "Data Entry",
              link: "/applications/new",
              iconName: "file-plus",
              actions: ["VIEW", "CREATE", "UPDATE"],
              children: [],
            },
            {
              menuCode: "APP-INQUIRY",
              menuName: "Application Inquiry",
              link: "/applications",
              iconName: "search",
              actions: ["VIEW"],
              children: [],
            },
          ],
        },
      ],
    },
  } satisfies SessionResponse,
};

let stepSequence = 0;

/** Satu langkah timeline otomatis yang selesai; `overrides` mengganti status, waktu, dan hasilnya. */
export function timelineStep(stepCode: StepCode, overrides: Partial<TimelineStep> = {}): TimelineStep {
  stepSequence += 1;
  return {
    stepExecutionId: `0192b6b2-${String(stepSequence).padStart(4, "0")}-7000-8000-000000000013`,
    stepCode,
    status: "COMPLETED",
    skipReason: null,
    outcomeCode: null,
    attempt: 1,
    startedAt: "2026-10-20T07:30:01Z",
    endedAt: "2026-10-20T07:30:02Z",
    aging: "0",
    actor: { type: "SYSTEM" },
    summary: null,
    errorMessage: null,
    ...overrides,
  };
}

const skipped = (stepCode: StepCode, skipReason: SkipReason = "NOT_IN_ROUTE"): TimelineStep =>
  timelineStep(stepCode, {
    status: "SKIPPED",
    skipReason,
    startedAt: null,
    endedAt: null,
    aging: null,
    actor: null,
  });

/**
 * Proses KTA yang lolos Decision, disetujui dari 20-10-2026 16:00 WIB sampai 22-10-2026 09:00 WIB (AC-85.04), lalu
 * menunggu Validity Check; Survey tidak ada di rute (AC-85.02) dan SIKP tidak berlisensi.
 */
export const goSteps: TimelineStep[] = [
  timelineStep("DATA_ENTRY", {
    startedAt: "2026-10-18T02:00:00Z",
    endedAt: "2026-10-20T07:30:00Z",
    aging: "2",
    actor: { type: "USER", username: "sales.jkt01" },
  }),
  skipped("SURVEY"),
  timelineStep("DEDUP", { outcomeCode: "UNMATCH" }),
  timelineStep("DUKCAPIL", { outcomeCode: "PASSED" }),
  timelineStep("FRAUD", { outcomeCode: "CLEAN" }),
  timelineStep("RAC", { outcomeCode: "PASS" }),
  timelineStep("SCORING", { outcomeCode: "PASS" }),
  timelineStep("CREDIT_BUREAU", { outcomeCode: "COLLECT_1" }),
  timelineStep("DECISION", { outcomeCode: "GO" }),
  skipped("SIKP", "NOT_LICENSED"),
  timelineStep("APPROVAL", {
    startedAt: "2026-10-20T09:00:00Z",
    endedAt: "2026-10-22T02:00:00Z",
    aging: "2",
    actor: { type: "USER", username: "approver.01" },
  }),
  timelineStep("VALIDITY_CHECK", { status: "WAITING_HUMAN", startedAt: "2026-10-22T02:00:00Z", endedAt: null }),
];

/** Proses awal yang berhenti di RAC Fail lalu di-recontest (AC-85.03). */
export const initialSteps: TimelineStep[] = [
  timelineStep("DATA_ENTRY", { actor: { type: "USER", username: "sales.jkt01" } }),
  skipped("SURVEY"),
  timelineStep("DEDUP", { outcomeCode: "UNMATCH" }),
  timelineStep("RAC", { outcomeCode: "FAIL" }),
  timelineStep("DECISION", { outcomeCode: "NOTGO" }),
];

const processes: ProcessTimelineResponse["data"]["processes"] = [
  { id: INITIAL_PROCESS_ID, recontestNumber: 0, label: "Initial", status: "COMPLETED" },
  { id: RECONTEST_PROCESS_ID, recontestNumber: 1, label: "Recontest 1", status: "WAITING" },
];

export function timeline(selectedProcessId: string, steps: TimelineStep[]): StubResponse {
  return {
    status: 200,
    body: {
      data: { applicationId: APPLICATION_ID, loanId: LOAN_ID, processes, selectedProcessId, routeVersion: 2, steps },
    } satisfies ProcessTimelineResponse,
  };
}

export const PROCESS = `GET /api/v1/applications/${APPLICATION_ID}/process`;
export const processOf = (processInstanceId: string): string => `${PROCESS}?processInstanceId=${processInstanceId}`;

/** Hasil langkah `resource` untuk proses `processInstanceId` (api-specs 19 s.d. 24). */
export const resultOf = (resource: string, processInstanceId: string): string =>
  `GET /api/v1/applications/${APPLICATION_ID}/${resource}?processInstanceId=${processInstanceId}`;

/** Sesi dan timeline proses Recontest 1 yang dipilih server sebagai proses terbaru. */
export function workflowRoutes(extra: ApiRoutes = {}): ApiRoutes {
  return {
    "GET /api/v1/auth/session": inquirySession,
    [PROCESS]: timeline(RECONTEST_PROCESS_ID, goSteps),
    ...extra,
  };
}
