import { applicationDraftResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { insertRoute } from "./support/process.js";
import { insertProduct } from "./support/product.js";
import { MANDATORY_STEPS } from "./support/route.js";
import { createRole, createSession } from "./support/session.js";

/** Cabang draft dari unit kerja pembuatnya untuk routing approval (api-specs 12 §12.2 langkah 5). */
describe("application draft branch", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let salesRole: string;
  let productId: string;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    salesRole = await createRole(db.owner, "Sales Cabang", [{ menuCode: "APP-ENTRY", view: true, create: true }]);
    productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: MANDATORY_STEPS }]);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  /** Draft Sales dengan unit kerja `unit`; mengembalikan `branch_id` yang tersimpan. */
  const draftBranch = async (unit: { branch_id?: string; sub_branch_id?: string }) => {
    const session = await createSession(db.owner, { roleId: salesRole });
    await db.owner.query("update iam.users set branch_id = $2, sub_branch_id = $3 where id = $1", [
      session.userId,
      unit.branch_id ?? null,
      unit.sub_branch_id ?? null,
    ]);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: session.headers,
      payload: {
        application: {
          applicationType: "NTB",
          productCategory: "NON_COLLATERAL",
          productId,
          requestedLimit: "20000000.00",
        },
        personal: {
          idType: "KTP",
          idCardNumber: "3273011402900001",
          fullName: "Rudi Hartono",
          fullNameId: "RUDI HARTONO",
        },
      },
    });
    expect(res.statusCode, res.body).toBe(201);
    const { id } = applicationDraftResponseSchema.parse(res.json()).data;
    const { rows } = await db.owner.query("select branch_id from application.applications where id = $1", [id]);
    return rows[0]?.branch_id;
  };

  it("stores the branch of a branch Sales", async () => {
    expect(await draftBranch({ branch_id: seedOrganizationIds.bandung })).toBe(seedOrganizationIds.bandung);
  });

  it("stores the parent branch of a sub branch Sales", async () => {
    expect(await draftBranch({ sub_branch_id: seedOrganizationIds.dago })).toBe(seedOrganizationIds.bandung);
  });

  it("leaves the branch empty for a head office user", async () => {
    expect(await draftBranch({})).toBeNull();
  });
});
