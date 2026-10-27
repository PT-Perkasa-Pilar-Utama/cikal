import { applicationStatusSchema } from "@cikal/contracts";
import { Filter, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { APPLICATION_STATUS_LABELS } from "../application-workflow/labels";
import { dateRangeError, type InquiryFilter, STATE_OPTIONS } from "./inquiry-params";

const STATUS_OPTIONS = applicationStatusSchema.options.map((status) => ({
  value: status,
  label: APPLICATION_STATUS_LABELS[status],
}));

const stateOf = (value: string) => STATE_OPTIONS.find((option) => option.value === value)?.value;
const statusOf = (value: string) => STATUS_OPTIONS.find((option) => option.value === value)?.value;

interface InquiryFiltersProps {
  q: string;
  onSearch: (q: string) => void;
  onApply: (filter: InquiryFilter) => void;
}

/** Field "Search" dan panel filter "State", "Status", "Submitted Date" yang berlaku setelah "Apply" (AC-83.01 s.d. 83.07). */
export function InquiryFilters({ q, onSearch, onApply }: InquiryFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<InquiryFilter>({});
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    const invalid = dateRangeError(draft);
    setError(invalid);
    if (!invalid) onApply(draft);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-neutral-0 p-6 shadow-s">
      <div className="flex items-end gap-3">
        <div className="max-w-md flex-1">
          <TextField
            label="Search"
            icon={Search}
            placeholder="Loan ID or name"
            value={q}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
        <Button variant="secondary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <Filter size={16} aria-hidden />
          Filter
        </Button>
      </div>
      {open && (
        <div className="flex flex-col gap-4 border-t border-neutral-2 pt-4">
          {error && <FeedbackMessage type="error">{error}</FeedbackMessage>}
          <div className="grid gap-4 md:grid-cols-4">
            <SelectField
              label="State"
              options={STATE_OPTIONS}
              value={draft.state ?? ""}
              onChange={(event) => setDraft({ ...draft, state: stateOf(event.target.value) })}
            />
            <SelectField
              label="Status"
              options={STATUS_OPTIONS}
              value={draft.status ?? ""}
              onChange={(event) => setDraft({ ...draft, status: statusOf(event.target.value) })}
            />
            <TextField
              label="Submitted Date From"
              type="date"
              value={draft.submittedFrom ?? ""}
              onChange={(event) => setDraft({ ...draft, submittedFrom: event.target.value || undefined })}
            />
            <TextField
              label="Submitted Date To"
              type="date"
              value={draft.submittedTo ?? ""}
              onChange={(event) => setDraft({ ...draft, submittedTo: event.target.value || undefined })}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={apply}>Apply</Button>
          </div>
        </div>
      )}
    </div>
  );
}
