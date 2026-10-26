import { errorEnvelopeSchema, formulaVariableListResponseSchema, standardErrors } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createSession, type TestSession } from "./support/session.js";

type Response = { statusCode: number; json(): unknown };

/** Katalog variabel untuk dropdown "Field" kriteria (api-specs 09 §9.2, US-37). */
describe("GET /formula-variables", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;

  const send = (session: TestSession, method: "GET", url: string) =>
    app.inject({ method, url: `/api/v1${url}`, headers: session.headers });
  const expectError = (res: Response, status: number, code: string, message: string) => {
    expect(res.statusCode).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("lists the scoring variables with their types for the Field dropdown", async () => {
    const res = await send(maker, "GET", "/formula-variables?usage=SCORING");

    expect(res.statusCode).toBe(200);
    const { data } = formulaVariableListResponseSchema.parse(res.json());
    expect(data).toContainEqual({
      variableCode: "OCCUPATION",
      label: "Occupation",
      dataType: "CHOICE",
      paramType: "Occupation",
      source: "APPLICATION",
    });
    expect(data).toContainEqual(
      expect.objectContaining({
        variableCode: "INSTALLMENT_TO_INCOME_RATIO",
        label: "Installment to Income Ratio (%)",
      }),
    );
  });

  it("filters by label or code", async () => {
    const { data } = formulaVariableListResponseSchema.parse(
      (await send(maker, "GET", "/formula-variables?q=income")).json(),
    );

    expect(data.map((variable) => variable.variableCode)).toEqual(["MONTHLY_INCOME", "INSTALLMENT_TO_INCOME_RATIO"]);
  });

  it("rejects a user without Scoring or Formula access", async () => {
    const outsider = await createSession(db.owner, { roleId: null });

    expectError(
      await send(outsider, "GET", "/formula-variables"),
      403,
      "ACCESS_DENIED",
      standardErrors.ACCESS_DENIED.message,
    );
  });
});
