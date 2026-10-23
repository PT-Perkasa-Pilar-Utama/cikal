import { describe, expect, it } from "vitest";
import { documentCompleteness } from "./document-slots.js";

const SEVEN_MANDATORY = ["KTP", "KK", "NPWP", "SLIP_GAJI", "REKENING_KORAN", "SURAT_KETERANGAN_KERJA", "PBB"].map(
  (documentType) => ({ documentType, isMandatory: true }),
);

describe("documentCompleteness", () => {
  it("AC-47.06 leaves the optional BPJS out of the count", () => {
    const items = [...SEVEN_MANDATORY, { documentType: "BPJS", isMandatory: false }];

    expect(documentCompleteness(items, new Set())).toEqual({ uploadedMandatory: 0, requiredMandatory: 7 });
    expect(documentCompleteness(items, new Set(["BPJS"]))).toEqual({ uploadedMandatory: 0, requiredMandatory: 7 });
  });

  it("AC-47.01 counts one uploaded mandatory document", () => {
    expect(documentCompleteness(SEVEN_MANDATORY, new Set(["KTP"]))).toEqual({
      uploadedMandatory: 1,
      requiredMandatory: 7,
    });
  });
});
