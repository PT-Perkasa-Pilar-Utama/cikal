import type { InstallmentSimulation } from "@cikal/contracts";
import { formatDate, formatMoney } from "../../lib/format";

const rupiah = (value: string): string => `Rp${formatMoney(value)}`;

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-neutral-1 px-4 py-3">
      <dt className="text-sm text-neutral-6">{label}</dt>
      <dd className="text-lg font-bold text-neutral-9">{value}</dd>
    </div>
  );
}

/** Ringkasan dan tabel jadwal angsuran hasil simulasi (AC-51.01: pokok, bunga, dan sisa pinjaman per baris). */
export function ScheduleTable({ simulation }: { simulation: InstallmentSimulation }) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 md:grid-cols-3">
        <Summary label="Monthly Installment" value={rupiah(simulation.monthlyInstallment)} />
        <Summary label="Total Interest" value={rupiah(simulation.totalInterest)} />
        <Summary label="Total Payment" value={rupiah(simulation.totalPayment)} />
      </dl>
      <div className="overflow-x-auto">
        <table aria-label="Installment Schedule" className="w-full text-left">
          <thead className="bg-neutral-1 text-sm text-neutral-7">
            <tr>
              <th className="px-3 py-2">No</th>
              <th className="px-3 py-2">Due Date</th>
              <th className="px-3 py-2 text-right">Principal</th>
              <th className="px-3 py-2 text-right">Interest</th>
              <th className="px-3 py-2 text-right">Installment</th>
              <th className="px-3 py-2 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {simulation.schedule.map((row) => (
              <tr key={row.installmentNo} className="border-b border-neutral-2">
                <td className="px-3 py-2">{row.installmentNo}</td>
                <td className="px-3 py-2">{formatDate(row.dueDate)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(row.principalAmount)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(row.interestAmount)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(row.installmentAmount)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(row.outstandingAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
