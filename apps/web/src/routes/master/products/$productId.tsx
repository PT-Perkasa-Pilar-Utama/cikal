import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Router memberi tab aktif `data-status="active"`; dipakai agar warna garis aktif tidak bentrok dengan `border-transparent`. */
const tabClass =
  "-mb-px border-b-2 border-transparent px-4 py-2.5 font-semibold text-neutral-5 hover:text-primary data-[status=active]:border-primary data-[status=active]:text-primary";

/** Kerangka edit produk dengan tab "Product" dan "Pricing" bergaris bawah Primary (design-system 7.3 Tabs, AC-97.01). */
function ProductEditLayout() {
  const { productId } = Route.useParams();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Edit Product</h1>
      <nav aria-label="Product tabs" className="flex border-b border-neutral-2">
        <Link
          to="/master/products/$productId"
          params={{ productId }}
          activeOptions={{ exact: true }}
          className={tabClass}
        >
          Product
        </Link>
        <Link to="/master/products/$productId/pricing" params={{ productId }} className={tabClass}>
          Pricing
        </Link>
      </nav>
      <div className="rounded-lg bg-neutral-0 p-6 shadow-s">
        <Outlet />
      </div>
    </section>
  );
}

export const Route = createFileRoute("/master/products/$productId")({
  component: () => (
    <MenuGuard menuCode="MST-PRODUCT">
      <ProductEditLayout />
    </MenuGuard>
  ),
});
