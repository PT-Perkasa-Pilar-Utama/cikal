import {
  type Action,
  type MenuCode,
  menuCodes,
  type ParameterOptionsQuery,
  type ParameterOptionsResponse,
  paramTypeSchema,
} from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { GeneralParameters } from "./general-parameters.js";

const VIEW: Action = "VIEW";
/** Menu yang View-nya membuka dropdown General Parameter (api-specs 06 §6.1). */
const VIEWING_MENUS: readonly MenuCode[] = [
  "APP-ENTRY",
  "APP-INQUIRY",
  ...menuCodes.filter((code) => code.startsWith("MST-")),
];

/** Dropdown General Parameter (api-specs 06 §6.1); nonaktif hanya untuk membaca data lama (AC-21.03). */
@Injectable()
export class ListParameterOptionsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly parameters: GeneralParameters,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
  ) {}

  async execute(
    ctx: RequestContext,
    paramType: string,
    query: ParameterOptionsQuery,
  ): Promise<ParameterOptionsResponse> {
    await this.authorize(ctx);
    const known = paramTypeSchema.safeParse(paramType);
    if (!known.success) throw DomainError.standard("NOT_FOUND");
    return this.db.withTenantTx(ctx, async (tx) => ({
      data: await this.parameters.options(tx, known.data, { includeInactive: query.includeInactive }),
    }));
  }

  private async authorize(ctx: RequestContext): Promise<void> {
    for (const menu of VIEWING_MENUS) {
      if (await this.access.allows(ctx, menu, VIEW)) return;
    }
    await this.access.authorize(ctx, "APP-ENTRY", VIEW);
  }
}
