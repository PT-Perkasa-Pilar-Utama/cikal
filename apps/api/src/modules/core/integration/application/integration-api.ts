import type { AdapterOutcome, IntegrationMode, IntegrationPort, ModuleCode, ResolvedConfig } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { APP_CONFIG, type AppConfig } from "../../../../platform/config/config.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { IntegrationCallLogsRepository } from "../db/integration-call-logs.repository.js";
import { IntegrationConfigsRepository } from "../db/integration-configs.repository.js";
import { maskPii } from "../domain/masking.js";
import { AdapterRegistry, type RegisteredAdapter } from "../domain/registry.js";
import { callAdapter } from "./adapter-call.js";

/** Penelusuran satu panggilan untuk log (data dictionary IntegrationCallLog). */
export interface CallContext {
  tenantId: string;
  correlationId: string;
  attempt: number;
  applicationId?: string;
  loanId?: string;
  stepExecutionId?: string;
}

type Failure = Extract<AdapterOutcome<never>, { ok: false }>;

/** Hasil satu panggilan; jawaban sukses membawa penyedia yang menjawab, untuk dicatat di hasil modul (api-specs 20 §20.2). */
export type InvokeOutcome<Res> = (Extract<AdapterOutcome<Res>, { ok: true }> & { providerCode: string }) | Failure;
type Resolution = { ok: true; adapter: RegisteredAdapter; config: ResolvedConfig } | { ok: false; failure: Failure };

const configFailure = (message: string): Failure => ({ ok: false, category: "CONFIG", message });

/**
 * Integration Registry (technical-specs 13 §13.2): resolusi konfigurasi ACTIVE tenant, penolakan adapter simulasi
 * di lingkungan yang tidak mengizinkan (IN-03), batas waktu, klasifikasi error, dan log setiap percobaan (IN-06).
 * Retry kategori sementara dijadwalkan orchestrator (`retry-policy.ts`), bukan di sini.
 */
@Injectable()
export class IntegrationApi {
  private readonly registry = new AdapterRegistry();

  constructor(
    private readonly db: TenantTx,
    private readonly configs: IntegrationConfigsRepository,
    private readonly logs: IntegrationCallLogsRepository,
    @Inject(APP_CONFIG) private readonly appConfig: AppConfig,
  ) {}

  /** Dipanggil modul pemilik adapter saat dimuat. */
  registerAdapter(adapter: RegisteredAdapter): void {
    this.registry.register(adapter);
  }

  /** Mode konfigurasi ACTIVE, atau `NONE` bila modul belum dikonfigurasi (IN-08, IN-09). */
  activeMode(tenantId: string, moduleCode: ModuleCode): Promise<IntegrationMode | "NONE"> {
    return this.db.withSystemTx(
      tenantId,
      async (tx) => (await this.configs.findActive(tx, moduleCode))?.mode ?? "NONE",
    );
  }

  /**
   * Satu percobaan panggilan. Konfigurasi dibaca dan log ditulis di transaksi sendiri, sehingga log tetap ada bila
   * transaksi langkah pemanggil batal. Hanya field kontrak kanonik yang diteruskan ke adapter (IN-11).
   */
  async invoke<Req, Res>(
    port: IntegrationPort<Req, Res>,
    req: Req,
    ctx: CallContext,
    opts: { providerCode?: string } = {},
  ): Promise<InvokeOutcome<Res>> {
    const startedAt = new Date();
    const request = port.request.parse(req);
    const resolution = await this.resolve(ctx.tenantId, port.moduleCode, opts.providerCode);
    const outcome = resolution.ok
      ? await callAdapter(resolution.adapter, resolution.config, request, port.response)
      : resolution.failure;
    // Event IntegrationConfigFailed untuk AUTH dan CONFIG ditulis ke outbox platform dari kartu BE-S3-03.
    await this.db.withSystemTx(ctx.tenantId, (tx) =>
      this.logs.insert(tx, {
        id: uuidv7(),
        tenantId: ctx.tenantId,
        moduleCode: port.moduleCode,
        providerCode: resolution.ok ? resolution.config.providerCode : null,
        direction: "OUTBOUND",
        applicationId: ctx.applicationId ?? null,
        loanId: ctx.loanId ?? null,
        stepExecutionId: ctx.stepExecutionId ?? null,
        correlationId: ctx.correlationId,
        attempt: ctx.attempt,
        startedAt,
        durationMs: Date.now() - startedAt.getTime(),
        status: outcome.ok ? "SUCCESS" : "ERROR",
        errorCategory: outcome.ok ? null : outcome.category,
        errorMessage: outcome.ok ? null : outcome.message,
        requestMasked: maskPii(request),
        responseMasked: outcome.raw === undefined ? null : maskPii(outcome.raw),
      }),
    );
    if (!outcome.ok) return outcome;
    // Jawaban sukses hanya mungkin sesudah konfigurasi diresolusi.
    if (!resolution.ok) throw new Error("Adapter answered without a resolved configuration");
    return { ...outcome, providerCode: resolution.config.providerCode };
  }

  private resolve(tenantId: string, moduleCode: ModuleCode, providerCode?: string): Promise<Resolution> {
    return this.db.withSystemTx(tenantId, async (tx) => {
      const row = await this.configs.findActive(tx, moduleCode, providerCode);
      if (!row) return { ok: false, failure: configFailure("Integration provider not configured") };
      const adapter = this.registry.get(row.providerCode);
      if (!adapter) return { ok: false, failure: configFailure(`Adapter ${row.providerCode} is not installed`) };
      if (adapter.isSimulation && !this.appConfig.allowSimulationAdapters) {
        return { ok: false, failure: configFailure("Simulation adapters are not allowed in this environment") };
      }
      return { ok: true, adapter, config: row };
    });
  }
}
