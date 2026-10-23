import { APPLICATION_SUBMIT_MESSAGES, type ApplicationSubmitResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { PROCESS_START_PORT, type ProcessStartPort } from "../../../../platform/http/process-start-port.js";
import { Outbox } from "../../../../platform/queue/outbox.js";
import { ApplicationsRepository, type DraftRow } from "../db/applications.repository.js";
import { applicationRequiredError } from "../domain/application-section-rules.js";
import { incompleteApplicationError } from "../domain/section-errors.js";
import { storedSectionInputs } from "../domain/stored-sections.js";
import { ApplicationSectionChecks } from "./application-section-checks.js";
import { DraftDocuments } from "./draft-documents.js";
import { DraftFormSections } from "./draft-form-sections.js";
import { StrictSections } from "./strict-sections.js";

/** Event setelah submit untuk email konfirmasi (api-specs 12 §12.8 langkah 6, kartu BE-S3-04). */
export const APPLICATION_SUBMITTED_EVENT = "ApplicationSubmitted";

/**
 * Submit pengajuan dalam satu transaksi (api-specs 12 §12.8; AC-50.01 s.d. AC-50.04, AC-50.07): semua section lolos
 * aturan strict, dokumen wajib lengkap, status `ON_PROGRESS` sehingga data terkunci, proses dimulai dengan rute
 * ACTIVE, lalu event `ApplicationSubmitted` ditulis ke outbox. Klik ganda dengan kunci idempotensi sama mendapat
 * respons pertama dari interceptor.
 */
@Injectable()
export class SubmitApplicationUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationsRepository,
    private readonly forms: DraftFormSections,
    private readonly checks: ApplicationSectionChecks,
    private readonly rules: StrictSections,
    private readonly documents: DraftDocuments,
    private readonly outbox: Outbox,
    @Inject(PROCESS_START_PORT) private readonly processes: ProcessStartPort,
  ) {}

  execute(ctx: RequestContext, id: string): Promise<ApplicationSubmitResponse> {
    const now = new Date();
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.applications.lockOwned(tx, id, ctx.userId);
      if (!draft) throw DomainError.standard("NOT_FOUND");
      if (draft.status !== "DRAFT") {
        throw new DomainError("ALREADY_SUBMITTED", APPLICATION_SUBMIT_MESSAGES.alreadySubmitted, 409);
      }
      await this.checkSections(tx, draft, businessDate(now));
      await this.checkDocuments(tx, draft);
      await this.applications.markSubmitted(tx, draft.id, ctx.userId, now);
      const { processInstanceId } = await this.processes.start(tx, draft.id);
      await this.outbox.publish(tx, {
        tenantId: ctx.tenantId,
        eventType: APPLICATION_SUBMITTED_EVENT,
        aggregateId: draft.id,
        payload: { applicationId: draft.id, loanId: draft.loanId },
      });
      return {
        data: { id: draft.id, loanId: draft.loanId, status: "ON_PROGRESS", processInstanceId },
        message: APPLICATION_SUBMIT_MESSAGES.submitted(draft.loanId),
      };
    });
  }

  /** Langkah 2: aturan strict semua section di `steps[]`; produk tanpa rute ACTIVE `PRODUCT_NOT_AVAILABLE`. */
  private async checkSections(tx: Tx, draft: DraftRow, today: string): Promise<void> {
    const sections = await this.forms.load(tx, draft);
    // Draft selalu punya baris Personal sejak `POST /applications`.
    if (!sections) throw new Error(`Application ${draft.id} has no personal data`);
    const inputs = storedSectionInputs(sections);
    const product = await this.checks.product(tx, inputs.application, today);
    const error = incompleteApplicationError([
      [
        "application",
        applicationRequiredError(inputs.application) ??
          (await this.checks.ruleError(tx, inputs.application, product, true)),
      ],
      ["personal", await this.rules.personalError(tx, draft, inputs.personal, today)],
      ["occupation", await this.rules.occupationError(tx, draft, inputs.occupation)],
      ["emergency-contact", await this.rules.emergencyContactError(tx, draft, inputs.emergencyContact)],
    ]);
    if (error) throw error;
  }

  /** Langkah 3: dokumen wajib checklist lengkap (AC-50.02); tanpa checklist `CHECKLIST_NOT_CONFIGURED` (AC-25.05). */
  private async checkDocuments(tx: Tx, draft: DraftRow): Promise<void> {
    const items = await this.documents.items(tx, draft);
    const { uploadedMandatory, requiredMandatory } = await this.documents.completeness(tx, draft, items);
    if (uploadedMandatory < requiredMandatory) {
      const message = APPLICATION_SUBMIT_MESSAGES.documentsIncomplete(uploadedMandatory, requiredMandatory);
      throw new DomainError("DOCUMENTS_INCOMPLETE", message, 422, [
        { field: "documents", code: "DOCUMENTS_INCOMPLETE", message, section: "documents" },
      ]);
    }
  }
}
