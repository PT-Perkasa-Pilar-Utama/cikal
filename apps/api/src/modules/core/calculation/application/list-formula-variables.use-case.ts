import type { FormulaVariableListResponse, FormulaVariableQuery } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { Licensing } from "../../tenancy/index.js";
import { FORMULA_VARIABLES, type FormulaVariableDefinition } from "../domain/formula-variables.js";

const matches = (q: string | undefined, code: string, variable: FormulaVariableDefinition): boolean =>
  !q || `${code} ${variable.label}`.toLowerCase().includes(q.toLowerCase());

/**
 * Dropdown "Field" kriteria scoring dan RAC serta editor rumus (api-specs 09 §9.2): `MST-SCORING` VIEW atau
 * `MST-FORMULA` VIEW. Variabel milik modul yang tidak berlisensi tidak dikembalikan (LC-04).
 */
@Injectable()
export class ListFormulaVariablesUseCase {
  constructor(
    private readonly db: TenantTx,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
    private readonly licensing: Licensing,
  ) {}

  async execute(ctx: RequestContext, query: FormulaVariableQuery): Promise<FormulaVariableListResponse> {
    const [scoring, formula] = await Promise.all([
      this.access.allows(ctx, "MST-SCORING", "VIEW"),
      this.access.allows(ctx, "MST-FORMULA", "VIEW"),
    ]);
    if (!scoring && !formula) await this.access.authorize(ctx, "MST-SCORING", "VIEW");
    const licensed = await this.db.withTenantTx(ctx, async (tx) => (await this.licensing.state(tx)).modules);
    const entries: [string, FormulaVariableDefinition][] = Object.entries(FORMULA_VARIABLES);
    return {
      data: entries
        .filter(([code, variable]) => licensed.has(variable.moduleCode) && matches(query.q, code, variable))
        .filter(([, variable]) => query.usage !== "SCORING" || variable.usableInScoring)
        .map(([variableCode, variable]) => ({
          variableCode,
          label: variable.unit ? `${variable.label} (${variable.unit})` : variable.label,
          dataType: variable.dataType,
          paramType: variable.paramType ?? null,
          source: variable.source,
        })),
    };
  }
}
