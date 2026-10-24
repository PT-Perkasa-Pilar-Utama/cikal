import {
  changeRequestAcceptedSchema,
  changeRequestListResponseSchema,
  type DecisionMatrixRowInput,
  decisionMatrixListResponseSchema,
  decisionSimulationResponseSchema,
  errorEnvelopeSchema,
  type ModuleOutcomes,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedDecisionMatrixRows } from "../src/modules/addons/m11-decision/index.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createSession, type TestSession } from "./support/session.js";

const CLEAN: ModuleOutcomes = {
  dedupOutcome: "UNMATCH",
  dukcapilOutcome: "PASSED",
  fraudOutcome: "CLEAN",
  racOutcome: "PASS",
  scoringOutcome: "PASS",
  creditBureauOutcome: "COLLECT_1",
};
type SeedRow = (typeof seedDecisionMatrixRows)[number];
const seedRow = (priority: number): SeedRow => {
  const row = seedDecisionMatrixRows.find((candidate) => candidate.priority === priority);
  if (!row) throw new Error(`No seeded row with priority ${priority}`);
  return row;
};
const collect5Row = seedRow(1);
const goRow = seedRow(4);
const collect2Row = seedRow(5);
const rowInput = (row: SeedRow, fields: Partial<DecisionMatrixRowInput> = {}): DecisionMatrixRowInput => {
  const { id: _id, ...input } = row;
  return { ...input, ...fields };
};
const combinationOf = (row: SeedRow) => {
  const { dedupOutcome, dukcapilOutcome, fraudOutcome, racOutcome, scoringOutcome, creditBureauOutcome } = row;
  return { dedupOutcome, dukcapilOutcome, fraudOutcome, racOutcome, scoringOutcome, creditBureauOutcome };
};

type Response = { statusCode: number; json(): unknown };

