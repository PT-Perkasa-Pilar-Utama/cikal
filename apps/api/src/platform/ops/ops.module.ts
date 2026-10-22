import { type DynamicModule, Module } from "@nestjs/common";
import type { AppConfig } from "../config/config.js";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";
import { MonitoringGuard } from "./monitoring.guard.js";
import { ResetController } from "./reset.controller.js";

@Module({})
export class OpsModule {
  /** Rute reset hanya ada bila konfigurasi mengizinkannya; penolakan terjadi saat registrasi, bukan otorisasi. */
  static register(config: AppConfig): DynamicModule {
    return {
      module: OpsModule,
      controllers: config.resetApi ? [HealthController, ResetController] : [HealthController],
      providers: [HealthService, MonitoringGuard],
    };
  }
}
