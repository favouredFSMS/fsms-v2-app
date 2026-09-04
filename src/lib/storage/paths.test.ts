import { describe, expect, it } from "vitest";
import {
  buildStoragePath,
  isSafeStoragePath,
  sanitizeFilename,
  sanitizeId,
} from "./paths";

describe("sanitizeFilename", () => {
  it("keeps safe names", () => {
    expect(sanitizeFilename("lesson-plan_2026.pdf")).toBe("lesson-plan_2026.pdf");
  });

  it("strips path traversal", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("..\\..\\x.exe")).toBe("x.exe");
  });

  it("collapses unsafe characters", () => {
    expect(sanitizeFilename("my file (1).png")).toBe("my_file_1_.png");
  });

  it("never returns empty", () => {
    expect(sanitizeFilename("")).toBe("file");
    expect(sanitizeFilename("///")).toBe("file");
  });

  it("truncates long names", () => {
    expect(sanitizeFilename("a".repeat(500)).length).toBeLessThanOrEqual(120);
  });
});

describe("sanitizeId", () => {
  it("strips non-identifier characters", () => {
    expect(sanitizeId("abc-123/../xyz")).toBe("abc-123xyz");
  });
});

describe("buildStoragePath", () => {
  it("builds a tenant-scoped path", () => {
    expect(
      buildStoragePath({
        schoolId: "9f8e7d6c",
        purpose: "materials",
        id: "1234",
        filename: "notes.pdf",
      }),
    ).toBe("9f8e7d6c/materials/1234/notes.pdf");
  });

  it("falls back to general for unknown purposes", () => {
    expect(
      buildStoragePath({
        schoolId: "s",
        purpose: "hack",
        id: "x",
        filename: "f",
      }),
    ).toBe("s/general/x/f");
  });

  it("rejects a missing school id", () => {
    expect(() =>
      buildStoragePath({ schoolId: "", purpose: "materials", id: "x", filename: "f" }),
    ).toThrow(/schoolId/);
  });
});

describe("isSafeStoragePath", () => {
  it("accepts well-formed paths", () => {
    expect(isSafeStoragePath("9f8e7d6c/materials/1234/notes.pdf")).toBe(true);
  });

  it("rejects malformed paths", () => {
    expect(isSafeStoragePath("a/b/c")).toBe(false);
    expect(isSafeStoragePath("a/b/c/d/e")).toBe(false);
    expect(isSafeStoragePath("a/hack/c/d")).toBe(false);
    expect(isSafeStoragePath("")).toBe(false);
    expect(isSafeStoragePath("a/materials/c/../d")).toBe(false);
  });
});
