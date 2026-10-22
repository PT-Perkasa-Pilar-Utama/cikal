import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FeedbackMessage } from "../../../../components/ui/FeedbackMessage";
import { useProduct, useUpdateProduct } from "../../../../features/product/api";
import { ProductForm } from "../../../../features/product/ProductForm";
import { productUpdateRequest } from "../../../../features/product/product-form-values";

/** Tab "Product": maker mengubah atau menonaktifkan produk lewat checker-maker (api-specs 08 §8.4). */
function EditProductTab() {
  const { productId } = Route.useParams();
  const product = useProduct(productId);
  const update = useUpdateProduct(productId);
  const navigate = useNavigate();
  const data = product.data;

  if (product.error) return <FeedbackMessage type="error">{product.error.message}</FeedbackMessage>;
  if (!data) return <p>Loading...</p>;
  return (
    <ProductForm
      product={data}
      buildRequest={(values, isActive) => productUpdateRequest(values, isActive, data)}
      onSubmit={(request) =>
        update.mutate(request, {
          onSuccess: (result) => navigate({ to: "/master/products", state: { notice: result.message } }),
        })
      }
      submitting={update.isPending}
      error={update.error?.message}
    />
  );
}

export const Route = createFileRoute("/master/products/$productId/")({ component: EditProductTab });
