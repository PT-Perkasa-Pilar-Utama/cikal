import { auditEventTypeSchema } from "@cikal/contracts";
import { Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import type { AuditSearch } from "./api";
import { EVENT_TYPE_OPTIONS, MODULE_OPTIONS } from "./labels";

interface AuditFiltersProps {
  initial: AuditSearch;
  onSearch: (search: AuditSearch) => void;
}

/** "Module", "Event Type", dan periode yang berlaku setelah tombol "Search" (AC-14.01, AC-14.03, AC-14.06). */
export function AuditFilters({ initial, onSearch }: AuditFiltersProps) {
  const [draft, setDraft] = useState<AuditSearch>(initial);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(draft);
  }

  return (
    <form
      aria-label="Audit Trail search"
      onSubmit={handleSubmit}
      className="grid items-end gap-4 rounded-lg bg-neutral-0 p-6 shadow-s md:grid-cols-5"
    >
      <SelectField
        label="Module"
        options={MODULE_OPTIONS}
        value={draft.module ?? ""}
        onChange={(event) => setDraft({ ...draft, module: event.target.value || undefined })}
      />
      <SelectField
        label="Event Type"
        options={EVENT_TYPE_OPTIONS}
        value={draft.eventType ?? ""}
        onChange={(event) => setDraft({ ...draft, eventType: auditEventTypeSchema.safeParse(event.target.value).data })}
      />
      <TextField
        label="Period From"
        type="date"
        required
        value={draft.occurredFrom}
        onChange={(event) => setDraft({ ...draft, occurredFrom: event.target.value })}
      />
      <TextField
        label="Period To"
        type="date"
        required
        value={draft.occurredTo}
        onChange={(event) => setDraft({ ...draft, occurredTo: event.target.value })}
      />
      <Button type="submit" disabled={!draft.occurredFrom || !draft.occurredTo}>
        <Search size={16} aria-hidden />
        Search
      </Button>
    </form>
  );
}
