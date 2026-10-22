import type { MenuTreeQuery, MenuTreeResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { licensedModuleCodes } from "../../../../licensed-module-codes.generated.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { MenusRepository } from "../db/menus.repository.js";
import { buildMenuCatalog } from "../domain/menu-catalog.js";

/** Pohon menu untuk dropdown "Menu" dan "Sub Menu" di Role Access (api-specs 03 §3.2). */
@Injectable()
export class ListMenusUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly menus: MenusRepository,
  ) {}

  execute(ctx: RequestContext, query: MenuTreeQuery): Promise<MenuTreeResponse> {
    return this.db.withTenantTx(ctx, async (tx) => ({
      data: buildMenuCatalog(await this.menus.list(tx, query), licensedModuleCodes),
    }));
  }
}
