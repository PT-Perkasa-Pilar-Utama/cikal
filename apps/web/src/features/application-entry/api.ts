import {
  type ApplicationDraftCreateRequest,
  type ApplicationSectionInput,
  applicationDocumentsResponseSchema,
  applicationDraftListResponseSchema,
  applicationDraftResponseSchema,
  applicationFormResponseSchema,
  applicationSubmitResponseSchema,
  availableProductsResponseSchema,
  type BusinessSectionInput,
  type CollateralSectionInput,
  documentUploadResponseSchema,
  type EmergencyContactSectionInput,
  insuranceListResponseSchema,
  type OccupationSectionInput,
  type ParamType,
  type PersonalSectionInput,
  type ProductCategory,
  parameterOptionsResponseSchema,
  regionOptionsResponseSchema,
  type SavableSection,
  type SpouseSectionInput,
  sectionSaveResponseSchema,
  subDistrictOptionsResponseSchema,
} from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

const DRAFTS_KEY = "application-drafts";
const DOCUMENTS_KEY = "application-documents";
/** Kunci terpisah dari daftar draft: simpan dan submit tidak boleh memuat ulang form yang sedang diisi. */
const FORM_KEY = "application-form";

/** `GET /api/v1/applications/drafts` untuk "Application List" (api-specs 12 §12.4). */
export function useDrafts(page: number, q: string) {
  const search = new URLSearchParams({ page: String(page) });
  if (q) search.set("q", q);
  return useQuery({
    queryKey: [DRAFTS_KEY, page, q],
    queryFn: () => apiRequest(applicationDraftListResponseSchema, `/v1/applications/drafts?${search}`),
  });
}

/** `GET /api/v1/applications/{id}/form` untuk melanjutkan draft (api-specs 12 §12.5, AC-49.05). */
export function useApplicationForm(id: string) {
  return useQuery({
    queryKey: [FORM_KEY, id],
    queryFn: () => apiRequest(applicationFormResponseSchema, `/v1/applications/${id}/form`),
    // Form dibaca sekali saat dibuka; isi berikutnya dipegang state form, bukan cache.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });
}

/** Jenis agunan yang boleh dipilih untuk produk draft, dibaca ulang setiap step Collateral dibuka (AC-46.02). */
export function useCollateralTypes(id: string) {
  return useQuery({
    queryKey: [FORM_KEY, id, "collateral-types"],
    queryFn: async () =>
      (await apiRequest(applicationFormResponseSchema, `/v1/applications/${id}/form`)).data.collateralTypes,
    staleTime: 0,
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

/** Body tiap section yang bisa disimpan (api-specs 12 §12.3). */
interface SectionBodies {
  application: ApplicationSectionInput;
  personal: PersonalSectionInput;
  spouse: SpouseSectionInput;
  occupation: OccupationSectionInput;
  business: BusinessSectionInput;
  collateral: CollateralSectionInput;
  "emergency-contact": EmergencyContactSectionInput;
}

export type SectionSave = {
  [S in SavableSection]: { id: string; section: S; body: SectionBodies[S]; strict: boolean };
}[SavableSection];

/**
 * `PUT /api/v1/applications/{id}/sections/{section}`: `strict=true` untuk "Next" dan "Submit", `strict=false` untuk
 * "Save as Draft" (api-specs 12 §12.3).
 */
export function useSaveSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, section, body, strict }: SectionSave) =>
      apiRequest(sectionSaveResponseSchema, `/v1/applications/${id}/sections/${section}?strict=${strict}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DRAFTS_KEY] }),
  });
}

/** Slot unggah step "Document" dari checklist pengajuan (api-specs 12 §12.6). */
export function useApplicationDocuments(id: string) {
  return useQuery({
    queryKey: [DOCUMENTS_KEY, id],
    queryFn: async () =>
      (await apiRequest(applicationDocumentsResponseSchema, `/v1/applications/${id}/documents`)).data,
  });
}

/** `PUT /api/v1/applications/{id}/documents/{documentType}`: unggah atau ganti file satu slot (api-specs 12 §12.7). */
export function useUploadDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentType, file }: { documentType: string; file: File }) => {
      const body = new FormData();
      body.append("file", file);
      return apiRequest(
        documentUploadResponseSchema,
        `/v1/applications/${id}/documents/${encodeURIComponent(documentType)}`,
        { method: "PUT", body },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DOCUMENTS_KEY, id] }),
  });
}

/**
 * `POST /api/v1/applications/{id}/submit` dengan `Idempotency-Key` wajib (api-specs 12 §12.8). Kunci dibuat sekali per
 * konfirmasi, jadi klik ganda mendapat respons pertama (AC-50.07).
 */
export function useSubmitApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey: Record<string, string> }) =>
      apiRequest(applicationSubmitResponseSchema, `/v1/applications/${id}/submit`, {
        method: "POST",
        headers: idempotencyKey,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DRAFTS_KEY] }),
  });
}
