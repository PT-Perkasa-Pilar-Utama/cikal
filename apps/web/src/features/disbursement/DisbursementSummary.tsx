import type { DisbursementDetail } from "@cikal/contracts";
import { formatDate, formatMoney } from "../../lib/format";
import { EMPTY_VALUE } from "../application-workflow/labels";
import { ResultFields } from "../application-workflow/ResultLayout";

const date = (value: string | null): string => (value ? formatDate(value) : EMPTY_VALUE);

/** "Disbursement Detail" (api-specs 25 §25.1); tanggal e-polis tidak tampil karena M14 tidak berlisensi (AC-76.06). */
export function DisbursementSummary({ detail }: { detail: DisbursementDetail }) {
  return (
    <section aria-label="Disbursement Detail" className="flex flex-col gap-3 rounded-lg bg-neutral-0 p-6 shadow-s">
      <h2 className="text-lg font-semibold text-neutral-8">Disbursement Detail</h2>
      <ResultFields
        fields={[
          ["Loan ID", detail.loanId],
          ["Disbursement Amount", formatMoney(detail.disbursementAmount)],
          ["Bank Account No", detail.bankAccountNumber ?? EMPTY_VALUE],
          ["Disbursement Date", date(detail.disbursementDate)],
          ["First Installment Date", date(detail.firstInstallmentDate)],
          ["Contract Number", detail.contractNumber ?? EMPTY_VALUE],
          ["Contract Date", date(detail.contractDate)],
        ]}
      />
    </section>
  );
}
