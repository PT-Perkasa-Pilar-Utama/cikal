import type { ApplicationApprovalResponse, ApprovalDecisionResponse } from "./application-approval.schema.js";

/** Approver level 1 KTA QA menunggu keputusan level 2 (AC-72.03), dengan rentang suku bunga Approver (AC-97.05). */
export const applicationApprovalResponseMock = {
  data: {
    applicationId: "0192b6d0-0001-7000-8000-000000000001",
    loanId: "20102026KTAQA0000013",
    requestedLimit: "600000000.00",
    tenorProposed: 36,
    interestRate: "14.0000",
    approverRateMin: "11.0000",
    approverRateMax: "15.0000",
    rateEditable: true,
    chain: [
      {
        jobLevel: 2,
        subLevel: 1,
        description: "Kepala Cabang",
        approver: { username: "kepala.cabang" },
        decision: "PENDING",
        comment: null,
        decidedAt: null,
      },
      {
        jobLevel: 1,
        subLevel: 1,
        description: "Kepala Wilayah",
        approver: { username: "approver.01" },
        decision: "PENDING",
        comment: null,
        decidedAt: null,
      },
    ],
    myLevel: { jobLevel: 1, subLevel: 1, isFinalApprover: true },
    allowedActions: [],
    blockedReason: "Waiting for level 2 approval",
  },
} satisfies ApplicationApprovalResponse;

/** Approver level 2 menyetujui; rantai lanjut ke level 1 (AC-72.02). */
export const approvalDecisionResponseMock = {
  data: { decision: "APPROVE", jobLevel: 2, isFinal: false, applicationStatus: "ON_PROGRESS", nextStep: "APPROVAL" },
  message: "Loan application is successfully approved",
} satisfies ApprovalDecisionResponse;
