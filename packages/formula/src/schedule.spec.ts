import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { buildSchedule } from "./schedule.js";

const dueDates = (count: number) =>
  Array.from({ length: count }, (_, index) => new Date(Date.UTC(2026, 10 + index, 21)));
const rounding = { mode: "HALF_UP" as const, scale: 0 };

describe("buildSchedule", () => {
  it("charges flat interest on the original principal and moves the rounding difference to the last row", () => {
    const rows = buildSchedule({
      interestType: "FLAT",
      principal: new Decimal("100000000"),
      annualRate: new Decimal("12"),
      installment: new Decimal("9333333"),
      dueDates: dueDates(12),
      rounding,
    });

    expect(rows[0]).toMatchObject({ principalAmount: new Decimal("8333333"), interestAmount: new Decimal("1000000") });
    expect(rows[11]).toMatchObject({
      principalAmount: new Decimal("8333337"),
      installmentAmount: new Decimal("9333337"),
      outstandingAmount: new Decimal("0"),
    });
  });

  it("charges effective interest on the outstanding balance", () => {
    const rows = buildSchedule({
      interestType: "EFFECTIVE",
      principal: new Decimal("100000000"),
      annualRate: new Decimal("12"),
      installment: new Decimal("8884879"),
      dueDates: dueDates(12),
      rounding,
    });

    expect(rows[0]).toMatchObject({
      interestAmount: new Decimal("1000000"),
      outstandingAmount: new Decimal("92115121"),
    });
    expect(rows[1]?.interestAmount).toEqual(new Decimal("921151"));
    expect(rows[11]?.outstandingAmount).toEqual(new Decimal("0"));
  });

  it("rejects an installment lower than its interest", () => {
    expect(() =>
      buildSchedule({
        interestType: "EFFECTIVE",
        principal: new Decimal("100000000"),
        annualRate: new Decimal("12"),
        installment: new Decimal("100"),
        dueDates: dueDates(12),
        rounding,
      }),
    ).toThrow("Installment 1 is lower than its interest");
  });
});
