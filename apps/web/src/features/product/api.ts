import {
  changeRequestAcceptedSchema,
  type ProductCreateRequest,
  type ProductPricingUpdateRequest,
  type ProductRouteUpdateRequest,
  type ProductUpdateRequest,
  productDetailResponseSchema,
  productListResponseSchema,
  productPricingResponseSchema,
  productRouteResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

const PRODUCTS_KEY = "products";
/** `pageSize` maksimal (api-specs 01 §1.6); dropdown "Product" memuat satu halaman penuh. */
const PRODUCT_OPTIONS_PAGE_SIZE = 100;

/** `GET /api/v1/products` (api-specs 08 §8.1). */
export function useProducts(page = 1) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, "list", page],
    queryFn: () => apiRequest(productListResponseSchema, `/v1/products?page=${page}`),
  });
}

/** `GET /api/v1/products/{id}` untuk form edit (api-specs 08 §8.2). */
export function useProduct(id: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, "detail", id],
    queryFn: async () => (await apiRequest(productDetailResponseSchema, `/v1/products/${id}`)).data,
  });
}

/** `GET /api/v1/products/{id}/pricing` untuk tab "Pricing" (api-specs 08 §8.5). */
export function useProductPricing(id: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, "pricing", id],
    queryFn: async () => (await apiRequest(productPricingResponseSchema, `/v1/products/${id}/pricing`)).data,
  });
}

/** Pilihan dropdown "Product" layar "Product Route" (api-specs 08 §8.1). */
export function useProductOptions() {
  return useQuery({
    queryKey: [PRODUCTS_KEY, "options"],
    queryFn: async () =>
      (await apiRequest(productListResponseSchema, `/v1/products?page=1&pageSize=${PRODUCT_OPTIONS_PAGE_SIZE}`)).data,
  });
}

/** `GET /api/v1/products/{id}/route` versi ACTIVE untuk daftar modul dan editor rute (api-specs 08 §8.10). */
export function useProductRoute(id: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, "route", id],
    queryFn: async () => (await apiRequest(productRouteResponseSchema, `/v1/products/${id}/route`)).data,
  });
}

/** Pengajuan checker-maker mengembalikan 202; data produk ditandai punya permintaan terbuka (api-specs 01 §1.8). */
function useSubmitChange<TBody>(method: "POST" | "PUT", path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) => apiRequest(changeRequestAcceptedSchema, path, { method, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] }),
  });
}

/** `POST /api/v1/products` (api-specs 08 §8.3). */
export const useCreateProduct = () => useSubmitChange<ProductCreateRequest>("POST", "/v1/products");

/** `PUT /api/v1/products/{id}` (api-specs 08 §8.4). */
export const useUpdateProduct = (id: string) => useSubmitChange<ProductUpdateRequest>("PUT", `/v1/products/${id}`);

/** `PUT /api/v1/products/{id}/pricing` (api-specs 08 §8.6). */
export const useUpdatePricing = (id: string) =>
  useSubmitChange<ProductPricingUpdateRequest>("PUT", `/v1/products/${id}/pricing`);

/** `PUT /api/v1/products/{id}/route` (api-specs 08 §8.9). */
export const useUpdateRoute = (id: string) =>
  useSubmitChange<ProductRouteUpdateRequest>("PUT", `/v1/products/${id}/route`);
