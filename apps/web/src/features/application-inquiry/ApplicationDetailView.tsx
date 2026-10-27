import { type ApplicationDetail, type ApplicationTab, stepNames } from "@cikal/contracts";
import { useState } from "react";
import { formatMoney } from "../../lib/format";
import { ApplicationWorkflow } from "../application-workflow/ApplicationWorkflow";
import { APPLICATION_STATUS_LABELS } from "../application-workflow/labels";
import { ResultFields } from "../application-workflow/ResultLayout";
import { DocumentsPanel } from "./DocumentsPanel";
import { DASH, orDash, TAB_LABELS } from "./labels";
import { ModulePanel } from "./ModulePanels";
import { ApplicationPanel, EmergencyContactPanel, OccupationPanel, PersonalPanel } from "./SectionPanels";

function TabPanel({ tab, detail }: { tab: ApplicationTab; detail: ApplicationDetail }) {
  const { sections } = detail;
  switch (tab) {
    case "detail":
      return <ApplicationPanel section={sections.application} />;
    case "personal":
      return <PersonalPanel section={sections.personal} />;
    case "occupation":
      return <OccupationPanel section={sections.occupation} />;
    case "emergency-contact":
      return <EmergencyContactPanel section={sections["emergency-contact"]} />;
    case "documents":
      return <DocumentsPanel applicationId={detail.id} />;
    case "workflow":
      return <ApplicationWorkflow applicationId={detail.id} />;
    default: {
      const latest = detail.processInstances.at(-1);
      return latest ? <ModulePanel tab={tab} applicationId={detail.id} processInstanceId={latest.id} /> : null;
    }
  }
}

/**
 * Ringkasan dan tab "Application Detail" (api-specs 12 §12.9): tab "Detail" terbuka lebih dulu dan hanya tab yang
 * relevan dari API yang tampil (AC-84.01, AC-84.03).
 */
export function ApplicationDetailView({ detail }: { detail: ApplicationDetail }) {
  const [tab, setTab] = useState<ApplicationTab>(detail.tabs[0] ?? "detail");
  const { summary } = detail;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Summary" className="rounded-lg bg-neutral-0 p-6 shadow-s">
        <ResultFields
          fields={[
            ["Loan Number", detail.loanId],
            ["Application Type", orDash(summary.applicationType)],
            ["Loan Amount", summary.loanAmount ? formatMoney(summary.loanAmount) : DASH],
            ["Tenor Approved", orDash(summary.tenorApproved)],
            ["Product", summary.productCode],
            ["Branch", orDash(summary.branchCode)],
            ["Status", APPLICATION_STATUS_LABELS[detail.status]],
            ["State", detail.currentStep ? stepNames[detail.currentStep] : DASH],
          ]}
        />
      </section>
      <div className="rounded-lg bg-neutral-0 shadow-s">
        <div
          role="tablist"
          aria-label="Application Detail"
          className="flex flex-wrap gap-1 border-b border-neutral-2 px-3"
        >
          {detail.tabs.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={item === tab}
              onClick={() => setTab(item)}
              className={`border-b-2 px-3 py-2.5 font-semibold ${
                item === tab ? "border-primary text-primary" : "border-transparent text-neutral-5 hover:text-primary"
              }`}
            >
              {TAB_LABELS[item]}
            </button>
          ))}
        </div>
        <div role="tabpanel" aria-label={TAB_LABELS[tab]} className="p-6">
          <TabPanel tab={tab} detail={detail} />
        </div>
      </div>
    </div>
  );
}
