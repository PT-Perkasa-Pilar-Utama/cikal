import type { ResetSeed, ResetStateResponse } from "@cikal/contracts";
import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import pg from "pg";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { DomainError } from "../http/domain-error.js";
import { installedModuleData } from "../migrate/installed-modules.js";
import { licenseFileInstaller } from "../migrate/license-file.js";
import { appRoleFor, ResetInProgressError, resetState } from "../migrate/runner.js";
import { StorageService } from "../storage/storage.module.js";
import { OpsSignals } from "./ops-signals.js";

/**
 * Reset state lewat API (api-specs 27 §27.4). Hanya diregistrasi bersama `ResetController`, yaitu bila
 * konfigurasi mengizinkan reset; pool role pemilik skema dibuat saat reset pertama.
 */
@Injectable()
export class ResetService implements OnModuleDestroy {
  private pool: pg.Pool | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly storage: StorageService,
    private readonly signals: OpsSignals,
  ) {}

  async reset(seed: ResetSeed | undefined): Promise<ResetStateResponse> {
    const migrationUrl = this.config.database.migrationUrl;
    if (!this.config.resetApi || !migrationUrl) {
      throw DomainError.standard("SERVICE_UNAVAILABLE", "Reset state is not configured");
    }
    this.pool ??= new pg.Pool({ connectionString: migrationUrl, max: 2 });
    const pool = this.pool;
    const installLicense = licenseFileInstaller(pool, this.config.licenseFile, this.config.licensePublicKey);
    this.signals.emit("reset_started");
    try {
      return await resetState({
        appEnv: this.config.appEnv,
        pool,
        modules: installedModuleData,
        appRole: appRoleFor(this.config.database.url, migrationUrl),
        seed: seed ?? this.config.resetApi.defaultSeed,
        seedContext: {
          userPassword: this.config.resetApi.seedUserPassword,
          masterKey: this.config.masterKey,
          putObject: ({ key, body, contentType }) => this.storage.putObject(key, body, contentType),
        },
        emptyBucket: () => this.storage.emptyBucket(),
        installLicense,
      });
    } catch (error) {
      if (error instanceof ResetInProgressError) {
        throw new DomainError("RESET_IN_PROGRESS", "A reset is already in progress. Please try again later", 409);
      }
      throw error;
    } finally {
      this.signals.emit("reset_finished");
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
