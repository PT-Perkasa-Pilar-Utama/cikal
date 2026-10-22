import { createFileRoute } from "@tanstack/react-router";
import { useProducts } from "../../../features/product/api";

/** Kerangka halaman "Product"; form dan tab Pricing dibangun di FE-S1-02. */
function ProductsPage() {
  const { data, isPending, error } = useProducts();
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold text-neutral-8">Product</h1>
      {isPending && <p>Loading...</p>}
      {error && <p className="text-error">{error.message}</p>}
      <table className="w-full bg-neutral-0">
        <thead>
          <tr className="text-left text-neutral-5">
            <th className="p-3">Product Code</th>
            <th className="p-3">Product Name</th>
            <th className="p-3">Category</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map((product) => (
            <tr key={product.id} className="border-t border-neutral-2">
              <td className="p-3">{product.productCode}</td>
              <td className="p-3">{product.productName}</td>
              <td className="p-3">{product.productCategory}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export const Route = createFileRoute("/master/products/")({ component: ProductsPage });
