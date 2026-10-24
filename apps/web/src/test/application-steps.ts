import {
  type ApplicationDocumentsResponse,
  type FormSection,
  type ParameterOptionsResponse,
  type SavableSection,
  type SectionSaveResponse,
  sectionSaveResponseMock,
} from "@cikal/contracts";
import { screen, waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { STEP_LABELS } from "../features/application-entry/labels";
import { activeStep, clickButton, DRAFT_ID, draftCreated, entryRoutes } from "./application-entry";
import { type ApiRoutes, renderApp, type StubResponse, stubApi } from "./render-app";

export const SECTIONS_PATH = `/api/v1/applications/${DRAFT_ID}/sections`;
export const DOCUMENTS_PATH = `/api/v1/applications/${DRAFT_ID}/documents`;
export const SUBMIT_PATH = `/api/v1/applications/${DRAFT_ID}/submit`;

/** Jawaban 200 simpan section; `message` hanya pada "Save as Draft" (api-specs 12 §12.3). */
export function sectionSaved(section: SavableSection, nextSection: FormSection | null, message?: string): StubResponse {
  return {
    status: 200,
    body: {
      data: { ...sectionSaveResponseMock.data, savedSection: section, nextSection },
      ...(message ? { message } : {}),
    } satisfies SectionSaveResponse,
  };
}

/** Tujuh dokumen wajib checklist KTA (AC-25.01) dan BPJS opsional (AC-47.06). */
const CHECKLIST: [string, string][] = [
  ["KTP", "KTP"],
  ["KK", "KK"],
  ["NPWP", "NPWP"],
  ["SLIP_GAJI", "Slip Gaji"],
  ["REKENING_KORAN", "Rekening Koran 3 Bulan"],
  ["SERTIFIKAT", "Sertifikat"],
  ["KTP_PASANGAN", "KTP Pasangan"],
];

/** Slot step Document; `uploaded` berisi `documentType` dan nama file yang sudah terunggah. */
export function documentSlots(uploaded: Record<string, string> = {}): StubResponse {
  const slots = [
    ...CHECKLIST.map(([type, label]) => ({ type, label, mandatory: true })),
    {
      type: "BPJS",
      label: "BPJS",
      mandatory: false,
    },
  ].map(({ type, label, mandatory }) => {
    const fileName = uploaded[type];
    return {
      documentType: type,
      label,
      isMandatory: mandatory,
      file: fileName
        ? {
            fileId: "0192b6f3-0001-7000-8000-00000000000a",
            fileName,
            sizeBytes: 1024,
            uploadedAt: "2026-10-20T07:05:00Z",
          }
        : null,
      verificationStatus: "PENDING" as const,
    };
  });
  const uploadedMandatory = slots.filter((slot) => slot.isMandatory && slot.file).length;
  return {
    status: 200,
    body: {
      data: { slots, completeness: { uploadedMandatory, requiredMandatory: 7 } },
    } satisfies ApplicationDocumentsResponse,
  };
}

const options = (...values: [string, string][]): StubResponse => ({
  status: 200,
  body: {
    data: values.map(([paramId, paramValue]) => ({ paramId, paramValue, isActive: true })),
  } satisfies ParameterOptionsResponse,
});

/** Rute API seluruh step: draft, simpan tiap section dengan "Next", slot dokumen, dan pilihan Occupation dan kontak. */
export function stepRoutes(extra: ApiRoutes = {}): ApiRoutes {
  return entryRoutes({
    "POST /api/v1/applications": draftCreated,
    [`PUT ${SECTIONS_PATH}/personal?strict=true`]: sectionSaved("personal", "occupation"),
    [`PUT ${SECTIONS_PATH}/occupation?strict=true`]: sectionSaved("occupation", "documents"),
    [`PUT ${SECTIONS_PATH}/emergency-contact?strict=true`]: sectionSaved("emergency-contact", null),
    [`GET ${DOCUMENTS_PATH}`]: documentSlots(),
    "GET /api/v1/parameters/Source%20of%20Income/options": options(["001", "Bekerja"], ["003", "Pensiun"]),
    "GET /api/v1/parameters/Occupation/options": options(["001", "Karyawan Swasta"], ["005", "Wiraswasta"]),
    "GET /api/v1/parameters/Industry%20of%20Profession/options": options(["001", "Perdagangan"]),
    "GET /api/v1/parameters/Pension%20Instance/options": options(),
    "GET /api/v1/parameters/Relation%20with%20Applicant/options": options(["002", "Saudara Kandung"]),
    ...extra,
  });
}

/**
 * Buka New Application, jalankan `prepare` di step Application, lalu tekan "Next" sampai `target` aktif. API tiruan
 * menerima form kosong, jadi step sebelum `target` tidak perlu diisi.
 */
export async function openStep(
  target: FormSection,
  routes: ApiRoutes = stepRoutes(),
  prepare: () => Promise<void> = async () => {},
) {
  const fetchSpy = stubApi(routes);
  renderApp("/applications/new");
  await screen.findByRole("form", { name: "Application" });
  await prepare();
  const label = STEP_LABELS[target];
  while (!activeStep().textContent?.includes(label)) {
    const before = activeStep().textContent;
    clickButton("Next");
    await waitFor(() => expect(activeStep().textContent).not.toBe(before));
  }
  return fetchSpy;
}
