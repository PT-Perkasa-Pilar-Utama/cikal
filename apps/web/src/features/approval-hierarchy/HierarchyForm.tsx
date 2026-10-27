import type { ApprovalHierarchyCreate, Branch, ProductListResponse, UserListItem } from "@cikal/contracts";
import { Send } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";

interface HierarchyFormProps {
  branches: Branch[];
  products: ProductListResponse["data"];
  approvers: UserListItem[];
  submitting: boolean;
  error?: string;
  onSubmit: (request: ApprovalHierarchyCreate) => void;
}

const EMPTY = {
  branchId: "",
  productId: "",
  jobLevel: "",
  subLevel: "",
  approverUserId: "",
  upLevel: "",
  upSubLevel: "",
};
type Values = typeof EMPTY;

/** Level kosong menjadi `null`; aturan level diperiksa server (api-specs 16 §16.2). */
const levelOf = (value: string): number | null => (value.trim() ? Number.parseInt(value, 10) : null);

/**
 * Form "New Hierarchy" (api-specs 16 §16.2): cabang, produk, level, sub level, dan approver yang punya hak Approve
 * di menu Approval (AC-27.01). Penolakan server, contoh approver tanpa akses (AC-27.02), tampil di atas form.
 */
export function HierarchyForm({ branches, products, approvers, submitting, error, onSubmit }: HierarchyFormProps) {
  const [values, setValues] = useState<Values>(EMPTY);
  const field = (name: keyof Values) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      branchId: values.branchId,
      productId: values.productId,
      jobLevel: levelOf(values.jobLevel) ?? 0,
      subLevel: levelOf(values.subLevel) ?? 0,
      approverUserId: values.approverUserId,
      upLevel: levelOf(values.upLevel),
      upSubLevel: levelOf(values.upSubLevel),
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <FeedbackMessage type="error">{error}</FeedbackMessage>}
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Branch"
          required
          options={branches.map((branch) => ({
            value: branch.id,
            label: `${branch.branchCode} - ${branch.branchName}`,
          }))}
          {...field("branchId")}
        />
        <SelectField
          label="Product"
          required
          options={products.map((product) => ({ value: product.id, label: product.productCode }))}
          {...field("productId")}
        />
        <TextField label="Job Level" required inputMode="numeric" {...field("jobLevel")} />
        <TextField label="Sub Level" required inputMode="numeric" {...field("subLevel")} />
        <SelectField
          label="Approver"
          required
          options={approvers.map((user) => ({ value: user.id, label: user.username }))}
          {...field("approverUserId")}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Up Level" inputMode="numeric" {...field("upLevel")} />
          <TextField label="Up Sub Level" inputMode="numeric" {...field("upSubLevel")} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          <Send size={16} aria-hidden />
          Submit
        </Button>
      </div>
    </form>
  );
}
