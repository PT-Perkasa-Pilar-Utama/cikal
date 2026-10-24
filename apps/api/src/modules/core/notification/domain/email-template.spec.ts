import { describe, expect, it } from "vitest";
import { renderTemplate } from "./email-template.js";

describe("renderTemplate", () => {
  it("AC-50.05 fills the Loan ID into the confirmation subject", () => {
    expect(renderTemplate("Pengajuan kredit {{loanId}} telah kami terima", { loanId: "20102026KTA0000013" })).toBe(
      "Pengajuan kredit 20102026KTA0000013 telah kami terima",
    );
  });

  it("keeps a placeholder without a value", () => {
    expect(renderTemplate("Halo {{name}}", {})).toBe("Halo {{name}}");
  });
});
