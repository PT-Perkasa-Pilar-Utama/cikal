import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatPercent, parseMoneyInput, parsePercentInput, todayIsoDate } from "./format";

describe("format", () => {
  it("groups money thousands with dots and hides zero cents", () => {
    expect(formatMoney("10000000.00")).toBe("10.000.000");
    expect(formatMoney("10000000.50")).toBe("10.000.000,50");
    expect(formatMoney("250.00")).toBe("250");
  });

  it("drops trailing percent zeros and uses a decimal comma", () => {
    expect(formatPercent("40.0000")).toBe("40");
    expect(formatPercent("12.5000")).toBe("12,5");
  });

  it("shows dates as DD-MM-YYYY", () => {
    expect(formatDate("2026-10-01")).toBe("01-10-2026");
  });

  it("reads money typed with or without thousand dots", () => {
    expect(parseMoneyInput("5.000.000")).toBe("5000000.00");
    expect(parseMoneyInput("300000001")).toBe("300000001.00");
    expect(parseMoneyInput("250.000,5")).toBe("250000.50");
  });

  it("rejects money that is not a rupiah amount", () => {
    expect(parseMoneyInput("")).toBeUndefined();
    expect(parseMoneyInput("5.00.000")).toBeUndefined();
    expect(parseMoneyInput("abc")).toBeUndefined();
  });

  it("reads percents with a comma or dot decimal", () => {
    expect(parsePercentInput("40")).toBe("40.0000");
    expect(parsePercentInput("12,5")).toBe("12.5000");
    expect(parsePercentInput("12.25")).toBe("12.2500");
    expect(parsePercentInput("-1")).toBeUndefined();
  });

  it("gives the local date as an ISO day", () => {
    expect(todayIsoDate(new Date(2026, 9, 5))).toBe("2026-10-05");
  });
});
