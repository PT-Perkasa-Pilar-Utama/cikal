import type { StepCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { productRouteSteps, productRoutes, productRouteVersions, type RouteVersionStatus } from "./schema.js";

export interface RouteVersionRow {
  id: string;
  versionNumber: number;
}

export interface RouteStepRow {
  stepCode: StepCode;
  isEnabled: boolean;
}

export interface RouteVersionDetail extends RouteVersionRow {
  routeId: string;
  productId: string;
  status: RouteVersionStatus;
  effectiveFrom: Date | null;
}

/** Pelaku penulisan beserta tenant-nya; tenant selalu dari sesi atau job, tidak pernah dari request. */
export interface RouteWriter {
  tenantId: string;
  userId: string | null;
}

const versionColumns = { id: productRouteVersions.id, versionNumber: productRouteVersions.versionNumber };
const detailColumns = {
  ...versionColumns,
  routeId: productRouteVersions.routeId,
  productId: productRoutes.productId,
  status: productRouteVersions.status,
  effectiveFrom: productRouteVersions.effectiveFrom,
};

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

  /** Semua versi rute produk, terbaru lebih dulu. */
  async listVersions(tx: Tx, productId: string): Promise<RouteVersionDetail[]> {
    return tx
      .select(detailColumns)
      .from(productRouteVersions)
      .innerJoin(productRoutes, eq(productRoutes.id, productRouteVersions.routeId))
      .where(eq(productRoutes.productId, productId))
      .orderBy(desc(productRouteVersions.versionNumber));
  }

  async findDetailById(tx: Tx, versionId: string): Promise<RouteVersionDetail | null> {
    const [row] = await tx
      .select(detailColumns)
      .from(productRouteVersions)
      .innerJoin(productRoutes, eq(productRoutes.id, productRouteVersions.routeId))
      .where(eq(productRouteVersions.id, versionId));
    return row ?? null;
  }

  /** Produk yang punya versi ACTIVE (`hasActiveRoute`, AC-20.06). */
  async productIdsWithActiveRoute(tx: Tx, productIds: readonly string[]): Promise<Set<string>> {
    if (productIds.length === 0) return new Set();
    const rows = await tx
      .select({ productId: productRoutes.productId })
      .from(productRoutes)
      .innerJoin(productRouteVersions, eq(productRouteVersions.routeId, productRoutes.id))
      .where(and(inArray(productRoutes.productId, [...productIds]), eq(productRouteVersions.status, "ACTIVE")));
    return new Set(rows.map((row) => row.productId));
  }

  /**
   * Rute produk, dibuat bila belum ada, lalu dikunci `FOR UPDATE` sehingga pengajuan dan aktivasi versi satu
   * produk berjalan bergantian (nomor versi berikutnya dan satu versi ACTIVE).
   */
  async lockRoute(tx: Tx, productId: string, writer: RouteWriter): Promise<string> {
    await tx
      .insert(productRoutes)
      .values({
        id: uuidv7(),
        tenantId: writer.tenantId,
        productId,
        createdBy: writer.userId,
        updatedBy: writer.userId,
      })
      .onConflictDoNothing({ target: productRoutes.productId });
    const [row] = await tx
      .select({ id: productRoutes.id })
      .from(productRoutes)
      .where(eq(productRoutes.productId, productId))
      .for("update");
    // Baris baru atau yang sudah ada selalu terbaca di transaksi yang sama.
    if (!row) throw new Error(`Route of product ${productId} was not created`);
    return row.id;
  }

  /** Versi `DRAFT` baru beserta langkah yang dikirim editor (api-specs 08 §8.9 langkah 6). */
  async insertDraft(
    tx: Tx,
    version: { id: string; routeId: string; versionNumber: number; effectiveFrom: Date | null },
    steps: readonly RouteStepRow[],
    writer: RouteWriter,
  ): Promise<void> {
    const audit = { tenantId: writer.tenantId, createdBy: writer.userId, updatedBy: writer.userId };
    await tx.insert(productRouteVersions).values({ ...version, ...audit, status: "DRAFT" });
    await tx
      .insert(productRouteSteps)
      .values(steps.map((step) => ({ ...step, ...audit, id: uuidv7(), versionId: version.id })));
  }

  async setStatus(
    tx: Tx,
    versionId: string,
    change: { status: RouteVersionStatus; effectiveFrom?: Date },
    userId: string | null,
  ): Promise<void> {
    await tx
      .update(productRouteVersions)
      .set({ ...change, updatedAt: new Date(), updatedBy: userId })
      .where(eq(productRouteVersions.id, versionId));
  }

  /** Versi ACTIVE rute menjadi `SUPERSEDED` sebelum versi baru diaktifkan (DM-11). */
  async supersedeActive(tx: Tx, routeId: string, userId: string | null): Promise<void> {
    await tx
      .update(productRouteVersions)
      .set({ status: "SUPERSEDED", updatedAt: new Date(), updatedBy: userId })
      .where(and(eq(productRouteVersions.routeId, routeId), eq(productRouteVersions.status, "ACTIVE")));
  }
}
