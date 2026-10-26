import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { registerStepHandlers, type ScriptedStepHandler } from "./support/process.js";
import { createSession, type TestSession } from "./support/session.js";
import { setUser, TASK_BRANCH_ID, verificationTask } from "./support/task.js";
import { taskApi } from "./support/task-api.js";

/** Supervisor melepas tugas orang lain dalam lingkup cabang atau regionalnya (api-specs 14 §14.4, AC-58.05). */
describe("task queue supervisors", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let api: ReturnType<typeof taskApi>;
  let verification: ScriptedStepHandler;
  let veri01: TestSession;
  let supervisor: TestSession;
  let farSupervisor: TestSession;
  let regionalSupervisor: TestSession;

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
    supervisor = await createSession(db.owner, { roleId: seedRoleIds.supervisor });
    farSupervisor = await createSession(db.owner, { roleId: seedRoleIds.supervisor });
    regionalSupervisor = await createSession(db.owner, { roleId: seedRoleIds.supervisor });
    await setUser(db.owner, veri01.userId, { username: "veri.01" });
    await setUser(db.owner, supervisor.userId, { username: "spv.01", branchId: TASK_BRANCH_ID });
    await setUser(db.owner, farSupervisor.userId, { username: "spv.02", branchId: seedOrganizationIds.cimahi });
    await setUser(db.owner, regionalSupervisor.userId, {
      username: "spv.jabar",
      regionalId: seedOrganizationIds.jawaBarat,
    });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-58.05 lets a Supervisor release a held task in their branch and records them in the audit trail", async () => {
    const task = await verificationTask(app, db.owner, verification);
    const assigned = api.stateOf(await api.assign(veri01, task));
    expect(await api.rowOf(supervisor, task)).toMatchObject({
      branchCode: "011",
      assignedTo: { username: "veri.01" },
      allowedActions: ["RELEASE_OTHER"],
    });

    expect(api.stateOf(await api.release(supervisor, task, assigned.version))).toMatchObject({
      status: "OPEN",
      assignedTo: null,
    });
    const [audit] = await api.auditOf(task.id, "RELEASE");
    expect(audit).toMatchObject({ user_id: supervisor.userId, role: "Supervisor" });
    expect(audit?.description).toContain("released from veri.01");
  });

  it("hides another branch's task from a Supervisor (NOT_FOUND)", async () => {
    const task = await verificationTask(app, db.owner, verification);
    const assigned = api.stateOf(await api.assign(veri01, task));

    expect(await api.rowOf(farSupervisor, task)).toBeUndefined();
    api.expectError(await api.release(farSupervisor, task, assigned.version), 404, "NOT_FOUND", "Data not found");
  });

  it("lets a regional Supervisor release a held task in a branch of their regional", async () => {
    const task = await verificationTask(app, db.owner, verification);
    const assigned = api.stateOf(await api.assign(veri01, task));

    expect(await api.rowOf(regionalSupervisor, task)).toMatchObject({ allowedActions: ["RELEASE_OTHER"] });
    expect(api.stateOf(await api.release(regionalSupervisor, task, assigned.version))).toMatchObject({
      status: "OPEN",
    });
  });
});
