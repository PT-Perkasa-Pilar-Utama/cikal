import type { ParameterOption } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { generalParameters } from "./schema.js";

/** Akses tabel `masterdata.general_parameters` (technical-specs 06 §6.6). */
@Injectable()
export class GeneralParametersRepository {
  async options(tx: Tx, paramType: string, includeInactive: boolean): Promise<ParameterOption[]> {
    return tx
      .select({
        paramId: generalParameters.paramId,
        paramValue: generalParameters.paramValue,
        isActive: generalParameters.isActive,
      })
      .from(generalParameters)
      .where(
        and(
          eq(generalParameters.paramType, paramType),
          includeInactive ? undefined : eq(generalParameters.isActive, true),
        ),
      )
      .orderBy(asc(generalParameters.paramId));
  }
}
