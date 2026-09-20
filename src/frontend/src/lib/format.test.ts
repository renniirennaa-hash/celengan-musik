import {
  formatDateText,
  formatDaysRemaining,
  formatMonthPeriod,
  formatPercent,
  formatRupiah,
  parseRupiahInput,
  toDateText,
  todayDateText,
} from "@/lib/format";
import { describe, expect, it } from "vitest";

describe("formatRupiah", () => {
  it("formats a bigint amount with Rp and Indonesian separators", () => {
    // Intl renders the currency symbol separated by a non-breaking space.
    expect(formatRupiah(1_500_000n)).toBe("Rp\u00a01.500.000");
  });

  it("formats zero", () => {
    expect(formatRupiah(0n)).toBe("Rp\u00a00");
  });
});

describe("formatPercent", () => {
  it("keeps one decimal and appends a percent sign", () => {
    expect(formatPercent(25)).toBe("25%");
    expect(formatPercent(33.333)).toBe("33,3%");
  });
});

describe("parseRupiahInput", () => {
  it("strips separators and returns a bigint", () => {
    expect(parseRupiahInput("1.500.000")).toBe(1_500_000n);
    expect(parseRupiahInput("1500000")).toBe(1_500_000n);
  });

  it("returns null for an empty or non-numeric value", () => {
    expect(parseRupiahInput("")).toBeNull();
    expect(parseRupiahInput("abc")).toBeNull();
  });
});

describe("date formatting", () => {
  it("formats a YYYY-MM-DD date in Indonesian", () => {
    expect(formatDateText("2026-02-01")).toBe("1 Februari 2026");
  });

  it("formats a YYYY-MM month period in Indonesian", () => {
    expect(formatMonthPeriod("2026-05")).toBe("Mei 2026");
  });

  it("round-trips a local date through toDateText", () => {
    expect(toDateText(new Date(2026, 1, 1))).toBe("2026-02-01");
    expect(todayDateText()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatDaysRemaining", () => {
  it("labels future, today, and overdue counts distinctly", () => {
    expect(formatDaysRemaining(5)).toBe("5 hari lagi");
    expect(formatDaysRemaining(0)).toBe("Hari ini");
    expect(formatDaysRemaining(-3)).toBe("Lewat 3 hari");
  });
});
