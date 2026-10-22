import { type DynamicModule, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";
import { licensedModules } from "./licensed-modules.generated.js";
import type { AppConfig } from "./platform/config/config.js";
import { ConfigModule } from "./platform/config/config.module.js";
import { DatabaseModule } from "./platform/db/database.module.js";
import { AccessGuard } from "./platform/http/access.js";
import { ErrorEnvelopeFilter } from "./platform/http/error.filter.js";
import { OpsModule } from "./platform/ops/ops.module.js";
import { StorageModule } from "./platform/storage/storage.module.js";

@Module({})
export class AppModule {
  /** Modul bisnis yang dimuat berasal dari manifest lisensi paket (technical-specs 02 §2.4). */
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        DatabaseModule,
        StorageModule,
        OpsModule.register(config),
        ...licensedModules,
      ],
      providers: [
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        { provide: APP_GUARD, useClass: AccessGuard },
        { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
      ],
    };
  }
}
