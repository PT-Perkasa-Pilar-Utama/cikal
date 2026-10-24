import { type DocumentUploadResponse, standardErrors } from "@cikal/contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FLOW_TIMEOUT_MS } from "../../test/application-entry";
import { DOCUMENTS_PATH, documentSlots, openStep, stepRoutes } from "../../test/application-steps";
import type { ApiRoutes, StubResponse } from "../../test/render-app";

const MB = 1024 * 1024;
const GET_DOCUMENTS = `GET ${DOCUMENTS_PATH}`;

const uploaded = (documentType: string, fileName: string, sizeBytes: number, count: number): StubResponse => ({
  status: 200,
  body: {
    data: {
      documentType,
      file: { fileId: "0192b6f3-0001-7000-8000-00000000000b", fileName, sizeBytes, uploadedAt: "2026-10-20T07:05:00Z" },
      completeness: { uploadedMandatory: count, requiredMandatory: 7 },
    },
  } satisfies DocumentUploadResponse,
});

const refused = (status: 413 | 415, code: "FILE_TOO_LARGE" | "UNSUPPORTED_FILE_TYPE"): StubResponse => ({
  status,
  body: { code, message: standardErrors[code].message, details: [], correlationId: "c-1" },
});

/** Baris slot dokumen berlabel `label`. */
const slot = (label: string) => {
  const row = screen.getByText(label, { selector: "span" }).closest("li");
  if (!row) throw new Error(`No slot ${label}`);
  return within(row);
};

/** Pilih `file` lewat tombol "Upload" atau ikon ganti slot `label`. */
function chooseFile(label: string, file: File) {
  fireEvent.change(screen.getByLabelText(`File ${label}`), { target: { files: [file] } });
}

const fileOf = (name: string, bytes: number, type = "application/pdf") =>
  new File([new Uint8Array(bytes)], name, { type });

/** Buka step Document dengan rute tambahan; objek rute dikembalikan agar slot bisa diubah di tengah test. */
async function openDocuments(extra: ApiRoutes = {}, counter = "0 of 7 documents") {
  const routes = stepRoutes(extra);
  const fetchSpy = await openStep("documents", routes);
  await screen.findByText(counter);
  return { routes, fetchSpy };
}

describe(
  "New Application - Document",
  () => {
    afterEach(() => vi.restoreAllMocks());

    it("AC-47.06 labels BPJS Optional and counts only the 7 mandatory documents", async () => {
      await openDocuments();

      expect(slot("BPJS").getByText("Optional")).toBeInTheDocument();
      expect(slot("KTP").queryByText("Optional")).not.toBeInTheDocument();
      expect(screen.getByText("0 of 7 documents")).toBeInTheDocument();
    });

    it("AC-47.01 uploads ktp.jpg to the KTP slot, shows it Uploaded, and counts 1 of 7 documents", async () => {
      const { routes, fetchSpy } = await openDocuments({
        [`PUT ${DOCUMENTS_PATH}/KTP`]: uploaded("KTP", "ktp.jpg", 800 * 1024, 1),
      });
      routes[GET_DOCUMENTS] = documentSlots({ KTP: "ktp.jpg" });

      chooseFile("KTP", fileOf("ktp.jpg", 800 * 1024, "image/jpeg"));

      expect(await screen.findByText("1 of 7 documents")).toBeInTheDocument();
      expect(slot("KTP").getByText("ktp.jpg")).toBeInTheDocument();
      expect(slot("KTP").getByText("Uploaded")).toBeInTheDocument();
      const call = fetchSpy.mock.calls.find(
        ([input, init]) => init?.method === "PUT" && String(input).endsWith("/KTP"),
      );
      const body = call?.[1]?.body;
      expect(body instanceof FormData ? body.get("file") : null).toMatchObject({ name: "ktp.jpg" });
    });

    it("AC-47.02 shows the allowed file types message on the NPWP slot for npwp.exe", async () => {
      await openDocuments({ [`PUT ${DOCUMENTS_PATH}/NPWP`]: refused(415, "UNSUPPORTED_FILE_TYPE") });

      chooseFile("NPWP", fileOf("npwp.exe", 1024, "application/x-msdownload"));

      expect(await slot("NPWP").findByText("Allowed file types: png, jpg, jpeg, pdf, docx")).toBeInTheDocument();
      expect(slot("NPWP").queryByText("Uploaded")).not.toBeInTheDocument();
    });

    it("AC-47.03 accepts a PDF of exactly 2 MB on the Slip Gaji slot", async () => {
      const { routes } = await openDocuments({
        [`PUT ${DOCUMENTS_PATH}/SLIP_GAJI`]: uploaded("SLIP_GAJI", "slip.pdf", 2 * MB, 1),
      });
      routes[GET_DOCUMENTS] = documentSlots({ SLIP_GAJI: "slip.pdf" });

      chooseFile("Slip Gaji", fileOf("slip.pdf", 2 * MB));

      expect(await slot("Slip Gaji").findByText("Uploaded")).toBeInTheDocument();
    });

    it("AC-47.04 shows the 2 MB message on the Slip Gaji slot for a 2.1 MB PDF", async () => {
      await openDocuments({ [`PUT ${DOCUMENTS_PATH}/SLIP_GAJI`]: refused(413, "FILE_TOO_LARGE") });

      chooseFile("Slip Gaji", fileOf("slip.pdf", Math.round(2.1 * MB)));

      expect(await slot("Slip Gaji").findByText("File must not exceed 2 MB")).toBeInTheDocument();
    });

    it("AC-47.05 replaces the KTP file with ktp-baru.jpg from the replace icon", async () => {
      const { routes } = await openDocuments(
        {
          [GET_DOCUMENTS]: documentSlots({ KTP: "ktp.jpg" }),
          [`PUT ${DOCUMENTS_PATH}/KTP`]: uploaded("KTP", "ktp-baru.jpg", 900 * 1024, 1),
        },
        "1 of 7 documents",
      );
      expect(slot("KTP").getByText("ktp.jpg")).toBeInTheDocument();
      expect(slot("KTP").queryByRole("button", { name: "Upload KTP" })).not.toBeInTheDocument();
      routes[GET_DOCUMENTS] = documentSlots({ KTP: "ktp-baru.jpg" });

      fireEvent.click(slot("KTP").getByRole("button", { name: "Replace KTP" }));
      chooseFile("KTP", fileOf("ktp-baru.jpg", 900 * 1024, "image/jpeg"));

      expect(await slot("KTP").findByText("ktp-baru.jpg")).toBeInTheDocument();
      expect(slot("KTP").queryByText("ktp.jpg")).not.toBeInTheDocument();
    });
  },
  FLOW_TIMEOUT_MS,
);
