import type { ParameterOption, ParamType } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { GeneralParameterPort } from "../../../../platform/http/general-parameter-port.js";
import { GeneralParametersRepository } from "../db/general-parameters.repository.js";

/** General Parameter untuk modul lain lewat `GENERAL_PARAMETER_PORT`, dibaca di transaksi pemanggil (RLS). */
@Injectable()
export class GeneralParameters implements GeneralParameterPort {
  constructor(private readonly parameters: GeneralParametersRepository) {}

  options(tx: Tx, paramType: ParamType, options = { includeInactive: false }): Promise<ParameterOption[]> {
    return this.parameters.options(tx, paramType, options.includeInactive);
  }
}
