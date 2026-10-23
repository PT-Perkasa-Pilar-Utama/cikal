import type {
  RegionOptionsResponse,
  RegionSearchResponse,
  RegionSyncStartedResponse,
  RegionSyncStateResponse,
  SubDistrictOptionsResponse,
} from "./regions.schema.js";

export const regionSyncIdMock = "0192b6d0-0001-7000-8000-000000000001";

/** Dropdown City untuk Province "DKI Jakarta" (api-specs 06 §6.3.1, AC-23.04). */
export const cityOptionsResponseMock = {
  data: [
    { code: "3171", name: "KOTA JAKARTA PUSAT", parentCode: "31" },
    { code: "3172", name: "KOTA JAKARTA UTARA", parentCode: "31" },
  ],
} satisfies RegionOptionsResponse;

export const subDistrictOptionsResponseMock = {
  data: [{ code: "3171011001", name: "GAMBIR", parentCode: "317101", zipCode: "10110" }],
} satisfies SubDistrictOptionsResponse;

/** Pencarian "gam" (api-specs 06 §6.3.2, AC-23.03). */
export const regionSearchResponseMock = {
  data: [
    {
      provinceCode: "31",
      provinceName: "DKI JAKARTA",
      cityCode: "3171",
      cityName: "KOTA JAKARTA PUSAT",
      districtCode: "317101",
      districtName: "GAMBIR",
      subDistrictCode: "3171011001",
      subDistrictName: "GAMBIR",
      zipCode: "10110",
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1, lastSyncAt: "2026-10-21T02:00:00Z" },
} satisfies RegionSearchResponse;

export const regionSyncStartedResponseMock = {
  data: { syncId: regionSyncIdMock, status: "RUNNING", startedAt: "2026-10-21T08:00:00Z" },
} satisfies RegionSyncStartedResponse;

/** Sinkronisasi selesai (api-specs 06 §6.3.4, AC-23.01). */
export const regionSyncCompletedResponseMock = {
  data: {
    status: "COMPLETED",
    added: 12,
    updated: 3,
    finishedAt: "2026-10-21T08:02:00Z",
    lastSyncAt: "2026-10-21T08:02:00Z",
  },
  message: "Region sync completed: 12 added, 3 updated",
} satisfies RegionSyncStateResponse;

/** Sinkronisasi gagal (AC-23.02). */
export const regionSyncFailedResponseMock = {
  data: { status: "FAILED", errorCategory: "TIMEOUT" },
  message: "Region sync failed. Existing data is unchanged",
} satisfies RegionSyncStateResponse;
