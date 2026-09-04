import { describe, expect, it } from "vitest";
import { SCHOOL_TIMEZONE, schoolDate, schoolMonth, schoolDateTime } from "./clock";

describe("clock (Novosibirsk, X1)", () => {
  it("declares the school timezone", () => {
    expect(SCHOOL_TIMEZONE).toBe("Asia/Novosibirsk");
  });

  it("formats a date as yyyy-MM-dd in Novosibirsk time", () => {
    // 2026-01-15T20:30:00Z = 2026-01-16 03:30 in Novosibirsk (UTC+7).
    const d = new Date("2026-01-15T20:30:00Z");
    expect(schoolDate(d)).toBe("2026-01-16");
  });

  it("derives the school month key yyyy-MM", () => {
    const d = new Date("2026-01-15T20:30:00Z");
    expect(schoolMonth(d)).toBe("2026-01");
  });

  it("produces a display timestamp without a UTC suffix", () => {
    const d = new Date("2026-01-15T20:30:00Z");
    expect(schoolDateTime(d)).toMatch(/^2026-01-16 03:30/);
  });
});
