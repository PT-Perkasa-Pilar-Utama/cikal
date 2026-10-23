import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";
import { approve, submitChecklist, submitProduct } from "./support/master-data";
import { confirmApprove, openPendingDetail, pendingRow } from "./support/pending";

/*
 * TL-S3-04: checklist dokumen diajukan dari layar, disetujui di "Pending Document Checklist", lalu tampil di daftar
 * "Document Checklist" (api-specs 08 §8.11, §8.12). Tampil sebagai slot di step Document diuji FE-S3-03.
 */

const PENDING_CHECKLIST = "/master/checklists/pending";
const KARYAWAN_SWASTA = "001";
const WIRASWASTA = "005";
const KAWIN = "002";
const BELUM_KAWIN = "001";
const AC_25_01_DOCUMENTS = ["KTP", "KK", "NPWP", "Slip Gaji", "Rekening Koran 3 Bulan", "Sertifikat", "KTP Pasangan"];

// Spec berikutnya memakai produk dan checklist dari spec sebelumnya; produk dibuat sekali per run.
test.describe.configure({ mode: "serial" });

let kprId = "";

test.beforeAll(async () => {
  // Kode "KPR" sudah dipakai spec FE-S1-03 di run yang sama; nama produk tetap "KPR" seperti AC-25.01.
  const productRequest = await submitProduct("maker.01", "KPRD", "KPR");
  kprId = (await approve("checker.001", productRequest)) ?? "";
});

async function openNewChecklist(page: Page) {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Document Checklist" }).click();
  await page.getByRole("link", { name: "New Document Checklist" }).click();
  await expect(page.getByRole("form", { name: "Document Checklist" })).toBeVisible();
}

async function chooseCombination(page: Page, occupation: string, marital: string) {
  await page.getByLabel(/^Product/).selectOption({ label: "KPR" });
  await page.getByLabel(/^Occupation/).selectOption({ label: occupation });
  await page.getByLabel(/^Marital/).selectOption({ label: marital });
}

test("AC-25.01 a Maker submits a 7-document checklist and it waits in Pending Document Checklist", async ({
  pageAs,
}) => {
  const page = await pageAs("maker.01");
  await openNewChecklist(page);
  await chooseCombination(page, "Karyawan Swasta", "Kawin");
  for (const name of AC_25_01_DOCUMENTS) await page.getByRole("checkbox", { name, exact: true }).check();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByRole("heading", { name: "Document Checklist", exact: true })).toBeVisible();
  await expect(page.getByText("Data submitted for approval")).toBeVisible();
  await page.getByRole("link", { name: "Pending Document Checklist" }).click();
  const row = pendingRow(page, "KPR / Karyawan Swasta / Kawin \\(7 documents\\)");
  await expect(row).toContainText("Waiting Approval");
  await expect(row).toContainText("maker.01");
});

test("AC-25.01 a Checker approves the checklist and it appears in Document Checklist", async ({ pageAs }) => {
  await submitChecklist("maker.01", {
    productId: kprId,
    occupation: WIRASWASTA,
    marital: KAWIN,
    items: [
      { documentType: "KTP", isMandatory: true },
      { documentType: "BPJS", isMandatory: false },
    ],
  });
  const page = await pageAs("checker.001");

  await openPendingDetail(page, PENDING_CHECKLIST, "KPR / Wiraswasta / Kawin (2 documents)");
  await confirmApprove(page);

  await expect(page.getByText("Data approved")).toBeVisible();
  await page.goto("/master/checklists");
  const row = page.getByRole("row", { name: /KPR\s+Wiraswasta\s+Kawin/ });
  await expect(row).toContainText("2 documents");
  await expect(row).toContainText("KTP, BPJS (Optional)");
  await expect(row).toContainText("Active");
});

test("AC-25.02 a checklist without documents shows Select at least one document", async ({ pageAs }) => {
  const page = await pageAs("maker.01");
  await openNewChecklist(page);
  await chooseCombination(page, "Karyawan Swasta", "Belum Kawin");
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Select at least one document")).toBeVisible();
});

test("AC-25.03 the same combination shows Document checklist already exists for this combination", async ({
  pageAs,
}) => {
  await submitChecklist("maker.01", {
    productId: kprId,
    occupation: KARYAWAN_SWASTA,
    marital: BELUM_KAWIN,
    items: [{ documentType: "KTP", isMandatory: true }],
  });
  const page = await pageAs("maker.01");
  await openNewChecklist(page);
  await chooseCombination(page, "Karyawan Swasta", "Belum Kawin");
  await page.getByRole("checkbox", { name: "KTP", exact: true }).check();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Document checklist already exists for this combination")).toBeVisible();
});
