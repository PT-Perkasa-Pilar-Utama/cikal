import type { ParameterOptionsResponse } from "./parameters.schema.js";

/** Dropdown Occupation (api-specs 06 §6.1). */
export const occupationOptionsResponseMock = {
  data: [
    { paramId: "001", paramValue: "Karyawan Swasta", isActive: true },
    { paramId: "005", paramValue: "Wiraswasta", isActive: true },
  ],
} satisfies ParameterOptionsResponse;
