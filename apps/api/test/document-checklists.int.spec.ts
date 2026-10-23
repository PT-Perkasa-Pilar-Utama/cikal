import {
  changeRequestAcceptedSchema,
  changeRequestListResponseSchema,
  documentChecklistListResponseSchema,
  errorEnvelopeSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { insertProduct } from "./support/product.js";
import { createSession, type TestSession } from "./support/session.js";

const KARYAWAN_SWASTA = "001";
const PELAJAR = "006";
const BELUM_KAWIN = "001";
const KAWIN = "002";
/** Tujuh dokumen AC-25.01 dengan "KTP Pasangan" opsional. */
const AC_25_01_ITEMS = ["KTP", "KK", "NPWP", "SLIP_GAJI", "REKENING_KORAN", "SERTIFIKAT", "KTP_PASANGAN"].map(
  (documentType) => ({ documentType, isMandatory: documentType !== "KTP_PASANGAN" }),
);
const COMPANY_002 = "0192b6f3-0002-7000-8000-000000000001";

type Response = { statusCode: number; body: string; json(): unknown };

/** Checklist dokumen lewat checker-maker (api-specs 08 §8.11, §8.12, US-25). */
describe("document checklists", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let checker: TestSession;
  let sales: TestSession;
  let kpr: string;
  let kta: string;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    checker = await createSession(db.owner, { roleId: seedRoleIds.checker });
    sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
    kpr = await insertProduct(db.owner, {
      productCode: "KPR",
      productName: "KPR Subsidi",
      productCategory: "COLLATERAL",
    });
    kta = await insertProduct(db.owner, { productCode: "KTA", productName: "Kredit Tanpa Agunan" });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const send = (session: TestSession, method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    app.inject({ method, url: `/api/v1${url}`, headers: session.headers, payload });
  const expectError = (res: Response, status: number, code: string, message?: string) => {
    expect(res.statusCode, res.body).toBe(status);
    const error = errorEnvelopeSchema.parse(res.json());
    expect(error.code).toBe(code);
    if (message) expect(error.message).toBe(message);
    return error;
  };
  const submit = async (body: object) => {
    const res = await send(maker, "POST", "/document-checklists", body);
    expect(res.statusCode, res.body).toBe(202);
    return changeRequestAcceptedSchema.parse(res.json());
  };
  const approve = async (changeRequestId: string) => {
    const res = await send(checker, "POST", `/change-requests/${changeRequestId}/approve`, {});
    expect(res.statusCode, res.body).toBe(200);
  };
  const checklists = async (query = "") => {
    const res = await send(maker, "GET", `/document-checklists${query}`);
    expect(res.statusCode, res.body).toBe(200);
    return documentChecklistListResponseSchema.parse(res.json());
  };
  const kprKawin = { productId: "", occupation: KARYAWAN_SWASTA, marital: KAWIN, items: AC_25_01_ITEMS };
  const kprBody = () => ({ ...kprKawin, productId: kpr });

  it("AC-25.01 submits a 7-document checklist for approval and lists it in Pending Document Checklist", async () => {
    const accepted = await submit(kprBody());

    expect(accepted).toMatchObject({
      data: { entityType: "DOCUMENT_CHECKLIST", entityId: null, status: "WAITING_APPROVAL" },
      message: "Data submitted for approval",
    });
    const pending = await send(checker, "GET", "/change-requests?entityType=DOCUMENT_CHECKLIST");
    const rows = changeRequestListResponseSchema.parse(pending.json()).data;
    expect(rows.find((row) => row.id === accepted.data.changeRequestId)).toMatchObject({
      displayName: "KPR Subsidi / Karyawan Swasta / Kawin (7 documents)",
      action: "CREATE",
    });
    expect((await checklists()).data).toEqual([]);
  });

  it("AC-25.03 rejects the same combination while it waits for approval, and after it is approved", async () => {
    const [request] = changeRequestListResponseSchema.parse(
      (await send(checker, "GET", "/change-requests?entityType=DOCUMENT_CHECKLIST")).json(),
    ).data;
    const message = "Document checklist already exists for this combination";

    expectError(await send(maker, "POST", "/document-checklists", kprBody()), 409, "CHECKLIST_EXISTS", message);
    await approve(request?.id ?? "");
    expectError(await send(maker, "POST", "/document-checklists", kprBody()), 409, "CHECKLIST_EXISTS", message);
  });

  it("AC-25.01 lists the approved checklist with its documents in the submitted order", async () => {
    const { data, meta } = await checklists(`?productId=${kpr}`);

    expect(meta.totalItems).toBe(1);
    expect(data[0]).toMatchObject({
      product: { id: kpr, productCode: "KPR", productName: "KPR Subsidi" },
      occupation: { paramId: KARYAWAN_SWASTA, paramValue: "Karyawan Swasta" },
      marital: { paramId: KAWIN, paramValue: "Kawin" },
      isActive: true,
      hasPendingChange: false,
    });
    expect(data[0]?.items.map((item) => item.documentName)).toEqual([
      "KTP",
      "KK",
      "NPWP",
      "Slip Gaji",
      "Rekening Koran 3 Bulan",
      "Sertifikat",
      "KTP Pasangan",
    ]);
    expect(data[0]?.items.at(-1)).toMatchObject({ documentType: "KTP_PASANGAN", isMandatory: false });
  });

  it("AC-25.02 rejects a checklist without documents with 422 NO_DOCUMENT_SELECTED", async () => {
    const body = { productId: kta, occupation: PELAJAR, marital: BELUM_KAWIN, items: [] };

    expectError(
      await send(maker, "POST", "/document-checklists", body),
      422,
      "NO_DOCUMENT_SELECTED",
      "Select at least one document",
    );
  });

  it("answers 400 VALIDATION_FAILED per field for an unknown product, occupation, or document", async () => {
    const body = {
      productId: "0192b6f3-ffff-7000-8000-000000000001",
      occupation: "999",
      marital: KAWIN,
      items: [{ documentType: "SIM", isMandatory: true }],
    };

    const error = expectError(await send(maker, "POST", "/document-checklists", body), 400, "VALIDATION_FAILED");
    expect(error.details.map((detail) => detail.field)).toEqual(["productId", "occupation", "items.0.documentType"]);
  });

  it("answers 400 VALIDATION_FAILED when a document is selected twice", async () => {
    const items = [
      { documentType: "KTP", isMandatory: true },
      { documentType: "KTP", isMandatory: false },
    ];
    const body = { productId: kta, occupation: PELAJAR, marital: BELUM_KAWIN, items };

    expectError(await send(maker, "POST", "/document-checklists", body), 400, "VALIDATION_FAILED");
  });

  it("submits a change to the documents, keeps one open request, and applies it on approval", async () => {
    const [current] = (await checklists(`?productId=${kpr}`)).data;
    const id = current?.id ?? "";
    const items = [
      { documentType: "KTP", isMandatory: true },
      { documentType: "BPJS", isMandatory: false },
    ];

    const res = await send(maker, "PUT", `/document-checklists/${id}`, { items, isActive: true });
    expect(res.statusCode, res.body).toBe(202);
    const { data } = changeRequestAcceptedSchema.parse(res.json());
    expect(data).toMatchObject({ entityId: id, status: "WAITING_APPROVAL" });
    expect((await checklists(`?productId=${kpr}`)).data[0]?.hasPendingChange).toBe(true);
    expectError(
      await send(maker, "PUT", `/document-checklists/${id}`, { items, isActive: false }),
      409,
      "PENDING_CHANGE_REQUEST",
    );

    await approve(data.changeRequestId);
    const [changed] = (await checklists(`?productId=${kpr}`)).data;
    expect(changed?.items).toEqual([
      { documentType: "KTP", documentName: "KTP", isMandatory: true },
      { documentType: "BPJS", documentName: "BPJS", isMandatory: false },
    ]);
  });

  it("AC-25.02 rejects a change that removes every document", async () => {
    const [current] = (await checklists(`?productId=${kpr}`)).data;

    expectError(
      await send(maker, "PUT", `/document-checklists/${current?.id}`, { items: [], isActive: true }),
      422,
      "NO_DOCUMENT_SELECTED",
    );
  });

  it("answers 404 NOT_FOUND when changing an unknown checklist", async () => {
    const res = await send(maker, "PUT", "/document-checklists/0192b6f3-ffff-7000-8000-000000000002", {
      items: AC_25_01_ITEMS,
      isActive: true,
    });

    expectError(res, 404, "NOT_FOUND", "Data not found");
  });

  it("never lists a checklist of another company", async () => {
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '002', 'Bank Lain', 'Alamat')",
      [COMPANY_002],
    );
    const otherProduct = await insertProduct(db.owner, { productCode: "KPR", tenantId: COMPANY_002 });
    await db.owner.query(
      `insert into product.document_checklists (id, tenant_id, product_id, occupation, marital)
       values (gen_random_uuid(), $1, $2, '001', '002')`,
      [COMPANY_002, otherProduct],
    );

    expect((await checklists()).meta.totalItems).toBe(1);
  });

  it("answers 403 without the Document Checklist menu: ACCESS_DENIED to view, ACTION_DENIED to submit", async () => {
    expectError(
      await send(sales, "GET", "/document-checklists"),
      403,
      "ACCESS_DENIED",
      "You do not have access to this page",
    );
    expectError(
      await send(sales, "POST", "/document-checklists", kprBody()),
      403,
      "ACTION_DENIED",
      "You do not have permission to perform this action",
    );
  });
});
