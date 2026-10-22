import { Module } from "@nestjs/common";
import { ChangeRequestsController } from "./http/change-requests.controller.js";

/** Change Request: checker-maker untuk semua data master (technical-specs 05 §5.6). */
@Module({
  controllers: [ChangeRequestsController],
})
export class ChangeRequestModule {}
