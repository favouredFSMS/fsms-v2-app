import { z } from "zod";

/** FSMS V2 — settings schemas (Phase 31 UAT). */

export const settingKeySchema = z
  .string()
  .trim()
  .min(1, "Key is required")
  .max(200, "Key too long")
  .regex(/^[A-Za-z0-9._:-]+$/, "Key may contain letters, digits, . _ : - only");

export const settingValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);
