import { type DynamicModule, Module } from "@nestjs/common";
import type { AppConfig } from "../config/config.js";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";
import { MetricsController } from "./metrics.controller.js";
import { MetricsService } from "./metrics.service.js";
import { MonitoringGuard } from "./monitoring.guard.js";
import { OpsSignals } from "./ops-signals.js";
import { ResetController } from "./reset.controller.js";
import { ResetService } from "./reset.service.js";

@Module({})
export class OpsModule {
  /**
   * Rute reset hanya ada bila konfigurasi mengizinkannya; penolakan terjadi saat registrasi, bukan otorisasi.
   * Global agar modul bisnis bisa berlangganan `OpsSignals`, contoh cache lisensi.
   */
  static register(config: AppConfig): DynamicModule {
    const reset = config.resetApi !== null;
    return {
      global: true,
      module: OpsModule,
      controllers: [HealthController, MetricsController, ...(reset ? [ResetController] : [])],
      providers: [HealthService, MetricsService, MonitoringGuard, OpsSignals, ...(reset ? [ResetService] : [])],
      exports: [MetricsService, OpsSignals],
    };
  }
}
