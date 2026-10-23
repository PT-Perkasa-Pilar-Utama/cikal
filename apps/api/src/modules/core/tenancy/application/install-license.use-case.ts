import type { LicenseFile, LicenseInstallResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { AUDIT_PORT } from "../../../../platform/http/audit-port.js";
import type { UploadedFile } from "../../../../platform/http/multipart.js";
import { publishOpsSignal } from "../../../../platform/ops/ops-signals.js";
import type { AuditTrail } from "../../audit/index.js";
import { LicensesRepository } from "../db/licenses.repository.js";
import { ModuleEntitlementsRepository } from "../db/module-entitlements.repository.js";
import { isInstallable, isJsonFile, licenseFileTypeError, licenseInvalidError } from "../domain/license-rules.js";
import { CompanyDirectory } from "./company-directory.js";
import { Licensing } from "./licensing.js";

/** Label modul di halaman "Audit Trail" (AC-14.01). */
const LICENSE_AUDIT_MODULE = "License";

/** Isi JSON berkas, atau `null` bila bukan JSON yang utuh. */
function parseJson(file: UploadedFile): unknown {
  if (file.truncated) return null;
  try {
    return JSON.parse(file.data.toString("utf8"));
  } catch {
    // JSON rusak sama dengan file lisensi tidak sah (AC-100.02); pemanggil melempar LICENSE_INVALID.
    return null;
  }
}

/**
 * `POST /license` (api-specs 04 §4.2). Lisensi lama tetap berlaku bila file ditolak (AC-100.02). Bila diterima,
 * lisensi lama `REVOKED` dan lisensi baru `ACTIVE` dalam satu transaksi bersama NOTIFY dan audit; menu, guard,
 * editor rute, dan orchestrator memakai daftar modul baru setelah commit (AC-100.01, AC-100.03).
 */
@Injectable()
export class InstallLicenseUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly licensing: Licensing,
    private readonly licenses: LicensesRepository,
    private readonly entitlements: ModuleEntitlementsRepository,
    private readonly companies: CompanyDirectory,
    @Inject(AUDIT_PORT) private readonly audit: AuditTrail,
  ) {}

  async execute(ctx: RequestContext, file: UploadedFile): Promise<LicenseInstallResponse> {
    if (!isJsonFile(file)) throw licenseFileTypeError();
    const verified = this.licensing.verify(parseJson(file));
    if (!verified) throw licenseInvalidError();
    const { license } = verified;
    await this.db.withTenantTx(ctx, async (tx) => {
      const { companyCode } = await this.companies.summary(tx, ctx.tenantId);
      const alreadyInstalled = await this.licenses.exists(tx, license.licenseNumber);
      if (!isInstallable(license, { companyCode, today: businessDate(new Date()), alreadyInstalled })) {
        throw licenseInvalidError();
      }
      await this.replace(tx, ctx, verified);
    });
    this.licensing.invalidate();
    return {
      data: {
        licenseNumber: license.licenseNumber,
        validTo: license.validTo,
        modules: license.modules,
        modulesNotInPackage: this.licensing.notInPackage(license),
      },
      message: "License installed",
    };
  }

  /** Dokumen yang disimpan sama isinya dengan file karena skema file menolak field asing. */
  private async replace(tx: Tx, ctx: RequestContext, document: LicenseFile): Promise<void> {
    const { license } = document;
    const previous = await this.licenses.findActive(tx);
    await this.licenses.revokeActive(tx, ctx.userId);
    const licenseId = uuidv7();
    await this.licenses.insertActive(tx, {
      id: licenseId,
      tenantId: ctx.tenantId,
      licenseNumber: license.licenseNumber,
      deploymentType: license.deploymentType,
      validFrom: license.validFrom,
      validTo: license.validTo,
      maxUsers: license.maxUsers,
      signature: Buffer.from(document.signature, "base64"),
      rawDocument: document,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
    await this.entitlements.insert(tx, { tenantId: ctx.tenantId, licenseId, createdBy: ctx.userId }, license.modules);
    await publishOpsSignal(tx, "license_installed");
    await this.audit.record(tx, ctx, {
      module: LICENSE_AUDIT_MODULE,
      action: "LICENSE_INSTALLED",
      recordId: license.licenseNumber,
      oldData: previous ? { licenseNumber: previous.licenseNumber } : null,
      newData: { licenseNumber: license.licenseNumber, validTo: license.validTo, modules: license.modules },
    });
  }
}
