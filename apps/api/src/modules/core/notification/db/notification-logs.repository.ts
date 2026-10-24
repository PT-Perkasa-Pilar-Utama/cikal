import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { notificationLogs } from "./schema.js";

/** Akses tabel `notification.notification_logs` (technical-specs 06 §6.8). */
@Injectable()
export class NotificationLogsRepository {
  async exists(tx: Tx, eventId: string, templateCode: string): Promise<boolean> {
    const [row] = await tx
      .select({ id: notificationLogs.id })
      .from(notificationLogs)
      .where(and(eq(notificationLogs.eventId, eventId), eq(notificationLogs.templateCode, templateCode)));
    return row !== undefined;
  }

  async insert(tx: Tx, row: typeof notificationLogs.$inferInsert): Promise<void> {
    await tx.insert(notificationLogs).values(row);
  }
}
