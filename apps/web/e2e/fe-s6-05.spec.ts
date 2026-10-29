import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";
import { confirmApprove, openPendingDetail, pendingRow } from "./support/pending";

/*
 * FE-S6-05: Maker mengajukan format nomor SP3K baru dengan pratinjau langsung, pola salah ditolak, dan format lama
 * tetap dipakai sampai Checker menyetujuinya di "Pending Document Numbering" (api-specs 10 §10.3 s.d. §10.5).
 */

// Test terakhir menyetujui pengajuan dari test sebelumnya.
test.describe.configure({ mode: "serial" });

const PENDING_NUMBERING = "/master/numbering/pending";
const NEW_PATTERN = "SP3K-{BRANCH_CODE}-{YYYY}{MM}-{SEQ:5}";
const SP3K_ROW = "SP3K";

/** Pratinjau memakai cabang contoh 011 dan tanggal bisnis hari ini di Asia/Jakarta (api-specs 10 §10.4). */
function expectedPreview(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((all, part) => ({ ...all, [part.type]: part.value }), {});
  return `SP3K-011-${parts.year}${parts.month}-00001`;
}

let submittedVersion = 0;

async function openNumbering(page: Page): Promise<Locator> {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main menu" })
    .getByRole("link", { name: "Document Number Format" })
    .click();
  await expect(page.getByRole("heading", { name: "Document Numbering", exact: true })).toBeVisible();
  return page.getByRole("table", { name: "Document Numbering" }).getByRole("row").filter({ hasText: SP3K_ROW });
}

async function editSp3k(page: Page, pattern: string): Promise<Locator> {
  await page.getByRole("button", { name: "Edit SP3K" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit Document Numbering" });
  await dialog.getByRole("textbox", { name: "Pattern" }).fill(pattern);
  return dialog;
}

test("AC-102.04 a pattern without {SEQ:n} is refused", async ({ pageAs }) => {
  const page = await pageAs("maker.01");
  await openNumbering(page);

  const dialog = await editSp3k(page, "SP3K/{BRANCH_CODE}/{YYYY}");
  await dialog.getByRole("button", { name: "Submit" }).click();

  await expect(
    dialog.getByText("Pattern must contain exactly one sequence token {SEQ:n} with n between 3 and 9"),
  ).toBeVisible();
});

test("AC-102.05 a pattern with BRANCH_NAME is refused", async ({ pageAs }) => {
  const page = await pageAs("maker.01");
  await openNumbering(page);

  const dialog = await editSp3k(page, "{SEQ:4}/SP3K/{BRANCH_NAME}");
  await dialog.getByRole("button", { name: "Submit" }).click();

  await expect(dialog.getByText("Unknown token: BRANCH_NAME")).toBeVisible();
});

test("AC-102.01 a Maker submits a new SP3K format and the old one stays active", async ({ pageAs }) => {
  const page = await pageAs("maker.01");
  const row = await openNumbering(page);
  const activePattern = (await row.getByRole("cell").nth(1).textContent()) ?? "";
  submittedVersion = Number(await row.getByRole("cell").nth(4).textContent()) + 1;

  const dialog = await editSp3k(page, NEW_PATTERN);
  await dialog.getByRole("combobox", { name: "Reset Period" }).selectOption({ label: "Monthly" });
  await dialog.getByRole("combobox", { name: "Counter Scope" }).selectOption({ label: "Branch" });
  await expect(dialog.getByRole("status", { name: "Preview" })).toHaveText(expectedPreview());
  await dialog.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Data submitted for approval")).toBeVisible();
  await expect(page.getByText(expectedPreview())).toBeVisible();
  await expect(row).toContainText(activePattern);
  await expect(row).toContainText("Waiting Approval");
  await expect(page.getByRole("button", { name: "Edit SP3K" })).toBeDisabled();
  await page.getByRole("link", { name: "Pending Document Numbering" }).click();
  await expect(pendingRow(page, `SP3K version ${submittedVersion}`)).toContainText("maker.01");
});

test("AC-102.01 after the Checker approves, the new SP3K format is active", async ({ pageAs }) => {
  const checker = await pageAs("checker.001");
  await openPendingDetail(checker, PENDING_NUMBERING, `SP3K version ${submittedVersion}`);
  await confirmApprove(checker);
  await expect(checker.getByText("Data approved")).toBeVisible();

  const row = await openNumbering(await pageAs("maker.01"));
  await expect(row).toContainText(NEW_PATTERN);
  await expect(row).toContainText("Active");
});
