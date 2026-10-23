import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { integrationCallLogs } from "./schema.js";

export type CallLogInsert = typeof integrationCallLogs.$inferInsert;

/** Akses tabel `integration.integration_call_logs`; hanya tambah baris (IN-06). */
@Injectable()
export class IntegrationCallLogsRepository {
  async insert(tx: Tx, row: CallLogInsert): Promise<void> {
    await tx.insert(integrationCallLogs).values(row);
  }
}
