import {
  type ChangeRequestAccepted,
  changeRequestAcceptedSchema,
  errorEnvelopeSchema,
  type ProductRouteResponse,
  productRouteResponseSchema,
  type RouteStepSetting,
  type StepCode,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type pg from "pg";
import { expect } from "vitest";
import { insertRoute } from "./process.js";
import { insertProduct } from "./product.js";
import { createRole, createSession, type TestSession } from "./session.js";

type RouteSteps = Partial<Record<StepCode, boolean>>;

/** Langkah wajib dengan lisensi POC (RT-03). */
export const MANDATORY_STEPS: RouteSteps = {
  DATA_ENTRY: true,
  APPROVAL: true,
  VALIDITY_CHECK: true,
  PRINT_AKAD: true,
  DISBURSEMENT: true,
};
/** Rute KTA versi 2 seperti AC-31.01; Survey tidak berlisensi di paket POC, jadi Credit Bureau yang dimatikan. */
export const KTA_VERSION_2: RouteSteps = { ...MANDATORY_STEPS, DEDUP: true, CREDIT_BUREAU: true };

export const routeSettings = (steps: RouteSteps): RouteStepSetting[] =>
  Object.entries(steps).map(([stepCode, isEnabled]) => ({ stepCode: stepCode as StepCode, isEnabled: !!isEnabled }));

/** Produk KTA dengan versi 1 SUPERSEDED dan versi 2 ACTIVE. */
export async function ktaWithVersion2(owner: pg.Pool): Promise<string> {
  const productId = await insertProduct(owner);
  await insertRoute(owner, productId, [
    { versionNumber: 1, status: "SUPERSEDED", steps: MANDATORY_STEPS },
    { versionNumber: 2, status: "ACTIVE", steps: KTA_VERSION_2 },
  ]);
  return productId;
}

/** Maker dan Checker menu Product Route sesuai matriks seed (api-specs 01 §1.11). */
export async function routeSessions(owner: pg.Pool): Promise<{ maker: TestSession; checker: TestSession }> {
  const makerRole = await createRole(owner, "Maker Rute", [{ menuCode: "MST-ROUTE", view: true, update: true }]);
  const checkerRole = await createRole(owner, "Checker Rute", [{ menuCode: "MST-ROUTE", view: true, approve: true }]);
  return {
    maker: await createSession(owner, { roleId: makerRole }),
    checker: await createSession(owner, { roleId: checkerRole }),
  };
}

type Response = { statusCode: number; body: string; json(): unknown };
type Send = (session: TestSession, method: "GET" | "POST" | "PUT", url: string, payload?: object) => Promise<Response>;

export interface RouteClient {
  send: Send;
  propose(productId: string, steps: RouteSteps, extra?: object): Promise<Response>;
  review(changeRequestId: string, action: "approve" | "reject"): Promise<Response>;
  routeOf(productId: string, query?: string): Promise<ProductRouteResponse["data"]>;
}

/** Panggilan API rute: Maker mengajukan, Checker membaca dan meninjau. */
export function routeClient(
  app: NestFastifyApplication,
  sessions: { maker: TestSession; checker: TestSession },
): RouteClient {
  const send: Send = (session, method, url, payload) =>
    app.inject({ method, url: `/api/v1${url}`, headers: session.headers, ...(payload ? { payload } : {}) });
  return {
    send,
    propose: (productId: string, steps: RouteSteps, extra: object = {}) =>
      send(sessions.maker, "PUT", `/products/${productId}/route`, { steps: routeSettings(steps), ...extra }),
    review: (changeRequestId: string, action: "approve" | "reject") =>
      send(sessions.checker, "POST", `/change-requests/${changeRequestId}/${action}`, {}),
    async routeOf(productId: string, query = "") {
      const res = await send(sessions.checker, "GET", `/products/${productId}/route${query}`);
      expect(res.statusCode, res.body).toBe(200);
      return productRouteResponseSchema.parse(res.json()).data;
    },
  };
}

export function acceptedOf(res: Response): ChangeRequestAccepted {
  expect(res.statusCode, res.body).toBe(202);
  return changeRequestAcceptedSchema.parse(res.json());
}

export function expectError(res: Response, status: number, code: string, message: string): void {
  expect(res.statusCode).toBe(status);
  expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
}

/** Id versi rute produk, dibaca role pemilik skema. */
export async function routeVersionId(owner: pg.Pool, productId: string, versionNumber: number): Promise<string> {
  const { rows } = await owner.query<{ id: string }>(
    `select v.id from product.product_route_versions v join product.product_routes r on r.id = v.route_id
      where r.product_id = $1 and v.version_number = $2`,
    [productId, versionNumber],
  );
  return rows[0]?.id ?? "";
}
