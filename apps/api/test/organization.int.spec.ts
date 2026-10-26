import {
  branchListResponseSchema,
  errorEnvelopeSchema,
  regionalListResponseSchema,
  subBranchListResponseSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createRole, createSession, type TestSession } from "./support/session.js";
import { setUser } from "./support/task.js";

const jawaBarat = { id: seedOrganizationIds.jawaBarat, regionalCode: "01", regionalName: "Jawa Barat" };
const bandung = {
  id: seedOrganizationIds.bandung,
  branchCode: "011",
  branchName: "Bandung",
  regional: jawaBarat,
  isActive: true,
};
const cimahi = {
  id: seedOrganizationIds.cimahi,
  branchCode: "012",
  branchName: "Cimahi",
  regional: jawaBarat,
  isActive: true,
};

/** Dropdown unit organisasi dalam lingkup data user (api-specs 05 §5.1, §5.2, AC-17.06). */
describe("organization units", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let bandungMaker: TestSession;
  let noMenu: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    bandungMaker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    await setUser(db.owner, bandungMaker.userId, { branchId: seedOrganizationIds.bandung });
    noMenu = await createSession(db.owner, { roleId: await createRole(db.owner, "Tanpa Menu", []) });
    await db.owner.query("update org.branches set is_active = false where id = $1", [seedOrganizationIds.cimahi]);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const get = (session: TestSession, url: string) =>
    app.inject({ method: "GET", url: `/api/v1${url}`, headers: session.headers });

  it("AC-17.06 lists only active branches with their regional", async () => {
    const res = await get(maker, "/branches");

    expect(res.statusCode).toBe(200);
    expect(branchListResponseSchema.parse(res.json())).toEqual({
      data: [bandung],
      meta: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    });
  });

  it("lets every role with Application Inquiry read the branch dropdown", async () => {
    const sales = await createSession(db.owner, { roleId: seedRoleIds.sales });

    expect((await get(sales, "/branches")).statusCode).toBe(200);
  });

  it("refuses inactive branches without View on Organization (ACCESS_DENIED)", async () => {
    const sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
    const res = await get(sales, "/branches?includeInactive=true");

    expect(res.statusCode).toBe(403);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("lists inactive branches for the Organization page", async () => {
    const res = await get(maker, "/branches?includeInactive=true&sort=branchCode,desc");

    const { data } = branchListResponseSchema.parse(res.json());
    expect(data).toEqual([{ ...cimahi, isActive: false }, bandung]);
  });

  it("searches branches by code or name", async () => {
    const byName = branchListResponseSchema.parse((await get(maker, "/branches?q=band")).json());
    const byCode = branchListResponseSchema.parse((await get(maker, "/branches?q=011")).json());

    expect(byName.data.map((branch) => branch.branchCode)).toEqual(["011"]);
    expect(byCode.data.map((branch) => branch.branchCode)).toEqual(["011"]);
  });

  it("limits a branch user to their own branch (TN-02)", async () => {
    const res = await get(bandungMaker, "/branches?includeInactive=true");

    expect(branchListResponseSchema.parse(res.json()).data).toEqual([bandung]);
  });

  it("lists the regionals and the active sub branches of a branch", async () => {
    const regionals = regionalListResponseSchema.parse((await get(maker, "/regionals")).json());
    const subBranches = subBranchListResponseSchema.parse(
      (await get(maker, `/branches/${seedOrganizationIds.bandung}/sub-branches`)).json(),
    );

    expect(regionals.data).toEqual([{ ...jawaBarat, isActive: true }]);
    expect(subBranches.data).toEqual([
      { id: seedOrganizationIds.dago, subBranchCode: "01101", subBranchName: "Dago", isActive: true },
    ]);
  });

  it("answers NOT_FOUND for the sub branches of a branch outside the user's scope", async () => {
    const res = await get(bandungMaker, `/branches/${seedOrganizationIds.cimahi}/sub-branches`);

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuses a user without View on a menu that uses the branch dropdown (ACCESS_DENIED)", async () => {
    const res = await get(noMenu, "/branches");

    expect(res.statusCode).toBe(403);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "ACCESS_DENIED" });
  });
});
