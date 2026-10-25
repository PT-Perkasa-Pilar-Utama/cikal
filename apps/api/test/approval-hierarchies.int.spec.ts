import { changeRequestListResponseSchema, errorEnvelopeSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedApprovalIds } from "../src/modules/core/approval/index.js";
import { seedRoleIds, seedUserId } from "../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { seedProductIds } from "../src/modules/core/product/index.js";
import { hierarchyApi, newHierarchy } from "./support/approval-hierarchy.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createSession, type TestSession } from "./support/session.js";

/** Approval Hierarchy lewat checker-maker (api-specs 16 §16.1 s.d. §16.3, US-27). */
describe("approval hierarchies", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let checker: TestSession;
  let api: ReturnType<typeof hierarchyApi>;

  beforeAll(async () => {
    db = await startDatabase("qa");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    checker = await createSession(db.owner, { roleId: seedRoleIds.checker });
    api = hierarchyApi(app, maker, checker);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("lists the seeded KTA QA Bandung chain by branch and level", async () => {
    const { data, meta } = await api.hierarchies();

    expect(data).toEqual([
      {
        id: seedApprovalIds.ktaQaHierarchy1,
        branch: { id: seedOrganizationIds.bandung, branchCode: "011" },
        product: { id: seedProductIds.ktaQa, productCode: "KTAQA" },
        jobLevel: 1,
        subLevel: 1,
        levelDescription: "Kepala Wilayah",
        upLevel: null,
        upSubLevel: null,
        approver: {
          id: seedUserId("approver.01"),
          username: "approver.01",
          fullName: "Joko Approver",
          status: "ACTIVE",
        },
        approverInactive: false,
        isActive: true,
        hasPendingChange: false,
      },
      expect.objectContaining({ id: seedApprovalIds.ktaQaHierarchy2, jobLevel: 2, upLevel: 1, upSubLevel: 1 }),
    ]);
    expect(meta).toEqual({ page: 1, pageSize: 20, totalItems: 2, totalPages: 1 });
  });

  it("filters by level and sorts by level descending", async () => {
    const level2 = await api.hierarchies("?jobLevel=2");
    const descending = await api.hierarchies("?sort=jobLevel,desc");

    expect(level2.data.map((row) => row.id)).toEqual([seedApprovalIds.ktaQaHierarchy2]);
    expect(descending.data.map((row) => row.jobLevel)).toEqual([2, 1]);
  });

  it("AC-27.01 submits a new approver for approval and adds it once approved", async () => {
    const changeRequestId = api.submitted(await api.send(maker, "POST", "/approval-hierarchies", newHierarchy()));

    const pending = changeRequestListResponseSchema.parse(
      (await api.send(checker, "GET", "/change-requests?entityType=APPROVAL_HIERARCHY")).json(),
    ).data;
    expect(pending.map((row) => row.displayName)).toEqual(["011 KTAQA Level 2.2 - approver.01"]);

    await api.approve(changeRequestId);
    const { data } = await api.hierarchies("?jobLevel=2");
    expect(data.map((row) => [row.subLevel, row.approver.username])).toEqual([
      [1, "kepala.cabang"],
      [2, "approver.01"],
    ]);
  });

  it("AC-27.02 rejects an approver without Approve access on Approval with APPROVER_WITHOUT_ACCESS", async () => {
    const res = await api.send(
      maker,
      "POST",
      "/approval-hierarchies",
      newHierarchy({ subLevel: 3, approverUserId: seedUserId("sales.jkt01") }),
    );

    api.expectError(res, 422, "APPROVER_WITHOUT_ACCESS", "Selected user does not have approval access");
  });

  it("AC-27.03 marks the row of an inactive approver", async () => {
    await db.owner.query("update iam.users set status = 'INACTIVE' where id = $1", [seedUserId("approver.01")]);
    try {
      const { data } = await api.hierarchies("?jobLevel=1");

      expect(data[0]).toMatchObject({ approverInactive: true, approver: { status: "INACTIVE" } });
    } finally {
      await db.owner.query("update iam.users set status = 'ACTIVE' where id = $1", [seedUserId("approver.01")]);
    }
  });

  it("rejects an inactive user as approver with APPROVER_WITHOUT_ACCESS", async () => {
    const res = await api.send(
      maker,
      "POST",
      "/approval-hierarchies",
      newHierarchy({ subLevel: 3, approverUserId: seedUserId("sales.jkt02") }),
    );

    api.expectError(res, 422, "APPROVER_WITHOUT_ACCESS", "Selected user does not have approval access");
  });

  it("rejects a level that is not set up for the branch and product with APPROVAL_LEVEL_NOT_FOUND", async () => {
    const level3 = await api.send(maker, "POST", "/approval-hierarchies", newHierarchy({ jobLevel: 3, upLevel: 2 }));
    const cimahi = await api.send(
      maker,
      "POST",
      "/approval-hierarchies",
      newHierarchy({ branchId: seedOrganizationIds.cimahi }),
    );
    const upLevel = await api.send(maker, "POST", "/approval-hierarchies", newHierarchy({ subLevel: 3, upLevel: 4 }));

    api.expectError(
      level3,
      422,
      "APPROVAL_LEVEL_NOT_FOUND",
      "Approval level 3 is not set up for this branch and product",
    );
    api.expectError(
      cimahi,
      422,
      "APPROVAL_LEVEL_NOT_FOUND",
      "Approval level 2 is not set up for this branch and product",
    );
    api.expectError(
      upLevel,
      422,
      "APPROVAL_LEVEL_NOT_FOUND",
      "Approval level 4 is not set up for this branch and product",
    );
  });

  it("rejects an approver already assigned to the level, or already submitted, with HIERARCHY_EXISTS", async () => {
    const message = "This approver is already assigned to this level";
    const assigned = await api.send(
      maker,
      "POST",
      "/approval-hierarchies",
      newHierarchy({ subLevel: 1, approverUserId: seedUserId("kepala.cabang") }),
    );
    api.submitted(
      await api.send(
        maker,
        "POST",
        "/approval-hierarchies",
        newHierarchy({ jobLevel: 1, subLevel: 2, upLevel: null, upSubLevel: null }),
      ),
    );
    const proposed = await api.send(
      maker,
      "POST",
      "/approval-hierarchies",
      newHierarchy({ jobLevel: 1, subLevel: 2, upLevel: null, upSubLevel: null }),
    );

    api.expectError(assigned, 409, "HIERARCHY_EXISTS", message);
    api.expectError(proposed, 409, "HIERARCHY_EXISTS", message);
  });

  it("rejects an Up Level without an Up Sub Level", async () => {
    const res = await api.send(maker, "POST", "/approval-hierarchies", newHierarchy({ upSubLevel: null }));

    expect(res.statusCode).toBe(400);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Please complete all required fields",
    });
    expect(errorEnvelopeSchema.parse(res.json()).details).toEqual([
      expect.objectContaining({ field: "upSubLevel", message: "Up Level and Up Sub Level must be filled together" }),
    ]);
  });

  it("refuses a Checker who cannot create approval setup (ACTION_DENIED)", async () => {
    const res = await api.send(checker, "POST", "/approval-hierarchies", newHierarchy({ subLevel: 4 }));

    expect(res.statusCode).toBe(403);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "ACTION_DENIED" });
  });
});
