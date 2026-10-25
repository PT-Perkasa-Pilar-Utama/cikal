import { applicationSubmitResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.factory.js";
import { DISBURSEMENT_COMPLETED_EVENT } from "../src/modules/core/application/index.js";
import type { MemoryEmailAdapter } from "../src/modules/core/notification/adapters/memory-email.adapter.js";
import { Notifications } from "../src/modules/core/notification/application/notifications.js";
import { EMAIL_PORT } from "../src/modules/core/notification/ports/email.port.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { Outbox } from "../src/platform/queue/outbox.js";
import { completeDraft, sectionClient, submittableProduct } from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const COMPANY_001 = seedCompanyIds.company001;

/** Email nasabah dari event outbox pengajuan (api-specs 18 §18.1; AC-50.05, TRM_NTF_004, TRM_NTF_006). */
describe("application notifications", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let email: MemoryEmailAdapter;
  let productId: string;
  let client: ReturnType<typeof sectionClient>;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    email = app.get<MemoryEmailAdapter>(EMAIL_PORT);
    const role = await createRole(db.owner, "Sales Notifikasi", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    sales = await createSession(db.owner, { roleId: role });
    productId = await submittableProduct(db.owner);
    client = sectionClient(app);
  });

  afterEach(() => {
    email.sent.length = 0;
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  /** Submit pengajuan lengkap dan kirim event `ApplicationSubmitted`-nya seperti worker outbox. */
  const submitAndDispatch = async (personal: object) => {
    const id = await completeDraft(db.owner, client, sales, productId, { personal });
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${id}/submit`,
      headers: { ...sales.headers, "idempotency-key": uuidv7() },
    });
    expect(res.statusCode, res.body).toBe(200);
    const eventId = await eventOf(id, "ApplicationSubmitted");
    await app.get(Outbox).dispatch({ tenantId: COMPANY_001, eventId });
    return { id, eventId, loanId: applicationSubmitResponseSchema.parse(res.json()).data.loanId };
  };
  const eventOf = async (applicationId: string, eventType: string) => {
    const { rows } = await db.owner.query<{ id: string }>(
      "select id from platform.outbox_events where aggregate_id = $1 and event_type = $2",
      [applicationId, eventType],
    );
    const id = rows[0]?.id;
    if (!id) throw new Error(`No ${eventType} event for ${applicationId}`);
    return id;
  };
  const logsOf = async (applicationId: string) =>
    (
      await db.owner.query(
        "select template_code, recipient, status, error_message from notification.notification_logs where application_id = $1",
        [applicationId],
      )
    ).rows;

  it("AC-50.05 emails the applicant that the application was received", async () => {
    const { id, loanId } = await submitAndDispatch({ email: "rudi@contoh.com" });

    expect(email.sent).toEqual([
      { to: "rudi@contoh.com", subject: `Pengajuan kredit ${loanId} telah kami terima`, body: expect.any(String) },
    ]);
    expect(await logsOf(id)).toEqual([
      { template_code: "APP_RECEIVED", recipient: "rudi@contoh.com", status: "SENT", error_message: null },
    ]);
  });

  it("TRM_NTF_006 skips the email when the applicant has no email address", async () => {
    const { id } = await submitAndDispatch({});

    expect(email.sent).toEqual([]);
    expect(await logsOf(id)).toEqual([
      {
        template_code: "APP_RECEIVED",
        recipient: "",
        status: "SKIPPED",
        error_message: "Notification skipped - no email",
      },
    ]);
  });

  it("logs FAILED without failing the event when the mail server refuses the email", async () => {
    vi.spyOn(email, "send").mockRejectedValueOnce(new Error("550 mailbox unavailable"));

    const { id, eventId } = await submitAndDispatch({ email: "rudi@contoh.com" });

    expect(await logsOf(id)).toEqual([
      {
        template_code: "APP_RECEIVED",
        recipient: "rudi@contoh.com",
        status: "FAILED",
        error_message: "550 mailbox unavailable",
      },
    ]);
    const { rows } = await db.owner.query("select published_at from platform.outbox_events where id = $1", [eventId]);
    expect(rows[0]?.published_at).toEqual(expect.any(Date));
  });

  it("sends one email when the outbox delivers the same event again", async () => {
    const { id, eventId } = await submitAndDispatch({ email: "rudi@contoh.com" });
    await db.owner.query("update platform.outbox_events set published_at = null where id = $1", [eventId]);

    await app.get(Outbox).dispatch({ tenantId: COMPANY_001, eventId });

    expect(email.sent).toHaveLength(1);
    expect(await logsOf(id)).toHaveLength(1);
  });

  it("TRM_NTF_004 emails the applicant that the credit was disbursed", async () => {
    const id = await completeDraft(db.owner, client, sales, productId, { personal: { email: "rudi@contoh.com" } });
    const eventId = await app.get(TenantTx).withTenantTx({ tenantId: COMPANY_001, userId: sales.userId }, (tx) =>
      app.get(Outbox).publish(tx, {
        tenantId: COMPANY_001,
        eventType: DISBURSEMENT_COMPLETED_EVENT,
        aggregateId: id,
        payload: { applicationId: id, loanId: "20102026KTA0000013" },
      }),
    );

    await app.get(Outbox).dispatch({ tenantId: COMPANY_001, eventId });

    expect(email.sent).toEqual([
      { to: "rudi@contoh.com", subject: "Kredit 20102026KTA0000013 telah dicairkan", body: expect.any(String) },
    ]);
  });

  it("logs FAILED when the company has no template for the email", async () => {
    await app.get(TenantTx).withTenantTx({ tenantId: COMPANY_001, userId: sales.userId }, (tx) =>
      app.get(Notifications).send(tx, COMPANY_001, {
        eventId: uuidv7(),
        templateCode: "RESET_PASSWORD",
        applicationId: null,
        recipient: "rudi@contoh.com",
        values: {},
      }),
    );

    const { rows } = await db.owner.query(
      "select status, error_message from notification.notification_logs where template_code = 'RESET_PASSWORD'",
    );
    expect(rows).toEqual([{ status: "FAILED", error_message: "Email template RESET_PASSWORD is not configured" }]);
    expect(email.sent).toEqual([]);
  });
});
