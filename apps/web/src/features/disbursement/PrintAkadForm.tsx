import type { AkadPrintRequest } from "@cikal/contracts";
import { Printer } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Popup } from "../../components/ui/Popup";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { usePaymentMethods, usePrintAkad, useRiskManagers } from "./api";
import { type FieldErrors, formMessage, hasErrors, requiredErrors, serverFieldErrors } from "./disbursement-values";

type PrintField = keyof AkadPrintRequest;

const EMPTY: AkadPrintRequest = {
  paymentMethod: "",
  bankAccountNumber: "",
  customerAccountNumber: "",
  riskManagerUserId: "",
};

interface PrintAkadFormProps {
  applicationId: string;
  onClose: () => void;
  /** Dipanggil setelah PDF akad mulai diunduh. */
  onPrinted: () => void;
}

/**
 * Popup "Print Akad Form": Payment Method, Bank Account No, Customer Account No, dan Risk Manager wajib (AC-77.02).
 * "Print" mengunduh PDF "Surat Perjanjian Kredit" dari URL bertanda tangan (api-specs 25 §25.3, AC-77.01).
 */
export function PrintAkadForm({ applicationId, onClose, onPrinted }: PrintAkadFormProps) {
  const [values, setValues] = useState<AkadPrintRequest>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<PrintField>>({});
  const methods = usePaymentMethods();
  const riskManagers = useRiskManagers();
  const print = usePrintAkad(applicationId);
  const serverErrors = serverFieldErrors(print.error);
  const loadError = methods.error ?? riskManagers.error;
  const fieldError = (field: PrintField) => errors[field] ?? serverErrors[field];
  const set = (field: PrintField) => (value: string) => setValues((current) => ({ ...current, [field]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    print.reset();
    const missing = requiredErrors(values);
    setErrors(missing);
    if (hasErrors(missing)) return;
    print.mutate(values, {
      onSuccess: (result) => {
        window.open(result.data.downloadUrl, "_self");
        onPrinted();
      },
    });
  }

  const message = loadError?.message ?? formMessage(print.error);
  return (
    <Popup title="Print Akad Form" onClose={onClose}>
      <form aria-label="Print Akad" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {message && <FeedbackMessage type="error">{message}</FeedbackMessage>}
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Payment Method"
            required
            options={(methods.data ?? []).map((option) => ({ value: option.paramId, label: option.paramValue }))}
            value={values.paymentMethod}
            error={fieldError("paymentMethod")}
            onChange={(event) => set("paymentMethod")(event.target.value)}
          />
          <TextField
            label="Bank Account No"
            required
            maxLength={30}
            value={values.bankAccountNumber}
            error={fieldError("bankAccountNumber")}
            onChange={(event) => set("bankAccountNumber")(event.target.value)}
          />
          <TextField
            label="Customer Account No"
            required
            maxLength={30}
            value={values.customerAccountNumber}
            error={fieldError("customerAccountNumber")}
            onChange={(event) => set("customerAccountNumber")(event.target.value)}
          />
          <SelectField
            label="Risk Manager"
            required
            options={(riskManagers.data ?? []).map((user) => ({ value: user.id, label: user.fullName }))}
            value={values.riskManagerUserId}
            error={fieldError("riskManagerUserId")}
            onChange={(event) => set("riskManagerUserId")(event.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={print.isPending}>
            <Printer size={16} aria-hidden />
            Print
          </Button>
        </div>
      </form>
    </Popup>
  );
}
