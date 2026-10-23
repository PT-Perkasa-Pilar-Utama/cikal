import { Global, Module } from "@nestjs/common";
import { TASK_QUEUE_PORT } from "../../../platform/http/task-queue-port.js";
import { ApplicationModule } from "../application/index.js";
import { AuditModule } from "../audit/index.js";
import { OrchestratorModule } from "../orchestrator/index.js";
import { ProductModule } from "../product/index.js";
import { AssignTaskUseCase } from "./application/assign-task.use-case.js";
import { ListTasksUseCase } from "./application/list-tasks.use-case.js";
import { ReleaseTaskUseCase } from "./application/release-task.use-case.js";
import { StepTasks } from "./application/step-tasks.js";
import { TaskAccess } from "./application/task-access.js";
import { TaskQueue } from "./application/task-queue.js";
import { HumanTasksRepository } from "./db/human-tasks.repository.js";
import { TasksController } from "./http/tasks.controller.js";

/**
 * Task Queue: antrean tugas manusia (technical-specs 05 §5.12). Global karena mendaftarkan port platform
 * `TASK_QUEUE_PORT`: Orchestrator membuat tugas lewat port itu tanpa mengimpor modul ini, sedangkan `TaskQueue.close`
 * memanggil Orchestrator.
 */
@Global()
@Module({
  imports: [ApplicationModule, AuditModule, OrchestratorModule, ProductModule],
  controllers: [TasksController],
  providers: [
    HumanTasksRepository,
    StepTasks,
    TaskAccess,
    TaskQueue,
    ListTasksUseCase,
    AssignTaskUseCase,
    ReleaseTaskUseCase,
    { provide: TASK_QUEUE_PORT, useExisting: StepTasks },
  ],
  exports: [TASK_QUEUE_PORT, TaskQueue],
})
export class TaskQueueModule {}
