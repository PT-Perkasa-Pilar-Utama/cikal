import { type ProductPricingResponse, type ProductPricingUpdateRequest, standardErrors } from "@cikal/contracts";
import { Plus, Send, Trash2 } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { TextField } from "../../components/ui/TextField";
import { PRODUCT_FIELD_LABELS } from "./labels";
import {
  conditionalRateFields,
  emptyPricingRow,
  type PricingFormValues,
  type PricingRowField,
  pricingFormDefaults,
  pricingUpdateRequest,
} from "./pricing-form-values";

interface PricingFormProps {
  pricing: ProductPricingResponse["data"];
  onSubmit: (request: ProductPricingUpdateRequest) => void;
  submitting: boolean;
  /** Pesan error dari server, ditampilkan apa adanya (AC-97.02, AC-97.03). */
  error?: string;
  /** Pesan sukses dari server, contoh "Data submitted for approval" (AC-97.01). */
  notice?: string;
}

const cellInput =
  "w-full min-w-20 rounded bg-neutral-0 px-2 py-2 text-neutral-8 shadow-xs ring-1 ring-neutral-3 outline-none focus:ring-2 focus:ring-primary";

/** Tab "Pricing": biaya produk dan suku bunga per periode berlaku dengan rentang suku bunga Approver (api-specs 08 §8.6). */
export function PricingForm({ pricing, onSubmit, submitting, error, notice }: PricingFormProps) {
  const [values, setValues] = useState<PricingFormValues>(() => pricingFormDefaults(pricing));
  const [invalid, setInvalid] = useState(false);
  const nextKey = useRef(values.rows.length);
  const rateFields: PricingRowField[] = [
    "interestRate",
    ...conditionalRateFields(pricing.interestType),
    "approverRateMin",
    "approverRateMax",
  ];
  const dateFields: PricingRowField[] = ["validFrom", "validTo"];

  const setFee = (name: "adminFee" | "provisionFee" | "salesFee", value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const setCell = (key: number, name: PricingRowField, value: string) =>
    setValues((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.key === key ? { ...row, [name]: value } : row)),
    }));
  const addRow = () => {
    const key = nextKey.current++;
    setValues((current) => ({ ...current, rows: [...current.rows, emptyPricingRow(key)] }));
  };
  const removeRow = (key: number) =>
    setValues((current) => ({ ...current, rows: current.rows.filter((row) => row.key !== key) }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = pricingUpdateRequest(values, pricing.interestType);
    setInvalid(request === undefined);
    if (request !== undefined) onSubmit(request);
  }

  const message = invalid ? standardErrors.VALIDATION_FAILED.message : error;
  const fee = (name: "adminFee" | "provisionFee" | "salesFee") => ({
    name,
    label: PRODUCT_FIELD_LABELS[name] ?? name,
    value: values[name],
    onChange: (event: { target: { value: string } }) => setFee(name, event.target.value),
    placeholder: "Type here",
  });

  return (
    <form aria-label="Pricing" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {notice && !message && <FeedbackMessage type="success">{notice}</FeedbackMessage>}
      {message && <FeedbackMessage type="error">{message}</FeedbackMessage>}
      <div className="grid gap-4 md:grid-cols-3">
        <TextField {...fee("adminFee")} required inputMode="numeric" />
        <TextField {...fee("provisionFee")} required inputMode="decimal" />
        <TextField {...fee("salesFee")} inputMode="numeric" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-neutral-5">
              {[...rateFields, ...dateFields].map((name) => (
                <th key={name} className="p-2 font-semibold">
                  {PRODUCT_FIELD_LABELS[name]}
                </th>
              ))}
              <th className="p-2">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {values.rows.map((row, index) => (
              <tr key={row.key} className="border-t border-neutral-2">
                {[...rateFields, ...dateFields].map((name) => (
                  <td key={name} className="p-2">
                    <input
                      aria-label={`${PRODUCT_FIELD_LABELS[name]} row ${index + 1}`}
                      type={dateFields.includes(name) ? "date" : "text"}
                      inputMode={dateFields.includes(name) ? undefined : "decimal"}
                      value={row[name]}
                      onChange={(event) => setCell(row.key, name, event.target.value)}
                      className={cellInput}
                    />
                  </td>
                ))}
                <td className="p-2">
                  <button
                    type="button"
                    aria-label={`Remove row ${index + 1}`}
                    disabled={values.rows.length === 1}
                    onClick={() => removeRow(row.key)}
                    className="rounded-lg p-2 text-error hover:bg-error-lightest disabled:opacity-40"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between gap-3">
        <Button variant="secondary" onClick={addRow}>
          <Plus size={20} aria-hidden />
          Add Row
        </Button>
        <Button type="submit" disabled={submitting}>
          <Send size={20} aria-hidden />
          Submit
        </Button>
      </div>
    </form>
  );
}
