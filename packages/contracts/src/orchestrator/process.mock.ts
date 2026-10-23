import type { ProcessTimelineResponse } from "./process.schema.js";

export const applicationIdMock = "0192b6b0-0001-7000-8000-000000000001";
export const processInstanceIdMock = "0192b6b1-0001-7000-8000-000000000001";

/** Contoh timeline api-specs 13 §13.2: DUKCAPIL berhenti `ERROR` setelah retry otomatis. */
export const processTimelineResponseMock = {
  data: {
    applicationId: applicationIdMock,
    loanId: "20102026KTA0000013",
    processes: [{ id: processInstanceIdMock, recontestNumber: 0, label: "Initial", status: "WAITING" }],
    selectedProcessId: processInstanceIdMock,
    routeVersion: 2,
    steps: [
      {
        stepExecutionId: "0192b6b2-0001-7000-8000-000000000001",
        stepCode: "DATA_ENTRY",
        status: "COMPLETED",
        skipReason: null,
        outcomeCode: null,
        attempt: 1,
        startedAt: "2026-10-18T02:00:00Z",
        endedAt: "2026-10-20T07:30:00Z",
        aging: "2",
        actor: { type: "USER", username: "sales.jkt01" },
        summary: null,
        errorMessage: null,
      },
      {
        stepExecutionId: "0192b6b2-0002-7000-8000-000000000001",
        stepCode: "SURVEY",
        status: "SKIPPED",
        skipReason: "NOT_IN_ROUTE",
        outcomeCode: null,
        attempt: 1,
        startedAt: null,
        endedAt: null,
        aging: null,
        actor: null,
        summary: null,
        errorMessage: null,
      },
      {
        stepExecutionId: "0192b6b2-0003-7000-8000-000000000001",
        stepCode: "DEDUP",
        status: "COMPLETED",
        skipReason: null,
        outcomeCode: "UNMATCH",
        attempt: 1,
        startedAt: "2026-10-20T07:30:01Z",
        endedAt: "2026-10-20T07:30:02Z",
        aging: "0",
        actor: { type: "SYSTEM" },
        summary: "No duplicate found",
        errorMessage: null,
      },
      {
        stepExecutionId: "0192b6b2-0004-7000-8000-000000000001",
        stepCode: "DUKCAPIL",
        status: "ERROR",
        skipReason: null,
        outcomeCode: null,
        attempt: 3,
        startedAt: "2026-10-20T07:30:05Z",
        endedAt: null,
        aging: "1",
        actor: { type: "SYSTEM" },
        summary: null,
        errorMessage: "Dukcapil service timeout",
      },
    ],
  },
} satisfies ProcessTimelineResponse;
