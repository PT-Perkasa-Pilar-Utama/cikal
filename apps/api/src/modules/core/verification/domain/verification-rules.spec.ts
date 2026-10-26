import { describe, expect, it } from "vitest";
import { type DocumentState, merged, submission } from "./verification-rules.js";

const doc = (documentType: string, verificationStatus: DocumentState["verificationStatus"] = "PENDING") => ({
  documentType,
  label: documentType,
  verificationStatus,
  remarks: null,
});
const seven = ["KTP", "NPWP", "KK", "SLIP", "REK", "FOTO", "SPT"].map((type) => doc(type));

describe("verification rules", () => {
  it("AC-64.01 returns ALL_MATCH when every document matches", () => {
    expect(submission(seven.map((document) => ({ ...document, verificationStatus: "MATCH" })))).toEqual({
      result: "ALL_MATCH",
      returnNote: null,
    });
  });

  it("AC-64.02 returns HAS_NOT_MATCH with the remarks of each Not Match document", () => {
    const documents = merged(
      seven.map((document) => ({ ...document, verificationStatus: "MATCH" })),
      [{ documentType: "NPWP", verificationStatus: "NOT_MATCH", remarks: "Nama di NPWP tidak sesuai KTP" }],
    );

    expect(submission(documents)).toEqual({
      result: "HAS_NOT_MATCH",
      returnNote: "NPWP: Nama di NPWP tidak sesuai KTP",
    });
  });

  it("AC-64.03 rejects a Not Match document without remarks", () => {
    const documents = seven.map((document) =>
      document.documentType === "NPWP"
        ? { ...document, verificationStatus: "NOT_MATCH" as const }
        : { ...document, verificationStatus: "MATCH" as const },
    );

    expect(() => submission(documents)).toThrow(
      expect.objectContaining({
        code: "REMARKS_REQUIRED",
        message: "Remarks are required for Not Match documents",
        details: [expect.objectContaining({ field: "documents.NPWP.remarks" })],
      }),
    );
  });

  it("AC-64.04 keeps saved statuses of documents that are not sent", () => {
    const first = merged(seven, [
      { documentType: "KTP", verificationStatus: "MATCH" },
      { documentType: "NPWP", verificationStatus: "MATCH" },
      { documentType: "KK", verificationStatus: "MATCH" },
      { documentType: "SLIP", verificationStatus: "NOT_MATCH", remarks: "Buram" },
    ]);
    const second = merged(first, [{ documentType: "SLIP", verificationStatus: "NOT_MATCH" }]);

    expect(second.filter((document) => document.verificationStatus !== "PENDING")).toHaveLength(4);
    expect(second.find((document) => document.documentType === "SLIP")?.remarks).toBe("Buram");
  });

  it("rejects submitting with a pending document (VERIFICATION_INCOMPLETE)", () => {
    expect(() => submission(seven)).toThrow(
      expect.objectContaining({ code: "VERIFICATION_INCOMPLETE", message: "Please verify all documents" }),
    );
  });

  it("rejects a document that is not uploaded", () => {
    expect(() => merged(seven, [{ documentType: "BPKB", verificationStatus: "MATCH" }])).toThrow(
      expect.objectContaining({
        code: "VALIDATION_FAILED",
        details: [expect.objectContaining({ message: "Document BPKB is not uploaded" })],
      }),
    );
  });
});
