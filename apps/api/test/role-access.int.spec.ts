import {
  changeRequestAcceptedSchema,
  changeRequestDetailResponseSchema,
  changeRequestListResponseSchema,
  errorEnvelopeSchema,
  menuTreeResponseSchema,
  roleAccessListResponseSchema,
  roleListResponseSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedMenuId, seedRoleIds } from "../src/modules/core/identity/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const product = seedMenuId("MST-PRODUCT");
const none = { canView: false, canCreate: false, canUpdate: false, canDelete: false, canApprove: false };
const viewApprove = { ...none, canView: true, canApprove: true };
const UNKNOWN_ID = "0192b6a3-ffff-7000-8000-000000000001";
let roleCounter = 0;

/** Role Access lewat checker-maker (api-specs 03 §3.1 s.d. §3.5). */
describe("role access", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let checker: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    checker = await createSession(db.owner, { roleId: seedRoleIds.checker });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const send = (session: TestSession, method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    app.inject({ method, url: `/api/v1${url}`, headers: session.headers, ...(payload ? { payload } : {}) });
  const acceptedOf = (res: { statusCode: number; body: string; json(): unknown }) => {
    expect(res.statusCode, res.body).toBe(202);
    return changeRequestAcceptedSchema.parse(res.json());
  };
  const expectError = (res: { statusCode: number; json(): unknown }, status: number, code: string, message: string) => {
    expect(res.statusCode).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };
  const newRole = (grants: Parameters<typeof createRole>[2] = []) => {
    roleCounter += 1;
    return createRole(db.owner, `Credit Checker ${roleCounter}`, grants);
  };
  const grant = (roleId: string, flags: object = viewApprove) =>
    send(maker, "POST", "/role-access", { roleId, menuId: product, ...flags });
  const approve = (changeRequestId: string) => send(checker, "POST", `/change-requests/${changeRequestId}/approve`, {});
  const rowsOf = async (roleId: string) =>
    roleAccessListResponseSchema.parse((await send(maker, "GET", `/role-access?roleId=${roleId}`)).json()).data;

  it("submits menu access for a role and lists it on Pending Role Access (AC-09.01)", async () => {
    const roleId = await newRole();
    const body = acceptedOf(await grant(roleId));
    expect(body).toMatchObject({
      data: { entityType: "ROLE_ACCESS", entityId: null, status: "WAITING_APPROVAL" },
      message: "Data submitted for approval",
    });
    const pending = await send(checker, "GET", "/change-requests?entityType=ROLE_ACCESS");
    const row = changeRequestListResponseSchema
      .parse(pending.json())
      .data.find((r) => r.id === body.data.changeRequestId);
    expect(row).toMatchObject({ action: "CREATE", displayName: `Credit Checker ${roleCounter} - Product` });
  });

  it("gives an active session the approved rights on its next request (AC-09.01)", async () => {
    const roleId = await newRole();
    const user = await createSession(db.owner, { roleId });
    expect((await send(user, "GET", "/products")).statusCode).toBe(403);
    const { data } = acceptedOf(await grant(roleId));
    expect((await approve(data.changeRequestId)).statusCode).toBe(200);
    expect((await send(user, "GET", "/products")).statusCode).toBe(200);
    expect(await rowsOf(roleId)).toEqual([
      expect.objectContaining({
        menu: expect.objectContaining({ menuCode: "MST-PRODUCT", parentMenuName: "Master Data" }),
        ...viewApprove,
        hasPendingChange: false,
      }),
    ]);
  });

  it("rejects Approve without View on a new access (AC-09.03)", async () => {
    const res = await grant(await newRole(), { ...none, canApprove: true });
    expectError(res, 422, "VIEW_ACCESS_REQUIRED", "View access is required when other access is granted");
  });

  it("rejects Approve without View on an edit (AC-09.03)", async () => {
    const roleId = await newRole([{ menuCode: "MST-PRODUCT", view: true }]);
    const [row] = await rowsOf(roleId);
    const res = await send(maker, "PUT", `/role-access/${row?.id}`, { ...none, canApprove: true });
    expectError(res, 422, "VIEW_ACCESS_REQUIRED", "View access is required when other access is granted");
  });

  it("rejects access a role already has on the menu", async () => {
    const res = await grant(seedRoleIds.checker);
    expectError(res, 409, "ROLE_ACCESS_EXISTS", "Access for this role and menu already exists");
  });

  it("rejects access still waiting for approval for the same role and menu", async () => {
    const roleId = await newRole();
    acceptedOf(await grant(roleId));
    expectError(await grant(roleId), 409, "ROLE_ACCESS_EXISTS", "Access for this role and menu already exists");
  });

  it("answers 404 for an unknown or inactive role and an unknown menu", async () => {
    const inactive = await newRole();
    await db.owner.query("update iam.roles set is_active = false where id = $1", [inactive]);
    expectError(await grant(UNKNOWN_ID), 404, "NOT_FOUND", "Data not found");
    expectError(await grant(inactive), 404, "NOT_FOUND", "Data not found");
    const unknownMenu = await send(maker, "POST", "/role-access", {
      roleId: await newRole(),
      menuId: UNKNOWN_ID,
      ...viewApprove,
    });
    expectError(unknownMenu, 404, "NOT_FOUND", "Data not found");
  });

  it("submits a toggle change, marks the row pending, and applies it on approval (AC-12.06)", async () => {
    const roleId = await newRole([{ menuCode: "MST-PRODUCT", view: true, approve: true }]);
    const [row] = await rowsOf(roleId);
    const id = row?.id ?? "";
    const { data } = acceptedOf(await send(maker, "PUT", `/role-access/${id}`, none));
    expect(data).toMatchObject({ entityType: "ROLE_ACCESS", entityId: id });
    expect((await rowsOf(roleId))[0]?.hasPendingChange).toBe(true);
    const detail = await send(checker, "GET", `/change-requests/${data.changeRequestId}`);
    expect(changeRequestDetailResponseSchema.parse(detail.json()).data.changedFields).toEqual([
      "canView",
      "canApprove",
    ]);
    expectError(
      await send(maker, "PUT", `/role-access/${id}`, { ...none, canView: true }),
      409,
      "PENDING_CHANGE_REQUEST",
      "This data has a pending submission and cannot be edited",
    );
    expect((await approve(data.changeRequestId)).statusCode).toBe(200);
    expect((await rowsOf(roleId))[0]).toMatchObject({ ...none, hasPendingChange: false });
  });

  it("rejects an edit identical to the active access", async () => {
    const roleId = await newRole([{ menuCode: "MST-PRODUCT", view: true }]);
    const [row] = await rowsOf(roleId);
    const res = await send(maker, "PUT", `/role-access/${row?.id}`, { ...none, canView: true });
    expectError(res, 422, "NO_CHANGES", "No changes to submit");
  });

  it("answers 404 when editing unknown access", async () => {
    expectError(
      await send(maker, "PUT", `/role-access/${UNKNOWN_ID}`, viewApprove),
      404,
      "NOT_FOUND",
      "Data not found",
    );
  });

  it("lists active roles for the Role dropdown (AC-09.01)", async () => {
    const res = await send(maker, "GET", "/roles?q=checker&pageSize=100");
    const roles = roleListResponseSchema.parse(res.json());
    expect(roles.data).toContainEqual({ id: seedRoleIds.checker, roleName: "Checker", isActive: true });
    expect(roles.data.every((role) => role.isActive && /checker/i.test(role.roleName))).toBe(true);
  });

  it("lists roles for View on Role without Role Access, and denies a user with neither", async () => {
    const roleViewer = await createSession(db.owner, { roleId: await newRole([{ menuCode: "IAM-ROLE", view: true }]) });
    expect((await send(roleViewer, "GET", "/roles")).statusCode).toBe(200);
    const outsider = await createSession(db.owner, { roleId: await newRole() });
    expectError(await send(outsider, "GET", "/roles"), 403, "ACCESS_DENIED", "You do not have access to this page");
  });

  it("returns the menu tree for the Menu and Sub Menu dropdowns without unlicensed or inactive menus (AC-09.01)", async () => {
    const { rows } = await db.owner.query<{ parent: string }>(
      "select parent_menu_id as parent from iam.menus where menu_code = 'MST-PRODUCT'",
    );
    const insertMenu = (code: string, moduleCode: string, isActive: boolean) =>
      db.owner.query(
        `insert into iam.menus (id, menu_code, menu_name, menu_index, parent_menu_id, module_code, is_active)
         values ($1, $2, $2, 99, $3, $4, $5)`,
        [uuidv7(), code, rows[0]?.parent, moduleCode, isActive],
      );
    await insertMenu("MST-EPOLIS", "M14", true);
    await insertMenu("MST-RETIRED", "CORE", false);
    const childrenOf = async (query: string) => {
      const tree = menuTreeResponseSchema.parse((await send(maker, "GET", `/menus${query}`)).json()).data;
      return tree.find((menu) => menu.menuName === "Master Data")?.children.map((menu) => menu.menuCode) ?? [];
    };
    const active = await childrenOf("");
    expect(active).toContain("MST-PRODUCT");
    expect(active).not.toContain("MST-EPOLIS");
    expect(active).not.toContain("MST-RETIRED");
    expect(await childrenOf("?includeInactive=true")).toContain("MST-RETIRED");
  });
});
