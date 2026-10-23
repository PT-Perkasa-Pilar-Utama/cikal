import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { SelectField } from "../../../components/ui/SelectField";
import { useProductOptions } from "../../../features/product/api";
import { RoutePanel } from "../../../features/product/RoutePanel";
import { useMenuActions } from "../../../features/session/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

const linkButton =
  "inline-flex items-center gap-2 rounded-lg border border-primary bg-neutral-0 px-4 py-2.5 font-semibold text-primary transition-colors hover:bg-primary-light/40";

/** Halaman "Product Route": pilih produk lalu lihat atau ubah daftar modul rutenya (api-specs 08 §8.9, §8.10). */
function ProductRoutePage() {
  const products = useProductOptions();
  const actions = useMenuActions("MST-ROUTE");
  const [productId, setProductId] = useState("");
  const options = (products.data ?? []).map((product) => ({
    value: product.id,
    label: `${product.productCode} - ${product.productName}`,
  }));

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Product Route</h1>
        <Link to="/master/routes/pending" className={linkButton}>
          <ClipboardList size={20} aria-hidden />
          Pending Product Route
        </Link>
      </div>
      {products.error && <FeedbackMessage type="error">{products.error.message}</FeedbackMessage>}
      <div className="rounded-lg bg-neutral-0 p-6 shadow-s">
        <div className="max-w-sm">
          <SelectField
            label="Product"
            options={options}
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          />
        </div>
      </div>
      {productId && (
        <div className="rounded-lg bg-neutral-0 p-6 shadow-s">
          <RoutePanel key={productId} productId={productId} canEdit={actions.has("UPDATE")} />
        </div>
      )}
    </section>
  );
}

export const Route = createFileRoute("/master/routes/")({
  component: () => (
    <MenuGuard menuCode="MST-ROUTE">
      <ProductRoutePage />
    </MenuGuard>
  ),
});
