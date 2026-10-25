import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";
import { confirmApprove, openPendingDetail, pendingRow } from "./support/pending";

/*
 * FE-S4-03: Maker mengubah keputusan satu baris Decision Matrix, Checker menyetujuinya di "Pending Decision Matrix",
 * lalu simulasi memakai baris baru (api-specs 24 §24.2, §24.3). Matrix awal berasal dari seed `dev` M11.
 */

// Test kedua menyetujui perubahan yang diajukan test pertama.
test.describe.configure({ mode: "serial" });

const PENDING_MATRIX = "/master/decision/pending";
/** Nama ChangeRequest baris prioritas 5 seed (SLIK Collect 2, Scoring Pass) yang diubah menjadi Go (AC-36.01). */
const AC_36_01_CHANGE = "Priority 5: Scoring Pass, SLIK Collect 2 = Go";
const CLEAN_OUTCOMES = { Dedup: "UnMatch", Dukcapil: "Passed", Fraud: "Clean", RAC: "Pass", Scoring: "Pass" };

async function openDecisionMatrix(page: Page) {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Decision Matrix" }).click();
  await expect(page.getByRole("heading", { name: "Decision Matrix", exact: true })).toBeVisible();
}

async function simulate(page: Page, outcomes: Record<string, string>): Promise<Locator> {
  await openDecisionMatrix(page);
  await page.getByRole("button", { name: "Simulate" }).click();
  const dialog = page.getByRole("dialog", { name: "Decision Matrix Simulation" });
  for (const [label, option] of Object.entries(outcomes)) {
    await dialog.getByRole("combobox", { name: label }).selectOption({ label: option });
  }
  await dialog.getByRole("button", { name: "Run" }).click();
  return dialog;
}

test("AC-36.01 a Maker changes SLIK Collect 2 with Scoring Pass to Go and it waits in Pending Decision Matrix", async ({
  pageAs,
}) => {
  const page = await pageAs("maker.01");
  await openDecisionMatrix(page);
  const row = page.getByRole("row").filter({ hasText: "Collect 2" });
  await expect(row).toContainText("NotGo");

  await page.getByRole("button", { name: "Edit Priority 5" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit Decision Matrix" });
  await dialog.getByRole("combobox", { name: "Decision Outcome" }).selectOption({ label: "Go" });
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Data submitted for approval")).toBeVisible();
  await expect(row).toContainText("Waiting Approval");
  await page.getByRole("link", { name: "Pending Decision Matrix" }).click();
  await expect(pendingRow(page, AC_36_01_CHANGE)).toContainText("Waiting Approval");
  await expect(pendingRow(page, AC_36_01_CHANGE)).toContainText("maker.01");
});

test("AC-36.02 after the Checker approves, the simulation uses the new Go row", async ({ pageAs }) => {
  const checker = await pageAs("checker.001");
  await openPendingDetail(checker, PENDING_MATRIX, AC_36_01_CHANGE);
  await confirmApprove(checker);
  await expect(checker.getByText("Data approved")).toBeVisible();
  const maker = await pageAs("maker.01");

  const dialog = await simulate(maker, { ...CLEAN_OUTCOMES, SLIK: "Collect 2" });

  const result = dialog.getByRole("region", { name: "Simulation Result" });
  await expect(result.getByText("Go", { exact: true })).toBeVisible();
  await expect(result).toContainText("Priority 5: Scoring Pass, SLIK Collect 2");
});

test("AC-36.02 Clean outcomes with SLIK Collect 1 decide Go with the priority 4 row", async ({ pageAs }) => {
  const dialog = await simulate(await pageAs("maker.01"), { ...CLEAN_OUTCOMES, SLIK: "Collect 1" });

  const result = dialog.getByRole("region", { name: "Simulation Result" });
  await expect(result.getByText("Go", { exact: true })).toBeVisible();
  await expect(result).toContainText(
    "Priority 4: Dedup UnMatch, Dukcapil Passed, Fraud Clean, RAC Pass, Scoring Pass, SLIK Collect 1",
  );
});

test("AC-36.04 Run without RAC, Scoring, and SLIK shows Select an outcome for every module", async ({ pageAs }) => {
  const dialog = await simulate(await pageAs("maker.01"), { Dedup: "UnMatch", Dukcapil: "Passed", Fraud: "Clean" });

  await expect(dialog.getByRole("alert")).toHaveText("Select an outcome for every module");
  await expect(dialog.getByRole("region", { name: "Simulation Result" })).toHaveCount(0);
});
