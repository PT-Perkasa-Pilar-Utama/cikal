import type { RouteStepSetting } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { Licensing } from "../../tenancy/index.js";
import { assertRouteStepsLicensed } from "../domain/route-licensing.js";
import { assertMandatoryStepsEnabled } from "../domain/route-rules.js";

/** Aturan rute yang butuh lisensi tenant, dipakai saat Maker mengajukan dan saat Checker menyetujui (LC-04). */
@Injectable()
export class RouteChecks {
  constructor(private readonly licensing: Licensing) {}

  async licensedModules(tx: Tx): Promise<ReadonlySet<string>> {
    return (await this.licensing.state(tx)).modules;
  }

  /**
   * api-specs 08 §8.9 langkah 1 dan 2: langkah wajib menyala, lalu tidak ada langkah modul tak berlisensi.
   * Langkah 3 (`INTEGRATION_NOT_CONFIGURED`, IN-09) dipasang di kartu BE-S2-03 bersama IntegrationConfig.
   */
  assertSteps(steps: readonly RouteStepSetting[], licensedModules: ReadonlySet<string>): void {
    assertMandatoryStepsEnabled(steps, licensedModules);
    assertRouteStepsLicensed(steps, licensedModules);
  }
}
