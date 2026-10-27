import { type ApplicationTab, applicationTabSchema, type FormSection, type StepCode } from "@cikal/contracts";

const SECTION_TABS = {
  application: "detail",
  personal: "personal",
  spouse: "spouse",
  occupation: "occupation",
  business: "business",
  collateral: "collateral",
  documents: "documents",
  "emergency-contact": "emergency-contact",
} as const satisfies Record<FormSection, ApplicationTab>;

/** Tab hasil langkah modul; LKN adalah hasil langkah Survey. */
const STEP_TABS: Partial<Record<StepCode, ApplicationTab>> = {
  SURVEY: "lkn",
  DEDUP: "dedup",
  DUKCAPIL: "dukcapil",
  FRAUD: "fraud",
  RAC: "scoring",
  SCORING: "scoring",
  CREDIT_BUREAU: "credit-bureau",
  DECISION: "decision",
  APPROVAL: "approval",
};

/**
 * Tab "Application Detail" yang relevan (api-specs 12 §12.9 langkah 3, AC-84.03): section yang ada di step form,
 * "Workflow" setelah proses dimulai, dan tab modul untuk langkah aktif proses terbaru; urutan mengikuti kontrak.
 */
export function applicationTabs(
  sections: readonly FormSection[],
  activeSteps: readonly StepCode[],
  hasProcess: boolean,
): ApplicationTab[] {
  const tabs = new Set<ApplicationTab>(sections.map((section) => SECTION_TABS[section]));
  if (hasProcess) tabs.add("workflow");
  for (const step of activeSteps) {
    const tab = STEP_TABS[step];
    if (tab) tabs.add(tab);
  }
  return applicationTabSchema.options.filter((tab) => tabs.has(tab));
}
