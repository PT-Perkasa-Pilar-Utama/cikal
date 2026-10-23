import pg from "pg";
import PgBoss from "pg-boss";
import { QUEUE_SCHEMA, type QueueDefinition } from "./queue-definition.js";

/**
 * Memasang atau memutakhirkan skema pg-boss dan antrean modul dengan role pemilik skema (MS-03), lalu memberi role
 * aplikasi hak DML. Role aplikasi tidak bisa membuat antrean karena pg-boss membuat tabel partisi per antrean.
 */
export async function installQueues(
  pool: pg.Pool,
  queues: readonly QueueDefinition[],
  appRole: string | null,
): Promise<void> {
  const boss = new PgBoss({
    db: { executeSql: (text, values) => pool.query(text, values) },
    schema: QUEUE_SCHEMA,
    supervise: false,
    schedule: false,
  });
  await boss.start();
  try {
    for (const queue of queues) {
      if (await boss.getQueue(queue.name)) await boss.updateQueue(queue.name, queue);
      else await boss.createQueue(queue.name, queue);
    }
  } finally {
    await boss.stop({ graceful: false });
  }
  if (appRole) await grantQueueAccess(pool, appRole);
}

async function grantQueueAccess(pool: pg.Pool, appRole: string): Promise<void> {
  const schema = pg.escapeIdentifier(QUEUE_SCHEMA);
  const role = pg.escapeIdentifier(appRole);
  await pool.query(`grant usage on schema ${schema} to ${role}`);
  await pool.query(`grant select, insert, update, delete on all tables in schema ${schema} to ${role}`);
  await pool.query(
    `alter default privileges in schema ${schema} grant select, insert, update, delete on tables to ${role}`,
  );
}
