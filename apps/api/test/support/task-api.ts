import { errorEnvelopeSchema, taskListResponseSchema, taskStateResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type pg from "pg";
import { expect } from "vitest";
import type { TestSession } from "./session.js";
import type { TestTask } from "./task.js";

type Response = { statusCode: number; body: string; json(): unknown };

/** Panggilan API antrean tugas dan pemeriksaan hasilnya untuk uji Task Queue (api-specs 14 §14.2 s.d. §14.4). */
export function taskApi(app: NestFastifyApplication, owner: pg.Pool) {
  const send = (session: TestSession, method: "GET" | "POST", url: string, payload?: object) =>
    app.inject({ method, url: `/api/v1${url}`, headers: session.headers, ...(payload ? { payload } : {}) });
  return {
    send,
    assign: (session: TestSession, task: TestTask, version = task.version) =>
      send(session, "POST", `/tasks/${task.id}/assign`, { version }),
    release: (session: TestSession, task: TestTask, version: number) =>
      send(session, "POST", `/tasks/${task.id}/release`, { version }),
    stateOf: (res: Response) => {
      expect(res.statusCode, res.body).toBe(200);
      return taskStateResponseSchema.parse(res.json()).data;
    },
    rowOf: async (session: TestSession, task: TestTask) => {
      const res = await send(session, "GET", `/tasks?queueCode=VERIFICATION&q=${task.loanId}`);
      expect(res.statusCode, res.body).toBe(200);
      return taskListResponseSchema.parse(res.json()).data.find((item) => item.id === task.id);
    },
    expectError: (res: Response, status: number, code: string, message: string) => {
      expect(res.statusCode, res.body).toBe(status);
      expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
    },
    auditOf: async (taskId: string, action: string) => {
      const { rows } = await owner.query<{ user_id: string; role: string; description: string }>(
        "select user_id, role, description from audit.audit_logs where record_id = $1 and action = $2",
        [taskId, action],
      );
      return rows;
    },
  };
}
