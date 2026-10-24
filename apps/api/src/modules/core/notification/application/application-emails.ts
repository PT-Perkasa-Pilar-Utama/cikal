import { Injectable, type OnModuleInit } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { type DispatchedEvent, Outbox } from "../../../../platform/queue/outbox.js";
import {
  APPLICATION_SUBMITTED_EVENT,
  ApplicationContacts,
  applicationEventPayloadSchema,
  DISBURSEMENT_COMPLETED_EVENT,
} from "../../application/index.js";
import { Notifications } from "./notifications.js";

/** Template per event pengajuan (api-specs 18 §18.1). */
const TEMPLATES: Readonly<Record<string, string>> = {
  [APPLICATION_SUBMITTED_EVENT]: "APP_RECEIVED",
  [DISBURSEMENT_COMPLETED_EVENT]: "APP_DISBURSED",
};

/** Email nasabah dari event outbox pengajuan (api-specs 18 §18.1; AC-50.05, AC-101.01). */
@Injectable()
export class ApplicationEmails implements OnModuleInit {
  constructor(
    private readonly outbox: Outbox,
    private readonly contacts: ApplicationContacts,
    private readonly notifications: Notifications,
  ) {}

  onModuleInit(): void {
    for (const [eventType, templateCode] of Object.entries(TEMPLATES)) {
      this.outbox.on(eventType, (tx, event) => this.notify(tx, event, templateCode));
    }
  }

  private async notify(tx: Tx, event: DispatchedEvent, templateCode: string): Promise<void> {
    const { applicationId, loanId } = applicationEventPayloadSchema.parse(event.payload);
    await this.notifications.send(tx, event.tenantId, {
      eventId: event.id,
      templateCode,
      applicationId,
      recipient: await this.contacts.applicantEmail(tx, applicationId),
      values: { loanId },
    });
  }
}
