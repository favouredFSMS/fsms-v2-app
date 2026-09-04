import type { z } from "zod";
import { ServiceError, fail, ok, type ServiceResult } from "./errors";

/**
 * FSMS V2 — validation helpers (Phase 10).
 *
 * Zod schemas are shared between client and server (architecture §6). These
 * helpers turn a schema into a `ServiceResult` so repository/service methods
 * can validate inline and return the typed error envelope.
 */

export function parseOrFail<T>(
  schema: z.ZodType<T>,
  input: unknown,
  code = "invalid_input",
): ServiceResult<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    const message = first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input";
    return fail(new ServiceError(code, 422, message, result.error));
  }
  return ok(result.data);
}
