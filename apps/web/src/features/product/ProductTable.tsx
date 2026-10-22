import type { ProductListResponse } from "@cikal/contracts";
import { SquarePen } from "lucide-react";
import { formatMoney } from "../../lib/format";
import { INTEREST_TYPE_LABELS, PRODUCT_CATEGORY_LABELS } from "./labels";

type ProductRow = ProductListResponse["data"][number];

interface ProductTableProps {
  products: ProductRow[];
  /** Ikon edit hanya tampil dengan hak Update (AC-09.02). */
  canEdit: boolean;
  onEdit: (product: ProductRow) => void;
}

/** Tabel halaman "Product" dengan kolom aksi ikon edit Primary (design-system 7.1 Table, 8.3). */
export function ProductTable({ products, canEdit, onEdit }: ProductTableProps) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="p-3">Product Code</th>
          <th className="p-3">Product Name</th>
          <th className="p-3">Category</th>
          <th className="p-3">Interest Type</th>
          <th className="p-3">Plafond</th>
          <th className="p-3">Tenor (Months)</th>
          <th className="p-3">Status</th>
          {canEdit && (
            <th className="p-3">
              <span className="sr-only">Action</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id} className="border-b border-neutral-2 last:border-0">
            <td className="p-3 font-semibold text-neutral-8">{product.productCode}</td>
            <td className="p-3">{product.productName}</td>
            <td className="p-3">{PRODUCT_CATEGORY_LABELS[product.productCategory]}</td>
            <td className="p-3">{INTEREST_TYPE_LABELS[product.interestType]}</td>
            <td className="p-3">
              {formatMoney(product.minPlafond)} - {formatMoney(product.maxPlafond)}
            </td>
            <td className="p-3">
              {product.minTenor} - {product.maxTenor}
            </td>
            <td className="p-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  product.isActive ? "bg-success-lightest text-success" : "bg-neutral-1 text-neutral-5"
                }`}
              >
                {product.isActive ? "Active" : "Inactive"}
              </span>
            </td>
            {canEdit && (
              <td className="p-3 text-right">
                <button
                  type="button"
                  aria-label={`Edit ${product.productCode}`}
                  onClick={() => onEdit(product)}
                  className="rounded-lg p-2 text-primary hover:bg-primary-light/40"
                >
                  <SquarePen size={16} aria-hidden />
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
