import { z } from "zod";

/**
 * FSMS V2 — shared Zod schemas (Phase 10).
 *
 * Imported by both the repository layer (server) and interactive client
 * forms, so validation rules are defined once (architecture §6). The 100-row
 * page cap is a deliberate guard against unbounded queries.
 */

export const studentSearchSchema = z.object({
  search: z.string().trim().max(200).nullish(),
  level: z.string().trim().max(20).nullish(),
  status: z.string().trim().max(30).nullish(),
  pageSize: z.number().int().min(1).max(100).default(20),
  cursor: z.string().max(500).nullish(),
});

export const studentCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  student_no: z.string().trim().max(100).nullish(),
  legacy_id: z.string().trim().max(100).nullish(),
  level_code: z.string().trim().max(20).nullish(),
  email: z.string().trim().max(320).nullish(),
  phone: z.string().trim().max(40).nullish(),
  notes: z.string().trim().max(4000).nullish(),
});

export const studentUpdateSchema = studentCreateSchema.partial();

export type StudentSearchFilters = z.infer<typeof studentSearchSchema>;
export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
