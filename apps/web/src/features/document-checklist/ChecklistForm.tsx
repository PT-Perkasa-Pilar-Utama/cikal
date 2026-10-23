import { type DocumentChecklistCreateRequest, type ParameterOption, standardErrors } from "@cikal/contracts";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { SelectField } from "../../components/ui/SelectField";
import { Switch } from "../../components/ui/Switch";

interface ChecklistFormProps {
  products: readonly { id: string; productName: string }[];
  occupations: readonly ParameterOption[];
  maritals: readonly ParameterOption[];
  documents: readonly ParameterOption[];
  onSubmit: (request: DocumentChecklistCreateRequest) => void;
  submitting: boolean;
  /** Pesan error dari server, ditampilkan apa adanya (AC-25.02, AC-25.03). */
  error?: string;
}

const toOptions = (values: readonly ParameterOption[]) =>
  values.map((value) => ({ value: value.paramId, label: value.paramValue }));

/**
 * Form "New Document Checklist" (api-specs 08 §8.11): Product, Occupation, Marital, lalu centang dokumen. Dokumen
 * yang dicentang wajib kecuali toggle "Mandatory" dimatikan. Tanpa dokumen, server menjawab "Select at least one
 * document" dan pesannya tampil apa adanya (AC-25.02).
 */
export function ChecklistForm({
  products,
  occupations,
  maritals,
  documents,
  onSubmit,
  submitting,
  error,
}: ChecklistFormProps) {
  const [productId, setProductId] = useState("");
  const [occupation, setOccupation] = useState("");
  const [marital, setMarital] = useState("");
  /** Dokumen yang dicentang dan status wajibnya. */
  const [selected, setSelected] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [invalid, setInvalid] = useState(false);

  const toggle = (documentType: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Map(current);
      if (checked) next.set(documentType, true);
      else next.delete(documentType);
      return next;
    });
  const setMandatory = (documentType: string, isMandatory: boolean) =>
    setSelected((current) => new Map(current).set(documentType, isMandatory));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const complete = productId !== "" && occupation !== "" && marital !== "";
    setInvalid(!complete);
    if (!complete) return;
    const items = documents.flatMap((document) => {
      const isMandatory = selected.get(document.paramId);
      return isMandatory === undefined ? [] : [{ documentType: document.paramId, isMandatory }];
    });
    onSubmit({ productId, occupation, marital, items });
  }

  const message = invalid ? standardErrors.VALIDATION_FAILED.message : error;

  return (
    <form aria-label="Document Checklist" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {message && <FeedbackMessage type="error">{message}</FeedbackMessage>}
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          label="Product"
          required
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          options={products.map((product) => ({ value: product.id, label: product.productName }))}
        />
        <SelectField
          label="Occupation"
          required
          value={occupation}
          onChange={(event) => setOccupation(event.target.value)}
          options={toOptions(occupations)}
        />
        <SelectField
          label="Marital"
          required
          value={marital}
          onChange={(event) => setMarital(event.target.value)}
          options={toOptions(maritals)}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold text-neutral-7">Documents</legend>
        {documents.map((document) => {
          const isMandatory = selected.get(document.paramId);
          return (
            <div
              key={document.paramId}
              className="flex items-center justify-between gap-4 border-b border-neutral-2 py-2 last:border-0"
            >
              <label className="flex cursor-pointer items-center gap-3 text-neutral-8">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={isMandatory !== undefined}
                  onChange={(event) => toggle(document.paramId, event.target.checked)}
                />
                {document.paramValue}
              </label>
              {isMandatory !== undefined && (
                <Switch
                  label={`Mandatory ${document.paramValue}`}
                  checked={isMandatory}
                  onChange={(checked) => setMandatory(document.paramId, checked)}
                />
              )}
            </div>
          );
        })}
      </fieldset>
      <div className="flex justify-end gap-3">
        <Link
          to="/master/checklists"
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-neutral-0 px-4 py-2.5 font-semibold text-primary hover:bg-primary-light/40"
        >
          <ArrowLeft size={20} aria-hidden />
          Back
        </Link>
        <Button type="submit" disabled={submitting}>
          <Send size={20} aria-hidden />
          Submit
        </Button>
      </div>
    </form>
  );
}
