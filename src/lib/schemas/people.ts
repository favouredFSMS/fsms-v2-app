import { z } from "zod";

/**
 * FSMS V2 — shared people-management schemas (Phase 12).
 * Imported by both the repository layer (server) and interactive forms.
 */

export const peopleSearchSchema = z.object({
  search: z.string().trim().max(200).nullish(),
  pageSize: z.number().int().min(1).max(100).default(20),
  cursor: z.string().max(500).nullish(),
});

export const parentCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().max(40).nullish(),
  email: z.string().trim().max(320).nullish(),
  notes: z.string().trim().max(4000).nullish(),
});

/**
 * The dev seed uses fixed UUIDs with a version nibble of `0` (e.g.
 * 00000000-0000-0000-0000-000000000401), which Zod's strict `.uuid()` rejects.
 * Accept any well-formed hex UUID instead.
 */
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuidSchema = z.string().regex(UUID_RE, "Invalid id");

export const parentLinkSchema = z.object({
  studentId: uuidSchema,
  parentId: uuidSchema,
  relationship: z.string().trim().min(1).max(40).default("parent"),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email").max(320),
  roleKey: z.string().trim().min(1).max(40),
  status: z.enum(["active", "pending", "deactivated"]).default("active"),
});

export const userStatusSchema = z.object({
  userId: uuidSchema,
  status: z.enum(["active", "pending", "blocked", "deactivated"]),
});

export type PeopleSearchInput = z.infer<typeof peopleSearchSchema>;
export type ParentCreateInput = z.infer<typeof parentCreateSchema>;
export type ParentLinkInput = z.infer<typeof parentLinkSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserStatusInput = z.infer<typeof userStatusSchema>;
