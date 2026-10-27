import { type ApplicationInquiryItem, type ApplicationInquirySortField, stepNames } from "@cikal/contracts";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatDateTime, formatMoney } from "../../lib/format";
import { APPLICATION_STATUS_LABELS } from "../application-workflow/labels";
import type { InquirySort } from "./inquiry-params";

interface InquiryTableProps {
  items: ApplicationInquiryItem[];
  sort: InquirySort | undefined;
  onSort: (field: ApplicationInquirySortField) => void;
}

const DASH = "-";

function SortHeader(props: { field: ApplicationInquirySortField; label: string } & Omit<InquiryTableProps, "items">) {
  const active = props.sort?.field === props.field ? props.sort.direction : undefined;
  const Arrow = active === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="p-3" aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : undefined}>
      <button
        type="button"
        onClick={() => props.onSort(props.field)}
        className="inline-flex items-center gap-1 font-semibold whitespace-nowrap hover:text-primary"
      >
        {props.label}
        {active && <Arrow size={14} aria-hidden />}
      </button>
    </th>
  );
}

/** Daftar pengajuan dengan kolom yang bisa diurutkan; Loan ID membuka "Application Detail" (AC-83.03, AC-84.01). */
export function InquiryTable({ items, sort, onSort }: InquiryTableProps) {
  const header = { sort, onSort };
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <SortHeader field="loanId" label="Loan ID" {...header} />
          <SortHeader field="fullName" label="Name" {...header} />
          <th className="p-3">ID Card Number</th>
          <th className="p-3">Product</th>
          <th className="p-3">Branch</th>
          <SortHeader field="requestedLimit" label="Requested Limit" {...header} />
          <th className="p-3">Status</th>
          <th className="p-3">State</th>
          <SortHeader field="submittedAt" label="Submitted Date" {...header} />
          <SortHeader field="modifiedAt" label="Modified Date" {...header} />
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-neutral-2 last:border-0">
            <td className="p-3">
              <Link
                to="/applications/loan/$loanId"
                params={{ loanId: item.loanId }}
                className="font-semibold text-primary hover:underline"
              >
                {item.loanId}
              </Link>
            </td>
            <td className="p-3">{item.fullName}</td>
            <td className="p-3">{item.idCardNumberMasked}</td>
            <td className="p-3">{item.productCode}</td>
            <td className="p-3">{item.branchCode ?? DASH}</td>
            <td className="p-3 text-right">{item.requestedLimit ? formatMoney(item.requestedLimit) : DASH}</td>
            <td className="p-3">{APPLICATION_STATUS_LABELS[item.status]}</td>
            <td className="p-3">{item.state ? stepNames[item.state] : DASH}</td>
            <td className="p-3 whitespace-nowrap">{item.submittedAt ? formatDateTime(item.submittedAt) : DASH}</td>
            <td className="p-3 whitespace-nowrap">{formatDateTime(item.modifiedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
