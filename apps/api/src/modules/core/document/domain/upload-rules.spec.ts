import { describe, expect, it } from "vitest";
import {
  megabytes,
  sampleDocx,
  sampleExe,
  sampleJpg,
  samplePdf,
  samplePng,
  storedZip,
} from "../../../../../test/support/files.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { checkUpload, type UploadCandidate } from "./upload-rules.js";

const MAX_MB = 2;
const file = (fileName: string, data: Buffer, truncated = false): UploadCandidate => ({ fileName, data, truncated });

const rejection = async (candidate: UploadCandidate, maxMb = MAX_MB) => {
  const error = await checkUpload(candidate, maxMb).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(DomainError);
  return error;
};

describe("checkUpload (api-specs 12 §12.7 langkah 2 dan 3)", () => {
  it.each([
    ["ktp.png", samplePng(), "png"],
    ["ktp.jpg", sampleJpg(), "jpg"],
    ["KTP.JPEG", sampleJpg(), "jpeg"],
    ["slip.pdf", samplePdf(), "pdf"],
    ["surat.docx", sampleDocx(), "docx"],
  ])("accepts %s whose bytes match its extension", async (fileName, data, extension) => {
    await expect(checkUpload(file(fileName, data), MAX_MB)).resolves.toBe(extension);
  });

  it("AC-47.02 rejects npwp.exe with the allowed file types message", async () => {
    expect(await rejection(file("npwp.exe", sampleExe()))).toMatchObject({
      code: "UNSUPPORTED_FILE_TYPE",
      status: 415,
      message: "Allowed file types: png, jpg, jpeg, pdf, docx",
    });
  });

  it.each([
    ["an executable renamed to pdf", "npwp.pdf", sampleExe()],
    ["a jpg renamed to png", "ktp.png", sampleJpg()],
    ["a plain zip renamed to docx", "surat.docx", storedZip([["a.txt", "x"]])],
    ["a file without an extension", "npwp", samplePdf()],
  ])("AC-47.02 rejects %s by its magic bytes", async (_case, fileName, data) => {
    expect(await rejection(file(fileName, data))).toMatchObject({ code: "UNSUPPORTED_FILE_TYPE", status: 415 });
  });

  it("AC-47.03 accepts a PDF of exactly 2 MB (2,097,152 bytes)", async () => {
    await expect(checkUpload(file("slip-gaji.pdf", samplePdf(2_097_152)), MAX_MB)).resolves.toBe("pdf");
  });

  it("AC-47.04 rejects a PDF of 2.1 MB with the size limit message", async () => {
    expect(await rejection(file("slip-gaji.pdf", samplePdf(megabytes(2.1))))).toMatchObject({
      code: "FILE_TOO_LARGE",
      status: 413,
      message: "File must not exceed 2 MB",
    });
  });

  it("AC-47.04 rejects a file the multipart reader truncated at its limit", async () => {
    expect(await rejection(file("slip-gaji.pdf", samplePdf(), true))).toMatchObject({ code: "FILE_TOO_LARGE" });
  });

  it("names the tenant UPLOAD_MAX_MB in the size limit message", async () => {
    expect(await rejection(file("slip-gaji.pdf", samplePdf(megabytes(5.5))), 5)).toMatchObject({
      code: "FILE_TOO_LARGE",
      message: "File must not exceed 5 MB",
    });
  });
});
