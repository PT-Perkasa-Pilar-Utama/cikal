import { standardErrors } from "@cikal/contracts";
import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import { BlankSlate } from "../../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { Pagination } from "../../../components/ui/Pagination";
import { useProducts } from "../../../features/product/api";
import { ProductTable } from "../../../features/product/ProductTable";
import { useMenuActions } from "../../../features/session/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

const linkButton = "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition-colors";

/**
 * Halaman "Product" (api-specs 08 §8.1). Produk dengan perubahan menunggu persetujuan tidak bisa dibuka untuk edit
 * (AC-12.06); pesan sukses pengajuan dibawa dari form lewat history state (AC-20.01).
 */
function ProductsPage() {
  const [page, setPage] = useState(1);
  const [blocked, setBlocked] = useState(false);
  const { data, isPending, error } = useProducts(page);
  const actions = useMenuActions("MST-PRODUCT");
  const navigate = useNavigate();
  const notice = useRouterState({ select: (state) => state.location.state.notice });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Product</h1>
        <div className="flex gap-3">
          <Link
            to="/master/products/pending"
            className={`${linkButton} border border-primary bg-neutral-0 text-primary hover:bg-primary-light/40`}
          >
            <ClipboardList size={20} aria-hidden />
            Pending Product
          </Link>
          {actions.has("CREATE") && (
            <Link to="/master/products/new" className={`${linkButton} bg-primary text-neutral-0 hover:bg-primary/90`}>
              <Plus size={20} aria-hidden />
              New Product
            </Link>
          )}
        </div>
      </div>
      {blocked ? (
        <FeedbackMessage type="error">{standardErrors.PENDING_CHANGE_REQUEST.message}</FeedbackMessage>
      ) : (
        notice && <FeedbackMessage type="success">{notice}</FeedbackMessage>
      )}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      <div className="rounded-lg bg-neutral-0 shadow-s">
        <ProductTable
          products={data?.data ?? []}
          canEdit={actions.has("UPDATE")}
          onEdit={(product) => {
            setBlocked(product.hasPendingChange);
            if (!product.hasPendingChange) {
              void navigate({ to: "/master/products/$productId", params: { productId: product.id } });
            }
          }}
        />
        {isPending && <p className="p-3">Loading...</p>}
        {data?.data.length === 0 && <BlankSlate />}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/master/products/")({
  component: () => (
    <MenuGuard menuCode="MST-PRODUCT">
      <ProductsPage />
    </MenuGuard>
  ),
});
