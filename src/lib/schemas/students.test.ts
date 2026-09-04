import { describe, expect, it } from "vitest";
import { studentSearchSchema, studentCreateSchema } from "./students";

describe("studentSearchSchema", () => {
  it("accepts an empty filter object (page size defaults to 20)", () => {
    const r = studentSearchSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.pageSize).toBe(20);
  });

  it("trims and caps the search term", () => {
    expect(studentSearchSchema.safeParse({ search: "  anna  " }).success).toBe(true);
    expect(studentSearchSchema.safeParse({ search: "x".repeat(201) }).success).toBe(false);
  });

  it("rejects page sizes over the 100-row cap", () => {
    expect(studentSearchSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    expect(studentSearchSchema.safeParse({ pageSize: 0 }).success).toBe(false);
    expect(studentSearchSchema.safeParse({ pageSize: 50 }).success).toBe(true);
  });
});

describe("studentCreateSchema", () => {
  it("requires a non-blank name", () => {
    expect(studentCreateSchema.safeParse({ name: "" }).success).toBe(false);
    expect(studentCreateSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(studentCreateSchema.safeParse({ name: "Anna" }).success).toBe(true);
  });

  it("passes through optional fields", () => {
    const r = studentCreateSchema.safeParse({
      name: "Anna",
      student_no: "S-999",
      level_code: "a2",
      email: "anna@school.org",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.student_no).toBe("S-999");
  });

  it("rejects over-long fields", () => {
    expect(studentCreateSchema.safeParse({ name: "x".repeat(201) }).success).toBe(false);
    expect(studentCreateSchema.safeParse({ name: "A", email: "x".repeat(321) }).success).toBe(false);
  });
});
