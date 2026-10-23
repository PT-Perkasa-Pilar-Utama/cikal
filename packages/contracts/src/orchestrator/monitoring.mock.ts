import type { ProcessFinishResponse, ProcessMonitoringResponse, StepRetryResponse } from "./monitoring.schema.js";
import { applicationIdMock, processInstanceIdMock } from "./process.mock.js";

const dukcapilStepIdMock = "0192b6b2-0004-7000-8000-000000000001";

/** Contoh api-specs 13 §13.3: DUKCAPIL berhenti `ERROR` setelah tiga attempt (AC-86.04). */
export const processMonitoringResponseMock = {
  data: [
    {
      applicationId: applicationIdMock,
      loanId: "20102026KTA0000013",
      fullName: null,
      branchCode: null,
      processInstanceId: processInstanceIdMock,
      currentStep: {
        stepExecutionId: dukcapilStepIdMock,
        stepCode: "DUKCAPIL",
        status: "ERROR",
        attempt: 3,
        errorCategory: "TIMEOUT",
        errorMessage: "Dukcapil service timeout",
        startedAt: "2026-10-20T07:30:05Z",
      },
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
} satisfies ProcessMonitoringResponse;

/** Retry berhasil (AC-86.01). */
export const stepRetryResponseMock = {
  data: {
    stepExecutionId: "0192b6b2-0005-7000-8000-000000000001",
    stepCode: "DUKCAPIL",
    status: "COMPLETED",
    attempt: 4,
    outcomeCode: "PASSED",
  },
  message: "Step retried",
} satisfies StepRetryResponse;

/** Proses dihentikan (AC-86.02). */
export const processFinishResponseMock = {
  data: { processInstanceId: processInstanceIdMock, applicationStatus: "FINISHED_CANCELLED" },
  message: "Process finished",
} satisfies ProcessFinishResponse;
