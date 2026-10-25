import { formatDate, formatMoney } from "../../lib/format";
import { useCreditBureauResult, useFraudResult } from "./api";
import { EMPTY_VALUE, IP_STATUS_LABELS, outcomeLabel, VELOCITY_DIMENSION_LABELS, yesNo } from "./labels";
import { ResultFields, ResultState, ResultTable } from "./ResultLayout";
import type { StepResultProps } from "./step-result-props";

const WINDOW_UNIT_LABELS = { DAY: "day", HOUR: "hour" } as const;

/** Klik langkah "Fraud": blacklist, cek IP, dan aturan velocity (api-specs 21 §21.2; AC-65.02). */
export function FraudResult({ applicationId, processInstanceId }: StepResultProps) {
  const { data, error } = useFraudResult(applicationId, processInstanceId);
  return (
    <ResultState data={data?.data} error={error}>
      {(fraud) => (
        <>
          <ResultFields
            fields={[
              ["Result", outcomeLabel(fraud.outcome)],
              ["Blacklisted", yesNo(fraud.isBlacklisted)],
              ["IP Check", IP_STATUS_LABELS[fraud.ipCheck.status]],
              ["IP Address", fraud.ipCheck.ipAddress ?? EMPTY_VALUE],
            ]}
          />
          <ResultTable
            caption="Velocity"
            headers={["Dimension", "Window", "Max Count", "Actual Count", "Exceeded"]}
            rows={fraud.velocityHits.map((hit) => [
              VELOCITY_DIMENSION_LABELS[hit.dimension],
              `${hit.windowValue} ${WINDOW_UNIT_LABELS[hit.windowUnit]}`,
              hit.maxCount,
              hit.actualCount,
              yesNo(hit.exceeded),
            ])}
          />
        </>
      )}
    </ResultState>
  );
}

/** Klik langkah "SLIK": kolektibilitas terburuk dan fasilitas dari laporan biro kredit (api-specs 23 §23.3). */
export function CreditBureauResult({ applicationId, processInstanceId }: StepResultProps) {
  const { data, error } = useCreditBureauResult(applicationId, processInstanceId);
  return (
    <ResultState data={data?.data} error={error}>
      {(report) => (
        <>
          <ResultFields
            fields={[
              ["Result", report.label],
              ["Quality", report.quality],
              ["Report Date", report.reportDate ? formatDate(report.reportDate) : EMPTY_VALUE],
              ["Report Reference", report.reportReference ?? EMPTY_VALUE],
            ]}
          />
          <ResultTable
            caption="Facilities"
            headers={[
              "Lender",
              "Facility Type",
              "Plafond",
              "Outstanding",
              "Collectibility",
              "Days Past Due",
              "Condition",
            ]}
            rows={report.facilities.map((facility) => [
              facility.lenderName,
              facility.facilityType,
              formatMoney(facility.plafond),
              formatMoney(facility.outstanding),
              facility.collectibility,
              facility.daysPastDue,
              facility.condition === "ACTIVE" ? "Active" : "Closed",
            ])}
          />
        </>
      )}
    </ResultState>
  );
}
