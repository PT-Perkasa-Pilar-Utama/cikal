import type { DeploymentType, LicenseResponse, LicenseStatus } from "@cikal/contracts";
import { formatDate, formatDateTime } from "../../lib/format";

type License = LicenseResponse["data"];

const DEPLOYMENT_TYPE_LABELS: Record<DeploymentType, string> = { SAAS: "SaaS", ON_PREMISE: "On-Premise" };
const STATUS_LABELS: Record<LicenseStatus, string> = { ACTIVE: "Active", EXPIRED: "Expired" };

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-neutral-5">{label}</dt>
      <dd className="font-semibold text-neutral-8">{value}</dd>
    </div>
  );
}

/** Masa berlaku dan daftar modul lisensi ACTIVE, termasuk modul yang tidak ada di paket (api-specs 04 §4.1, AC-100.01). */
export function LicenseDetails({ license }: { license: License }) {
  return (
    <>
      <section aria-label="License details" className="rounded-lg bg-neutral-0 p-6 shadow-s">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Detail label="License Number" value={license.licenseNumber} />
          <Detail label="Company Code" value={license.companyCode} />
          <Detail label="Deployment Type" value={DEPLOYMENT_TYPE_LABELS[license.deploymentType]} />
          <Detail label="Status" value={STATUS_LABELS[license.status]} />
          <Detail label="Valid From" value={formatDate(license.validFrom)} />
          <Detail label="Valid To" value={formatDate(license.validTo)} />
          <Detail label="Installed At" value={formatDateTime(license.installedAt)} />
        </dl>
      </section>
      <div className="overflow-x-auto rounded-lg bg-neutral-0 shadow-s">
        <table className="w-full" aria-label="Licensed modules">
          <thead>
            <tr className="border-b border-neutral-2 text-left text-neutral-5">
              <th className="p-3">Module Code</th>
              <th className="p-3">Module Name</th>
            </tr>
          </thead>
          <tbody>
            {license.modules.map((module) => (
              <tr key={module.moduleCode} className="border-b border-neutral-2 last:border-0">
                <td className="p-3 font-semibold text-neutral-8">{module.moduleCode}</td>
                <td className="p-3">{module.moduleName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
