import {
  type ApplicationDraftCreateRequest,
  type ApplicationSectionInput,
  applicationDraftListResponseSchema,
  applicationDraftResponseSchema,
  availableProductsResponseSchema,
  insuranceListResponseSchema,
  type ParamType,
  type PersonalSectionInput,
  type ProductCategory,
  parameterOptionsResponseSchema,
  regionOptionsResponseSchema,
  type SavableSection,
  sectionSaveResponseSchema,
  subDistrictOptionsResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

const DRAFTS_KEY = "application-drafts";

/** `GET /api/v1/applications/drafts` untuk "Application List" (api-specs 12 §12.4). */
export function useDrafts(page: number, q: string) {
  const search = new URLSearchParams({ page: String(page) });
  if (q) search.set("q", q);
  return useQuery({
    queryKey: [DRAFTS_KEY, page, q],
    queryFn: () => apiRequest(applicationDraftListResponseSchema, `/v1/applications/drafts?${search}`),
  });
}

/** Dropdown "Product": produk aktif dengan rute ACTIVE dalam kategori terpilih (api-specs 08 §8.7). */
export function useAvailableProducts(productCategory: ProductCategory | undefined) {
  return useQuery({
    queryKey: ["products", "available", productCategory],
    enabled: productCategory !== undefined,
    queryFn: async () =>
      (await apiRequest(availableProductsResponseSchema, `/v1/products/available?productCategory=${productCategory}`))
        .data,
  });
}

/** Dropdown "Insurance" step Application (api-specs 06 §6.2). */
export function useInsurances() {
  return useQuery({
    queryKey: ["insurances"],
    queryFn: async () => (await apiRequest(insuranceListResponseSchema, "/v1/insurances")).data,
  });
}

/** Pilihan General Parameter aktif untuk dropdown (api-specs 06 §6.1). */
export function useParameterOptions(paramType: ParamType) {
  return useQuery({
    queryKey: ["parameters", paramType],
    queryFn: async () =>
      (await apiRequest(parameterOptionsResponseSchema, `/v1/parameters/${encodeURIComponent(paramType)}/options`))
        .data,
  });
}

/** Tingkat wilayah dan parameter induknya (api-specs 06 §6.3.1). */
const REGION_PARENTS = {
  provinces: undefined,
  cities: "provinceCode",
  districts: "cityCode",
} as const;

/** Dropdown Province, City, atau District; tingkat di bawah Province menunggu kode induk dipilih (AC-23.04). */
export function useRegionOptions(level: keyof typeof REGION_PARENTS, parentCode?: string) {
  const parent = REGION_PARENTS[level];
  const query = parent ? `?${parent}=${encodeURIComponent(parentCode ?? "")}` : "";
  return useQuery({
    queryKey: ["regions", level, parentCode],
    enabled: parent === undefined || Boolean(parentCode),
    queryFn: async () => (await apiRequest(regionOptionsResponseSchema, `/v1/regions/${level}${query}`)).data,
  });
}

/** Dropdown Sub District dengan kode pos (api-specs 06 §6.3.1). */
export function useSubDistrictOptions(districtCode?: string) {
  return useQuery({
    queryKey: ["regions", "sub-districts", districtCode],
    enabled: Boolean(districtCode),
    queryFn: async () =>
      (
        await apiRequest(
          subDistrictOptionsResponseSchema,
          `/v1/regions/sub-districts?districtCode=${encodeURIComponent(districtCode ?? "")}`,
        )
      ).data,
  });
}

/** `POST /api/v1/applications`: draft pertama dan Loan ID dari "Next" step Application (api-specs 12 §12.2). */
export function useCreateDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ApplicationDraftCreateRequest) =>
      apiRequest(applicationDraftResponseSchema, "/v1/applications", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DRAFTS_KEY] }),
  });
}

type SectionSave =
  | { id: string; section: Extract<SavableSection, "application">; body: ApplicationSectionInput }
  | { id: string; section: Extract<SavableSection, "personal">; body: PersonalSectionInput };

/** `PUT /api/v1/applications/{id}/sections/{section}?strict=true` untuk tombol "Next" (api-specs 12 §12.3). */
export function useSaveSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, section, body }: SectionSave) =>
      apiRequest(sectionSaveResponseSchema, `/v1/applications/${id}/sections/${section}?strict=true`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DRAFTS_KEY] }),
  });
}
