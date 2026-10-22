import { type ProductData, standardErrors } from "@cikal/contracts";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { SelectField, type SelectOption } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { INTEREST_TYPE_LABELS, PRODUCT_CATEGORY_LABELS, PRODUCT_FIELD_LABELS } from "./labels";
import { type ProductFormField, type ProductFormValues, productFormDefaults } from "./product-form-values";

interface ProductFormProps<TRequest> {
  /** Data aktif untuk edit; kosong untuk "New Product". */
  product?: ProductData;
  /** Isi form menjadi body request, atau `undefined` bila field wajib kosong atau formatnya salah. */
  buildRequest: (values: ProductFormValues, isActive: boolean) => TRequest | undefined;
  onSubmit: (request: TRequest) => void;
  submitting: boolean;
  /** Pesan error dari server, ditampilkan apa adanya (AC-20.02 s.d. AC-20.07). */
  error?: string;
}

const toOptions = (labels: Record<string, string>): SelectOption[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

const CATEGORY_OPTIONS = toOptions(PRODUCT_CATEGORY_LABELS);
const INTEREST_TYPE_OPTIONS = toOptions(INTEREST_TYPE_LABELS);
const SYARIAH = "SYARIAH";

const FORM_FIELDS: readonly ProductFormField[] = [
  "productCode",
  "productName",
  "productCategory",
  "interestType",
  "contractType",
  "minPlafond",
  "maxPlafond",
  "minTenor",
  "maxTenor",
  "minAge",
  "maxAge",
  "dbrMax",
  "limitAutoApproval",
  "validFrom",
  "validTo",
];

function readValues(form: HTMLFormElement): ProductFormValues {
  const data = new FormData(form);
  const entries = FORM_FIELDS.map((name) => {
    const value = data.get(name);
    return [name, typeof value === "string" ? value : ""] as const;
  });
  return { ...productFormDefaults(), ...Object.fromEntries(entries) };
}

/**
 * Form produk untuk "New Product" dan edit (api-specs 08 §8.3, §8.4). Aturan bisnis diperiksa server dan pesannya
 * tampil apa adanya; form hanya menolak field wajib yang kosong dengan pesan `VALIDATION_FAILED`.
 */
export function ProductForm<TRequest>({
  product,
  buildRequest,
  onSubmit,
  submitting,
  error,
}: ProductFormProps<TRequest>) {
  const defaults = productFormDefaults(product);
  const [category, setCategory] = useState(defaults.productCategory);
  const [invalid, setInvalid] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const isActive = new FormData(form).get("isActive") === "on";
    const request = buildRequest(readValues(form), isActive);
    setInvalid(request === undefined);
    if (request !== undefined) onSubmit(request);
  }

  const field = (name: ProductFormField) => ({
    name,
    label: PRODUCT_FIELD_LABELS[name] ?? name,
    defaultValue: defaults[name],
  });
  const message = invalid ? standardErrors.VALIDATION_FAILED.message : error;

  return (
    <form aria-label="Product" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {message && <FeedbackMessage type="error">{message}</FeedbackMessage>}
      <div className="grid gap-4 md:grid-cols-2">
        <TextField {...field("productCode")} required readOnly={product !== undefined} placeholder="Type here" />
        <TextField {...field("productName")} required placeholder="Type here" />
        <SelectField
          {...field("productCategory")}
          required
          options={CATEGORY_OPTIONS}
          onChange={(event) => setCategory(event.target.value)}
        />
        <SelectField {...field("interestType")} required options={INTEREST_TYPE_OPTIONS} />
        {category === SYARIAH && <TextField {...field("contractType")} required placeholder="Type here" />}
        <TextField {...field("minPlafond")} required inputMode="numeric" placeholder="Type here" />
        <TextField {...field("maxPlafond")} required inputMode="numeric" placeholder="Type here" />
        <TextField {...field("minTenor")} required inputMode="numeric" placeholder="Type here" />
        <TextField {...field("maxTenor")} required inputMode="numeric" placeholder="Type here" />
        <TextField {...field("minAge")} required inputMode="numeric" placeholder="Type here" />
        <TextField {...field("maxAge")} required inputMode="numeric" placeholder="Type here" />
        <TextField {...field("dbrMax")} required inputMode="decimal" placeholder="Type here" />
        <TextField {...field("limitAutoApproval")} inputMode="numeric" placeholder="Type here" />
        <TextField {...field("validFrom")} required type="date" />
        <TextField {...field("validTo")} type="date" />
      </div>
      {product && (
        <label className="flex items-center gap-2 font-semibold text-neutral-7">
          <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="size-4 accent-primary" />
          Active
        </label>
      )}
      <div className="flex justify-end gap-3">
        <Link
          to="/master/products"
          className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2.5 font-semibold text-primary hover:bg-primary-light/40"
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
