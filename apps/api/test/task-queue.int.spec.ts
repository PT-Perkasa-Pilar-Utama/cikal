import { taskListResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { registerStepHandlers, type ScriptedStepHandler } from "./support/process.js";
import { createSession, type TestSession } from "./support/session.js";
import { setUser, TASK_BRANCH_ID, taskRow, verificationTask } from "./support/task.js";
import { taskApi } from "./support/task-api.js";

const UNKNOWN_ID = "0192b6c0-ffff-7000-8000-000000000001";

/** Antrean tugas manual: daftar, ambil, dan lepas (api-specs 14 §14.2 s.d. §14.4, US-58). */
describe("task queue", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let verification: ScriptedStepHandler;
  let veri01: TestSession;
  let veri02: TestSession;
  let supervisor: TestSession;
  let adminSistem: TestSession;
  let api: ReturnType<typeof taskApi>;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    api = taskApi(app, db.owner);
    const handler = registerStepHandlers(app, ["VERIFICATION", "APPROVAL"]).get("VERIFICATION");
    if (!handler) throw new Error("VERIFICATION handler missing");
    verification = handler;
    veri01 = await createSession(db.owner, { roleId: seedRoleIds.verifikator });
    veri02 = await createSession(db.owner, { roleId: seedRoleIds.verifikator });
    supervisor = await createSession(db.owner, { roleId: seedRoleIds.supervisor });
    adminSistem = await createSession(db.owner, { roleId: seedRoleIds.adminSistem });
    await setUser(db.owner, veri01.userId, { username: "veri.01" });
    await setUser(db.owner, veri02.userId, { username: "veri.02" });
    await setUser(db.owner, supervisor.userId, { username: "spv.01", branchId: TASK_BRANCH_ID });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-58.01 assigns an open task to the user, who then sees Proceed", async () => {
    const task = await verificationTask(app, db.owner, verification);
    expect(await api.rowOf(veri02, task)).toMatchObject({
      status: "OPEN",
      assignedTo: null,
      loanId: task.loanId,
      allowedActions: ["ASSIGN"],
    });

    expect(api.stateOf(await api.assign(veri02, task))).toEqual({
      id: task.id,
      status: "ASSIGNED",
      assignedTo: { id: veri02.userId, username: "veri.02" },
      version: task.version + 1,
    });
    expect(await api.rowOf(veri02, task)).toMatchObject({
      assignedTo: { username: "veri.02" },
      allowedActions: ["RELEASE", "PROCEED"],
    });
    expect(await api.auditOf(task.id, "ASSIGN")).toMatchObject([{ user_id: veri02.userId, role: "Verifikator" }]);
  });

  it("AC-58.02 AC-58.06 shows another user's task without Assign to Me, Proceed, or Release Me", async () => {
    const task = await verificationTask(app, db.owner, verification);
    api.stateOf(await api.assign(veri01, task));

    expect(await api.rowOf(veri02, task)).toMatchObject({
      status: "ASSIGNED",
      assignedTo: { username: "veri.01" },
      allowedActions: [],
    });
  });

  it("AC-58.03 releases the user's own task so another Verifikator can take it", async () => {
    const task = await verificationTask(app, db.owner, verification);
    const assigned = api.stateOf(await api.assign(veri01, task));

    const released = api.stateOf(await api.release(veri01, task, assigned.version));
    expect(released).toEqual({ id: task.id, status: "OPEN", assignedTo: null, version: assigned.version + 1 });
    expect(await api.rowOf(veri02, task)).toMatchObject({ assignedTo: null, allowedActions: ["ASSIGN"] });
    expect(api.stateOf(await api.assign(veri02, task, released.version)).assignedTo?.username).toBe("veri.02");
    expect(await api.auditOf(task.id, "RELEASE")).toMatchObject([{ user_id: veri01.userId }]);
  });

  it("AC-58.04 lets only the first of two simultaneous Assign to Me win", async () => {
    const task = await verificationTask(app, db.owner, verification);

    const [first, second] = await Promise.all([api.assign(veri01, task), api.assign(veri02, task)]);
    const winner = first.statusCode === 200 ? "veri.01" : "veri.02";
    const loser = first.statusCode === 200 ? second : first;
    api.expectError(loser, 409, "TASK_ALREADY_ASSIGNED", `This task has already been assigned to ${winner}`);

    const late = await api.assign(winner === "veri.01" ? veri02 : veri01, task);
    api.expectError(late, 409, "TASK_ALREADY_ASSIGNED", `This task has already been assigned to ${winner}`);
    expect((await taskRow(db.owner, task.id)).version).toBe(task.version + 1);
  });

  it("AC-58.06 rejects releasing another user's task without Supervisor rights (ACTION_DENIED)", async () => {
    const task = await verificationTask(app, db.owner, verification);
    const assigned = api.stateOf(await api.assign(veri01, task));

    api.expectError(
      await api.release(veri02, task, assigned.version),
      403,
      "ACTION_DENIED",
      "You do not have permission to perform this action",
    );
    expect((await taskRow(db.owner, task.id)).assigned_user_id).toBe(veri01.userId);
  });

  it("rejects a release with a stale version (TASK_VERSION_CONFLICT)", async () => {
    const task = await verificationTask(app, db.owner, verification);
    api.stateOf(await api.assign(veri01, task));

    api.expectError(
      await api.release(veri01, task, task.version),
      409,
      "TASK_VERSION_CONFLICT",
      "This task has changed. Please refresh",
    );
  });

  it("rejects releasing a task nobody holds (INVALID_STATE)", async () => {
    const task = await verificationTask(app, db.owner, verification);

    api.expectError(
      await api.release(supervisor, task, task.version),
      409,
      "INVALID_STATE",
      "This action is not allowed in the current status",
    );
  });

  it("rejects a task outside the user's queues (NOT_FOUND) and a queue page without access (ACCESS_DENIED)", async () => {
    const task = await verificationTask(app, db.owner, verification);

    api.expectError(await api.assign(adminSistem, task), 404, "NOT_FOUND", "Data not found");
    api.expectError(
      await api.send(veri01, "POST", `/tasks/${UNKNOWN_ID}/assign`, { version: 1 }),
      404,
      "NOT_FOUND",
      "Data not found",
    );
    api.expectError(
      await api.send(adminSistem, "GET", "/tasks?queueCode=VERIFICATION"),
      403,
      "ACCESS_DENIED",
      "You do not have access to this page",
    );
  });

  it("filters the queue by Loan ID and by the user's own tasks", async () => {
    const mine = await verificationTask(app, db.owner, verification);
    const other = await verificationTask(app, db.owner, verification);
    api.stateOf(await api.assign(veri02, mine));

    const res = await api.send(veri02, "GET", "/tasks?queueCode=VERIFICATION&assignedToMe=true&pageSize=100");
    const ids = taskListResponseSchema.parse(res.json()).data.map((item) => item.id);
    expect(ids).toContain(mine.id);
    expect(ids).not.toContain(other.id);
    const byLoan = taskListResponseSchema.parse(
      (await api.send(veri02, "GET", `/tasks?queueCode=VERIFICATION&q=${other.loanId}`)).json(),
    );
    expect(byLoan.data.map((item) => item.loanId)).toEqual([other.loanId]);
  });

  it("treats % and _ in the Loan ID search as literal characters", async () => {
    await verificationTask(app, db.owner, verification);
    const wildcard = await verificationTask(app, db.owner, verification);
    // Loan ID asli tidak pernah memuat % atau _, jadi hanya tugas ini yang boleh cocok.
    await db.owner.query("update taskqueue.human_tasks set loan_id = $1 where id = $2", [
      `${wildcard.loanId}%_`,
      wildcard.id,
    ]);

    for (const q of ["%", "_"]) {
      const res = await api.send(
        veri02,
        "GET",
        `/tasks?queueCode=VERIFICATION&q=${encodeURIComponent(q)}&pageSize=100`,
      );
      expect(res.statusCode, res.body).toBe(200);
      expect(taskListResponseSchema.parse(res.json()).data.map((item) => item.id)).toEqual([wildcard.id]);
    }
  });
});
