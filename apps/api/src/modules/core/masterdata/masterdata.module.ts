import { Global, Module } from "@nestjs/common";
import { SYSTEM_PARAMETER_PORT } from "../../../platform/http/system-parameter-port.js";
import { SystemParameters } from "./application/system-parameters.js";
import { SystemParametersRepository } from "./db/system-parameters.repository.js";

/**
 * Master Data: General Parameter, wilayah, asuransi, parameter sistem (technical-specs 05 §5.4).
 * Global karena mendaftarkan port platform `SYSTEM_PARAMETER_PORT`: modul produk memakai port itu tanpa
 * mengimpor modul ini, sehingga master data tetap boleh merujuk tabel produk.
 */
@Global()
@Module({
  providers: [
    SystemParameters,
    SystemParametersRepository,
    { provide: SYSTEM_PARAMETER_PORT, useExisting: SystemParameters },
  ],
  exports: [SYSTEM_PARAMETER_PORT],
})
export class MasterDataModule {}
