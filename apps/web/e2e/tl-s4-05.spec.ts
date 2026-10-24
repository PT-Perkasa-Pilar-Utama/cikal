import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";

/*
 * TL-S4-05: Sales menghitung simulasi angsuran dari layar "Installment Simulation" (api-specs 09 §9.1, US-51).
 * Exit kartu: baris MRTM TRM_INS_001 dan TRM_INS_002.
 */

async function openSimulation(page: Page) {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main menu" })
    .getByRole("link", { name: "Installment Simulation" })
    .click();
  await expect(page.getByRole("heading", { name: "Installment Simulation" })).toBeVisible();
}

async function calculate(page: Page, input: { principal: string; tenor?: string; rate: string; type: string }) {
  await page.getByLabel(/^Principal/).fill(input.principal);
  if (input.tenor) await page.getByLabel(/^Tenor \(months\)/).fill(input.tenor);
  await page.getByLabel(/^Interest Rate/).fill(input.rate);
  await page.getByLabel(/^Interest Type/).selectOption({ label: input.type });
  await page.getByRole("button", { name: "Calculate" }).click();
}

/** Baris data jadwal (tanpa header); kolom: No, Due Date, Principal, Interest, Installment, Outstanding. */
const scheduleRows = (page: Page): Locator =>
  page.getByRole("table", { name: "Installment Schedule" }).locator("tbody tr");
const cell = (row: Locator, column: number): Locator => row.locator("td").nth(column);
const PRINCIPAL = 2;
const INTEREST = 3;
const INSTALLMENT = 4;
const OUTSTANDING = 5;

test("AC-51.02 TRM_INS_001 a flat simulation puts the Rp4 rounding difference in the 12th installment", async ({
  pageAs,
}) => {
  const page = await pageAs("sales.jkt01");
  await openSimulation(page);

  await calculate(page, { principal: "100.000.000", tenor: "12", rate: "12", type: "Flat" });

  const rows = scheduleRows(page);
  await expect(rows).toHaveCount(12);
  for (const index of [0, 10]) {
    await expect(cell(rows.nth(index), PRINCIPAL)).toHaveText("8.333.333");
    await expect(cell(rows.nth(index), INTEREST)).toHaveText("1.000.000");
    await expect(cell(rows.nth(index), INSTALLMENT)).toHaveText("9.333.333");
  }
  await expect(cell(rows.nth(11), INSTALLMENT)).toHaveText("9.333.337");
  await expect(cell(rows.nth(11), OUTSTANDING)).toHaveText("0");
});

test("AC-51.01 AC-51.02 TRM_INS_002 an effective simulation shows Rp8.884.879 with falling interest", async ({
  pageAs,
}) => {
  const page = await pageAs("sales.jkt01");
  await openSimulation(page);

  await calculate(page, { principal: "100.000.000", tenor: "12", rate: "12", type: "Effective" });

  await expect(page.getByText("Rp8.884.879")).toBeVisible();
  const rows = scheduleRows(page);
  await expect(rows).toHaveCount(12);
  await expect(cell(rows.nth(0), INSTALLMENT)).toHaveText("8.884.879");
  await expect(cell(rows.nth(0), INTEREST)).toHaveText("1.000.000");
  await expect(cell(rows.nth(1), INTEREST)).toHaveText("921.151");
  await expect(cell(rows.nth(10), INSTALLMENT)).toHaveText("8.884.879");
  await expect(cell(rows.nth(11), OUTSTANDING)).toHaveText("0");
});

test("AC-51.03 a simulation without tenor shows Tenor is required", async ({ pageAs }) => {
  const page = await pageAs("sales.jkt01");
  await openSimulation(page);

  await calculate(page, { principal: "100.000.000", rate: "12", type: "Flat" });

  await expect(page.getByText("Tenor is required")).toBeVisible();
  await expect(page.getByRole("table", { name: "Installment Schedule" })).toHaveCount(0);
});

test("AC-51.04 a 0% flat simulation shows Rp1.000.000 a month without interest", async ({ pageAs }) => {
  const page = await pageAs("sales.jkt01");
  await openSimulation(page);

  await calculate(page, { principal: "12.000.000", tenor: "12", rate: "0", type: "Flat" });

  await expect(page.getByText("Rp1.000.000")).toBeVisible();
  const rows = scheduleRows(page);
  await expect(rows).toHaveCount(12);
  await expect(cell(rows.nth(11), INSTALLMENT)).toHaveText("1.000.000");
  await expect(page.getByText("Rp0")).toBeVisible();
});
