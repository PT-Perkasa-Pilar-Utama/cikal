import type { StepCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { productRouteSteps, productRoutes, productRouteVersions } from "./schema.js";

export interface RouteVersionRow {
  id: string;
  versionNumber: number;
}

export interface RouteStepRow {
  stepCode: StepCode;
  isEnabled: boolean;
}

const versionColumns = { id: productRouteVersions.id, versionNumber: productRouteVersions.versionNumber };

/** Akses tabel `product.product_routes`, `product_route_versions`, dan `product_route_steps` (technical-specs 06 §6.7). */
@Injectable()
export class RouteVersionsRepository {
  /** Versi ACTIVE rute produk; indeks unik parsial menjamin paling banyak satu (DM-11). */
  async findActive(tx: Tx, productId: string): Promise<RouteVersionRow | null> {
    const [row] = await tx
      .select(versionColumns)
      .from(productRouteVersions)
      .innerJoin(productRoutes, eq(productRoutes.id, productRouteVersions.routeId))
      .where(and(eq(productRoutes.productId, productId), eq(productRouteVersions.status, "ACTIVE")));
    return row ?? null;
  }

  async findById(tx: Tx, versionId: string): Promise<RouteVersionRow | null> {
    const [row] = await tx
      .select(versionColumns)
      .from(productRouteVersions)
      .where(eq(productRouteVersions.id, versionId));
    return row ?? null;
  }

  async listSteps(tx: Tx, versionId: string): Promise<RouteStepRow[]> {
    return tx
      .select({ stepCode: productRouteSteps.stepCode, isEnabled: productRouteSteps.isEnabled })
      .from(productRouteSteps)
      .where(eq(productRouteSteps.versionId, versionId));
  }
}
