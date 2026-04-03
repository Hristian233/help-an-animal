import { describe, expect, it } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate", () => {
  it("formats a valid ISO string in DD.MM.YY, HH:MM format", () => {
    const result = formatDate("2024-03-15T14:30:00.000Z");
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{2}, \d{2}:\d{2}$/);
    expect(result).toContain("15");
    expect(result).toContain("03");
    expect(result).toContain("24");
  });

  it("pads single-digit day and month with zero", () => {
    const result = formatDate("2024-01-05T09:05:00.000Z");
    expect(result).toMatch(/^05\.01\.24/);
    expect(result).toMatch(/\d{2}:\d{2}$/);
  });

  it("uses last two digits of year", () => {
    expect(formatDate("1999-06-15T12:00:00.000Z")).toContain(".99,");
    expect(formatDate("2000-06-15T12:00:00.000Z")).toContain(".00,");
  });

  it("handles date-only ISO string (interprets as UTC midnight)", () => {
    const result = formatDate("2024-06-15");
    expect(result).toMatch(/15\.06\.24/);
  });

  it("handles invalid date string", () => {
    const result = formatDate("not-a-date");
    expect(result).toContain("NaN");
  });
});
