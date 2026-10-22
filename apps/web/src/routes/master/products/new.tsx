import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCreateProduct } from "../../../features/product/api";
import { ProductForm } from "../../../features/product/ProductForm";
import { productCreateRequest } from "../../../features/product/product-form-values";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "New Product": berhasil membuka "Product" dengan pesan "Data submitted for approval" (AC-20.01). */
function NewProductPage() {
  const create = useCreateProduct();
  const navigate = useNavigate();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">New Product</h1>
      <div className="rounded-lg bg-neutral-0 p-6 shadow-s">
        <ProductForm
          buildRequest={productCreateRequest}
          onSubmit={(request) =>
            create.mutate(request, {
              onSuccess: (result) => navigate({ to: "/master/products", state: { notice: result.message } }),
            })
          }
          submitting={create.isPending}
          error={create.error?.message}
        />
      </div>
    </section>
  );
}

export const Route = createFileRoute("/master/products/new")({
  component: () => (
    <MenuGuard menuCode="MST-PRODUCT">
      <NewProductPage />
    </MenuGuard>
  ),
});
