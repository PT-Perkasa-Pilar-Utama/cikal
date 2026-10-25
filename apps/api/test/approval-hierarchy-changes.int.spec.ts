import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedApprovalIds } from "../src/modules/core/approval/index.js";
import { seedRoleIds, seedUserId } from "../src/modules/core/identity/index.js";
import { hierarchyApi } from "./support/approval-hierarchy.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createSession, type TestSession } from "./support/session.js";

const UNKNOWN_ID = "0192b6d0-ffff-7000-8000-000000000001";

/** Mengganti approver, level berikutnya, atau status baris Approval Hierarchy (api-specs 16 §16.3, US-27). */
describe("approval hierarchy changes", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let api: ReturnType<typeof hierarchyApi>;
  let maker: TestSession;

  beforeAll(async () => {
    db = await startDatabase("qa");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    const checker = await createSession(db.owner, { roleId: seedRoleIds.checker });
    api = hierarchyApi(app, maker, checker);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("replaces the approver of a row through a change request", async () => {
    const changeRequestId = api.submitted(
      await api.send(maker, "PUT", `/approval-hierarchies/${seedApprovalIds.ktaQaHierarchy2}`, {
        approverUserId: seedUserId("approver.01"),
        upLevel: 1,
        upSubLevel: 1,
        isActive: true,
      }),
    );
    expect((await api.hierarchies("?jobLevel=2")).data[0]?.hasPendingChange).toBe(true);

    await api.approve(changeRequestId);
    const [row] = (await api.hierarchies("?jobLevel=2")).data;
    expect(row).toMatchObject({ id: seedApprovalIds.ktaQaHierarchy2, approver: { username: "approver.01" } });
  });

  it("rejects a second change to a row with a pending submission (PENDING_CHANGE_REQUEST)", async () => {
    const body = { approverUserId: seedUserId("kepala.cabang"), upLevel: null, upSubLevel: null, isActive: true };
    api.submitted(await api.send(maker, "PUT", `/approval-hierarchies/${seedApprovalIds.ktaQaHierarchy1}`, body));

    const res = await api.send(maker, "PUT", `/approval-hierarchies/${seedApprovalIds.ktaQaHierarchy1}`, body);

    api.expectError(res, 409, "PENDING_CHANGE_REQUEST", "This data has a pending submission and cannot be edited");
  });

  it("answers NOT_FOUND for an unknown row", async () => {
    const res = await api.send(maker, "PUT", `/approval-hierarchies/${UNKNOWN_ID}`, {
      approverUserId: seedUserId("approver.01"),
      isActive: true,
    });

    api.expectError(res, 404, "NOT_FOUND", "Data not found");
  });
});
