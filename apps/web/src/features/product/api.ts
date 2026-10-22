import { productListResponseSchema } from "@cikal/contracts";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

/** `GET /api/v1/products` (api-specs 08 §8.1). */
export function useProducts(page = 1) {
  return useQuery({
    queryKey: ["products", page],
    queryFn: () => apiRequest(productListResponseSchema, `/v1/products?page=${page}`),
  });
}
