import { Global, Module } from "@nestjs/common";
import { TASK_QUEUE_PORT } from "../../../platform/http/task-queue-port.js";
import { TaskQueueStub } from "./application/task-queue-stub.js";

/**
 * Task Queue: antrean tugas manusia (technical-specs 05 §5.12). Global karena mendaftarkan port platform
 * `TASK_QUEUE_PORT`: Orchestrator membuat tugas lewat port itu tanpa mengimpor modul ini.
 */
@Global()
@Module({
  providers: [TaskQueueStub, { provide: TASK_QUEUE_PORT, useExisting: TaskQueueStub }],
  exports: [TASK_QUEUE_PORT],
})
export class TaskQueueModule {}
