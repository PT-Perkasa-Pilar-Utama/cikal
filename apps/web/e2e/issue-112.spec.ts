import { KAWIN, salesDraft } from "./support/application";
import { expect, test } from "./support/fixtures";
import { availableProduct } from "./support/master-data";

/*
 * Issue #112: urutan step dari status kawin (api-specs 12 §12.1, TRM_STP_002) dan step Spouse tersambung ke API asli
 * (AC-43.01). Step Business dan Collateral dibuktikan di test integrasi dan unit web.
 */

test("AC-50.06 TRM_STP_002 a married KTA applicant fills Spouse and continues to Occupation (AC-43.01)", async ({
  pageAs,
}) => {
  const productId = await availableProduct("KTASP", "KTA Pasangan");
  const draft = await salesDraft(productId, { marital: KAWIN, next: ["personal"] });
  const page = await pageAs("sales.jkt01");
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Data Entry" }).click();
  await page.getByRole("link", { name: draft.loanId }).click();

  const stepper = page.getByRole("list", { name: "Application steps" });
  await expect(stepper.getByRole("listitem")).toHaveText([
    "Application",
    "Personal",
    "Spouse",
    "Occupation",
    "Document",
    "Emergency Contact",
  ]);
  const spouse = page.getByRole("form", { name: "Spouse" });
  await expect(spouse).toBeVisible();
  await spouse.getByLabel("Spouse Full Name").fill("Sri Wahyuni");
  await spouse.getByLabel("Spouse ID Number").fill("3273015506920002");
  await spouse.getByLabel("Spouse Date of Birth").fill("1992-06-15");
  await spouse.getByLabel("Prenuptial Agreement").selectOption({ label: "No" });
  await spouse.getByLabel("Spouse Occupation").selectOption({ label: "Karyawan Swasta" });
  await spouse.getByLabel("Spouse Monthly Income").fill("6.000.000");
  await spouse.getByRole("button", { name: "Next" }).click();

  await expect(page.getByRole("form", { name: "Occupation" })).toBeVisible();
});
