import {
  type ApplicationApproval,
  type ApplicationApprovalResponse,
  applicationApprovalResponseMock,
  financingResponseMock,
  type SessionResponse,
  sessionResponseMock,
  type TaskItem,
  taskListResponseMock,
} from "@cikal/contracts";
import type { ApiRoutes, StubResponse } from "./render-app";

export const APPLICATION_ID = applicationApprovalResponseMock.data.applicationId;
export const APPROVAL_PATH = `/operations/approval/${APPLICATION_ID}`;
export const APPROVAL_KEY = `GET /api/v1/applications/${APPLICATION_ID}/approval`;
export const DECISION_KEY = `POST /api/v1/applications/${APPLICATION_ID}/approval/decision`;
export const FINANCING_KEY = `GET /api/v1/applications/${APPLICATION_ID}/financing`;
export const TASKS_KEY = "GET /api/v1/tasks?queueCode=APPROVAL&page=1";

/** Sesi Approver: Approval View dan Approve (api-specs 01 §1.11). */
export const approverSession: StubResponse = {
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
              menuCode: "OPS-APPROVAL",
              menuName: "Approval",
              link: "/operations/approval",
              iconName: "check-check",
              actions: ["VIEW", "APPROVE"],
              children: [],
            },
          ],
        },
      ],
    },
  } satisfies SessionResponse,
};

const [levelTwo, levelOne] = applicationApprovalResponseMock.data.chain;

/** Approver level 1 (final) setelah level 2 menyetujui, dengan Approve, Reject, dan Return (AC-72.01). */
export const finalApproval: ApplicationApproval = {
  ...applicationApprovalResponseMock.data,
  chain: [
    {
      ...(levelTwo as ApplicationApproval["chain"][number]),
      decision: "APPROVE",
      comment: "Agunan memadai",
      decidedAt: "2026-10-21T03:00:00Z",
    },
    levelOne as ApplicationApproval["chain"][number],
  ],
  allowedActions: ["APPROVE", "REJECT", "RETURN"],
  blockedReason: null,
};

/** Detail yang sama setelah level 1 menyetujui: rantai selesai dan tombol hilang. */
export const approvedApproval: ApplicationApproval = {
  ...finalApproval,
  chain: finalApproval.chain.map((entry) => ({ ...entry, decision: "APPROVE" })),
  allowedActions: [],
};

export const approvalOf = (approval: ApplicationApproval): StubResponse => ({
  status: 200,
  body: { data: approval } satisfies ApplicationApprovalResponse,
});

/** Tugas Approval milik user sesi dengan tombol Proceed ("Detail"). */
export const ownTask: TaskItem = {
  ...(taskListResponseMock.data[0] as TaskItem),
  queueCode: "APPROVAL",
  applicationId: APPLICATION_ID,
  status: "ASSIGNED",
  allowedActions: ["PROCEED"],
};

/** Rute API halaman approval; `extra` menambah atau mengganti respons. */
export function approvalRoutes(extra: ApiRoutes = {}): ApiRoutes {
  return {
    "GET /api/v1/auth/session": approverSession,
    [APPROVAL_KEY]: approvalOf(finalApproval),
    [FINANCING_KEY]: { status: 200, body: financingResponseMock },
    ...extra,
  };
}
