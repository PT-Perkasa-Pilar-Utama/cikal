import { describe, expect, it } from "vitest";
import { comparisonRows, formatValue } from "./comparison";

const presentation = {
  labels: { productCode: "Product Code", limitAutoApproval: "Limit Auto Approval", dbrMax: "DBR Max" },
  valueLabels: { productCategory: { NON_COLLATERAL: "Non Collateral Loan" } },
};

describe("comparisonRows", () => {
  it("orders fields like the form, whatever order the server sends", () => {
    const rows = comparisonRows(
      null,
      { dsr: null, dbrMax: "40.0000", limitAutoApproval: "10000000.00", productCode: "KTA" },
      [],
      presentation,
    );

    expect(rows.map((row) => row.label)).toEqual(["Product Code", "Limit Auto Approval", "DBR Max", "Dsr"]);
  });

  it("marks only the changed fields of an update", () => {
    const rows = comparisonRows(
      { productCode: "KTA", limitAutoApproval: "10000000.00" },
      { productCode: "KTA", limitAutoApproval: "15000000.00" },
      ["limitAutoApproval"],
      presentation,
    );

    expect(rows.filter((row) => row.changed).map((row) => row.path)).toEqual(["limitAutoApproval"]);
  });

  it("marks nothing on new data, where every field is new", () => {
    const rows = comparisonRows(null, { productCode: "KTA" }, ["productCode"], presentation);

    expect(rows.some((row) => row.changed)).toBe(false);
  });

  it("leaves out the fields the presentation hides", () => {
    const rows = comparisonRows(null, { roleId: "0192b6a1-0003-7000-8000-000000000003", roleName: "Sales" }, [], {
      labels: { roleName: "Role" },
      hidden: ["roleId"],
    });

    expect(rows.map((row) => row.label)).toEqual(["Role"]);
  });
});

describe("formatValue", () => {
  it("shows contract scalars in screen format", () => {
    expect(formatValue("limitAutoApproval", "15000000.00", presentation)).toBe("15.000.000");
    expect(formatValue("dbrMax", "40.0000", presentation)).toBe("40%");
    expect(formatValue("validFrom", "2026-10-01", presentation)).toBe("01-10-2026");
    expect(formatValue("productCategory", "NON_COLLATERAL", presentation)).toBe("Non Collateral Loan");
    expect(formatValue("isActive", true, presentation)).toBe("Yes");
    expect(formatValue("validTo", null, presentation)).toBe("-");
  });
});
