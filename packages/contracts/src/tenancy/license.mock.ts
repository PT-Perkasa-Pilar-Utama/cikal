import type { LicenseInstallResponse, LicenseResponse } from "./license.schema.js";

export const licenseResponseMock = {
  data: {
    licenseNumber: "PPU-LIC-2026-0001",
    companyCode: "001",
    deploymentType: "ON_PREMISE",
    validFrom: "2026-10-21",
    validTo: "2027-12-31",
    status: "ACTIVE",
    maxUsers: null,
    modules: [
      { moduleCode: "CORE", moduleName: "Core" },
      { moduleCode: "M06", moduleName: "Dedup" },
    ],
    installedAt: "2026-10-21T03:00:00Z",
  },
} satisfies LicenseResponse;

export const licenseInstallResponseMock = {
  data: {
    licenseNumber: "PPU-LIC-2026-0001",
    validTo: "2027-12-31",
    modules: ["CORE", "M06", "M07", "M08", "M09", "M10", "M11", "M14", "M15"],
    modulesNotInPackage: ["M14"],
  },
  message: "License installed",
} satisfies LicenseInstallResponse;
