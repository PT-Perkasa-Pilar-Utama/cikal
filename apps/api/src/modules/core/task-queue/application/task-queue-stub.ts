import { Injectable } from "@nestjs/common";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { HumanTaskRequest, TaskQueuePort } from "../../../../platform/http/task-queue-port.js";

/** Stub `TaskQueuePort` (technical-specs 05 §5.12); tabel dan pembuatan tugas dipasang di kartu BE-S2-02. */
@Injectable()
export class TaskQueueStub implements TaskQueuePort {
  async create(_tx: unknown, _request: HumanTaskRequest): Promise<void> {
    throw DomainError.standard("NOT_IMPLEMENTED");
  }
}
