import { describe, expect, it } from "vitest";
import { ServiceError, mapDbError, ok, fail, type ServiceResult } from "./errors";

describe("ServiceResult helpers", () => {
  it("wraps ok/fail into the envelope", () => {
    const good: ServiceResult<number> = ok(42);
    const bad: ServiceResult<number> = fail(new ServiceError("forbidden", 403, "nope"));

    expect(good.ok).toBe(true);
    if (good.ok) expect(good.data).toBe(42);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("forbidden");
  });
});

describe("mapDbError", () => {
  it("passes ServiceError through unchanged", () => {
    const original = new ServiceError("x", 400, "keep me");
    expect(mapDbError(original)).toBe(original);
  });

  it("maps known Postgres SQLSTATE codes", () => {
    expect(mapDbError({ code: "23505", message: "duplicate key" }).code).toBe("duplicate");
    expect(mapDbError({ code: "23503", message: "fk" }).code).toBe("reference_missing");
    expect(mapDbError({ code: "42501", message: "permission denied" }).code).toBe("forbidden");
    expect(mapDbError({ code: "22P02", message: "bad input" }).code).toBe("invalid_input");
  });

  it("treats RLS denials (42501) as forbidden with status 403", () => {
    const e = mapDbError({ code: "42501" });
    expect(e.status).toBe(403);
    expect(e.code).toBe("forbidden");
  });

  it("falls back to a generic internal error for unknown errors", () => {
    const e = mapDbError(new Error("boom"));
    expect(e.code).toBe("database_error");
    expect(e.status).toBe(500);
  });

  it("strips multi-line pg messages", () => {
    const e = mapDbError({ code: "23505", message: "line one\nDETAIL: secret" });
    expect(e.message).toBe("line one");
  });
});