/** Decision Matrix lewat checker-maker dan simulasinya (api-specs 24 §24.2, §24.3, US-36). */
describe("decision matrix", () => {
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
    app.inject({ method, url: `/api/v1${url}`, headers: session.headers, payload });
  const expectError = (res: Response, status: number, code: string, message: string) => {
    expect(res.statusCode).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };
  const rows = async () =>
    decisionMatrixListResponseSchema.parse((await send(maker, "GET", "/decision-matrix")).json());
  const simulate = async (payload: object) => {
    const res = await send(maker, "POST", "/decision-matrix/simulate", payload);
    expect(res.statusCode).toBe(200);
    return decisionSimulationResponseSchema.parse(res.json()).data;
  };
  const pendingMatrix = async () =>
    changeRequestListResponseSchema.parse(
      (await send(checker, "GET", "/change-requests?entityType=DECISION_MATRIX")).json(),
    ).data;
  const approve = async (changeRequestId: string) => {
    const res = await send(checker, "POST", `/change-requests/${changeRequestId}/approve`, {});
    expect(res.statusCode).toBe(200);
  };
  const submitted = (res: Response): string => {
    expect(res.statusCode).toBe(202);
    const body = changeRequestAcceptedSchema.parse(res.json());
    expect(body.message).toBe("Data submitted for approval");
    return body.data.changeRequestId;
  };

  it("lists the seeded rows by priority without pending changes", async () => {
    const { data, meta } = await rows();

    expect(data.map((row) => row.priority)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(data[3]).toEqual({ ...goRow, hasPendingChange: false });
    expect(meta).toEqual({ page: 1, pageSize: 20, totalItems: 7, totalPages: 1 });
  });

  it("filters the rows by decision outcome", async () => {
    const res = await send(maker, "GET", "/decision-matrix?decisionOutcome=GO");

    const { data } = decisionMatrixListResponseSchema.parse(res.json());
    expect(new Set(data.map((row) => row.decisionOutcome))).toEqual(new Set(["GO"]));
  });

  it("AC-36.02 simulates Go with the matrix row used", async () => {
    const data = await simulate(CLEAN);

    expect(data).toEqual({
      decisionOutcome: "GO",
      matchedRow: { id: goRow.id, priority: 4, ...combinationOf(goRow) },
      note: null,
    });
  });

  it("AC-36.03 simulates the default NotGo when no row matches", async () => {
    const data = await simulate({ ...CLEAN, dedupOutcome: "MATCH" });

    expect(data).toEqual({
      decisionOutcome: "NOTGO",
      matchedRow: null,
      note: "No matching rule, default decision applied",
    });
  });

  it("AC-36.04 rejects a simulation without RAC, Scoring, and SLIK with OUTCOME_REQUIRED", async () => {
    const res = await send(maker, "POST", "/decision-matrix/simulate", {
      dedupOutcome: "UNMATCH",
      dukcapilOutcome: "PASSED",
      fraudOutcome: "CLEAN",
    });

    expectError(res, 422, "OUTCOME_REQUIRED", "Select an outcome for every module");
  });

  it("AC-36.05 uses the priority 1 [ANY] row for Scoring Pass and SLIK Collect 5", async () => {
    const data = await simulate({ ...CLEAN, creditBureauOutcome: "COLLECT_5" });

    expect(data).toMatchObject({ decisionOutcome: "NOTGO", matchedRow: { id: collect5Row.id, priority: 1 } });
  });

  it("rejects a new row with an existing combination with MATRIX_ROW_EXISTS", async () => {
    const res = await send(maker, "POST", "/decision-matrix/rows", rowInput(goRow, { priority: 9 }));

    expectError(res, 409, "MATRIX_ROW_EXISTS", "This combination already exists");
  });

  it("AC-36.01 submits a decision change for approval and shows it in Pending Decision Matrix", async () => {
    const res = await send(
      maker,
      "PUT",
      `/decision-matrix/rows/${collect2Row.id}`,
      rowInput(collect2Row, { decisionOutcome: "GO" }),
    );

    const changeRequestId = submitted(res);
    expect(await pendingMatrix()).toEqual([
      expect.objectContaining({ id: changeRequestId, displayName: "Priority 5: Scoring Pass, SLIK Collect 2 = Go" }),
    ]);
    expect((await rows()).data[4]).toMatchObject({ id: collect2Row.id, hasPendingChange: true });
  });

  it("rejects a second change while one is pending with PENDING_CHANGE_REQUEST", async () => {
    const res = await send(maker, "PUT", `/decision-matrix/rows/${collect2Row.id}`, rowInput(collect2Row));

    expectError(res, 409, "PENDING_CHANGE_REQUEST", "This data has a pending submission and cannot be edited");
  });

  it("simulates the pending change only when asked for the pending matrix", async () => {
    const collect2 = { ...CLEAN, creditBureauOutcome: "COLLECT_2" };

    expect((await simulate(collect2)).decisionOutcome).toBe("NOTGO");
    expect((await simulate({ ...collect2, useMatrix: "PENDING" })).decisionOutcome).toBe("GO");
  });

  it("AC-36.01 applies the approved change so the simulation uses the new decision", async () => {
    const [pending] = await pendingMatrix();

    await approve(pending?.id ?? "");

    expect((await rows()).data[4]).toMatchObject({ decisionOutcome: "GO", hasPendingChange: false });
    expect((await simulate({ ...CLEAN, creditBureauOutcome: "COLLECT_2" })).decisionOutcome).toBe("GO");
  });

  it("shifts the rows at a taken priority when a new row is approved", async () => {
    const newRow = rowInput(goRow, { creditBureauOutcome: "COLLECT_3", priority: 2 });

    await approve(submitted(await send(maker, "POST", "/decision-matrix/rows", newRow)));

    const { data } = await rows();
    expect(data.slice(0, 3).map((row) => `${row.creditBureauOutcome}:${row.priority}`)).toEqual([
      "COLLECT_5:1",
      "COLLECT_3:2",
      "ANY:3",
    ]);
    expect(data.map((row) => row.priority)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("answers NOT_FOUND for a row that does not exist", async () => {
    const res = await send(maker, "PUT", "/decision-matrix/rows/0192b6ac-9999-7000-8000-000000000001", rowInput(goRow));

    expectError(res, 404, "NOT_FOUND", "Data not found");
  });
});
