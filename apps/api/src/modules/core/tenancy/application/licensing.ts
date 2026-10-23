import { createPublicKey, type KeyObject } from "node:crypto";
import type { LicenseFile, LicensePayload, LicenseStatus, ModuleCode } from "@cikal/contracts";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { licensedModuleCodes } from "../../../../licensed-module-codes.generated.js";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { APP_CONFIG, type AppConfig } from "../../../../platform/config/config.js";
import { boundTenantId, type Tx } from "../../../../platform/db/tenant-tx.js";
import { OpsSignals } from "../../../../platform/ops/ops-signals.js";
import { CompaniesRepository } from "../db/companies.repository.js";
import { LicensesRepository } from "../db/licenses.repository.js";
import { licenseStatus, packagedModules } from "../domain/license-rules.js";
import { verifyLicenseDocument } from "../domain/license-verification.js";

/** Modul di manifest paket ini (PK-01); lisensi tidak bisa menambah modul yang tidak ada di image (PK-02). */
const PACKAGE_MODULES: ReadonlySet<string> = new Set(licensedModuleCodes);

interface VerifiedLicense {
  license: LicensePayload;
  installedAt: Date;
}

/** Lisensi company; `modules` hanya modul berlisensi yang juga ada di paket (PK-04). */
export type LicenseState =
  | { status: "NONE"; modules: ReadonlySet<ModuleCode> }
  | (VerifiedLicense & { status: LicenseStatus; modules: ReadonlySet<ModuleCode> });

const NO_LICENSE: LicenseState = { status: "NONE", modules: new Set() };

/**
 * `isLicensed` Tenant & License (technical-specs 05 §5.2) untuk empat titik LC-04: menu, guard API, editor rute,
 * dan orchestrator. Cache per proses menyimpan lisensi yang sudah diverifikasi; isinya kosong saat proses mulai,
 * jadi setiap lisensi diverifikasi ulang sebelum dipakai pertama kali. Sinyal `cikal_ops` apa pun (pemasangan
 * lisensi di proses lain, reset) membuang cache.
 */
@Injectable()
export class Licensing {
  private readonly logger = new Logger(Licensing.name);
  private readonly publicKey: KeyObject;
  /** `null`: company tanpa lisensi terverifikasi. */
  private readonly cache = new Map<string, VerifiedLicense | null>();

  constructor(
    private readonly licenses: LicensesRepository,
    private readonly companies: CompaniesRepository,
    @Inject(APP_CONFIG) config: AppConfig,
    signals: OpsSignals,
  ) {
    // Kunci rusak menghentikan proses saat start, bukan saat lisensi pertama diperiksa.
    this.publicKey = createPublicKey(config.licensePublicKey);
    signals.on(() => this.invalidate());
  }

  /** Lisensi company yang terpasang di `tx`; tenant dibaca dari transaksi agar selalu sama dengan RLS. */
  async state(tx: Tx): Promise<LicenseState> {
    const tenantId = await boundTenantId(tx);
    if (!tenantId) throw new Error("License state needs a transaction bound to a tenant");
    let verified = this.cache.get(tenantId);
    if (verified === undefined) {
      verified = await this.load(tx, tenantId);
      this.cache.set(tenantId, verified);
    }
    if (!verified) return NO_LICENSE;
    return {
      ...verified,
      status: licenseStatus(verified.license, businessDate(new Date())),
      modules: new Set(packagedModules(verified.license, PACKAGE_MODULES)),
    };
  }

  /** File lisensi bila dokumen bertanda tangan kunci PPU yang tertanam di image (AC-100.02). */
  verify(document: unknown): LicenseFile | null {
    return verifyLicenseDocument(document, this.publicKey);
  }

  /** Modul lisensi yang tidak ada di paket ini (api-specs 04 §4.2 langkah 5). */
  notInPackage(license: LicensePayload): ModuleCode[] {
    return license.modules.filter((code) => !PACKAGE_MODULES.has(code));
  }

  invalidate(): void {
    this.cache.clear();
  }

  /** Dokumen tersimpan diverifikasi ulang; baris yang diubah di database atau milik company lain tidak berlaku. */
  private async load(tx: Tx, tenantId: string): Promise<VerifiedLicense | null> {
    const stored = await this.licenses.findActive(tx);
    if (!stored) return null;
    const license = this.verify(stored.rawDocument)?.license;
    const company = await this.companies.findSummary(tx, tenantId);
    if (!license || license.companyCode !== company?.companyCode) {
      this.logger.error(`License ${stored.licenseNumber} of tenant ${tenantId} failed verification`);
      return null;
    }
    return { license, installedAt: stored.createdAt };
  }
}
