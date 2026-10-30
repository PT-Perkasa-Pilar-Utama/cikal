import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../../../platform/config/config.js";
import { GENERAL_PARAMETER_PORT } from "../../../platform/http/general-parameter-port.js";
import { SYSTEM_PARAMETER_PORT } from "../../../platform/http/system-parameter-port.js";
import { OksaraRegionAdapter } from "./adapters/oksara-region.adapter.js";
import { SimulationRegionAdapter } from "./adapters/simulation-region.adapter.js";
import { GeneralParameters } from "./application/general-parameters.js";
import { GetRegionSyncUseCase } from "./application/get-region-sync.use-case.js";
import { Insurances } from "./application/insurances.js";
import { ListInsurancesUseCase } from "./application/list-insurances.use-case.js";
import { ListParameterOptionsUseCase } from "./application/list-parameter-options.use-case.js";
import { ListRegionOptionsUseCase } from "./application/list-region-options.use-case.js";
import { RegionSync } from "./application/region-sync.js";
import { RegionSyncLauncher } from "./application/region-sync-launcher.js";
import { ScheduledRegionSync } from "./application/scheduled-region-sync.js";
import { SearchRegionsUseCase } from "./application/search-regions.use-case.js";
import { StartRegionSyncUseCase } from "./application/start-region-sync.use-case.js";
import { SystemParameters } from "./application/system-parameters.js";
import { GeneralParametersRepository } from "./db/general-parameters.repository.js";
import { InsurancesRepository } from "./db/insurances.repository.js";
import { RegionSnapshotsRepository } from "./db/region-snapshots.repository.js";
import { RegionSyncsRepository } from "./db/region-syncs.repository.js";
import { RegionsRepository } from "./db/regions.repository.js";
import { SystemParametersRepository } from "./db/system-parameters.repository.js";
import { InsurancesController } from "./http/insurances.controller.js";
import { ParametersController } from "./http/parameters.controller.js";
import { RegionsController } from "./http/regions.controller.js";
import { RegionSyncJob } from "./jobs/region-sync.job.js";
import { REGION_DATA_PORT, type RegionDataPort } from "./ports/region-data.port.js";

/** Adapter Oksara bila kunci tersedia; tanpa kunci adapter simulasi, yang tunduk pada IN-03. */
function regionDataAdapter(config: AppConfig): RegionDataPort {
  if (config.regionApi.apiKey) return new OksaraRegionAdapter(config.regionApi.url, config.regionApi.apiKey);
  return new SimulationRegionAdapter(config.allowSimulationAdapters);
}

/**
 * Master Data: General Parameter, wilayah, asuransi, parameter sistem (technical-specs 05 §5.4).
 * Global karena mendaftarkan port platform `SYSTEM_PARAMETER_PORT` dan `GENERAL_PARAMETER_PORT`: modul produk
 * memakai port itu tanpa mengimpor modul ini, sehingga master data tetap boleh merujuk tabel produk.
 */
@Global()
@Module({
  controllers: [ParametersController, RegionsController, InsurancesController],
  providers: [
    SystemParameters,
    SystemParametersRepository,
    { provide: SYSTEM_PARAMETER_PORT, useExisting: SystemParameters },
    GeneralParametersRepository,
    GeneralParameters,
    { provide: GENERAL_PARAMETER_PORT, useExisting: GeneralParameters },
    ListParameterOptionsUseCase,
    InsurancesRepository,
    Insurances,
    ListInsurancesUseCase,
    { provide: REGION_DATA_PORT, inject: [APP_CONFIG], useFactory: regionDataAdapter },
    RegionsRepository,
    RegionSnapshotsRepository,
    RegionSyncsRepository,
    RegionSync,
    RegionSyncLauncher,
    ScheduledRegionSync,
    RegionSyncJob,
    ListRegionOptionsUseCase,
    SearchRegionsUseCase,
    StartRegionSyncUseCase,
    GetRegionSyncUseCase,
  ],
  exports: [SYSTEM_PARAMETER_PORT, GENERAL_PARAMETER_PORT, Insurances],
})
export class MasterDataModule {}
