/**
 * FSMS V2 — data-access error envelope (Phase 10).
 *
 * Mirrors the V101 typed envelope `{ ok, error, code }` (§6 of the
 * architecture). Every repository method returns `ServiceResult<T>` — either
 * `{ ok: true, data }` or `{ ok: false, error }` — never a bare throw, so
 * callers handle failures explicitly and the UI can localize messages.
 */

export class ServiceError extends Error {
  constructor(
    /** stable machine code (localized by the UI layer) */
    public readonly code: string,
    /** HTTP-ish status for logging/transport (mirrors V101 semantics) */
    public readonly status: number,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "ServiceError";
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError };

export const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export const fail = <T = never>(error: ServiceError): ServiceResult<T> => ({
  ok: false,
  error,
});

/** Postgres SQLSTATE → stable envelope code. */
const PG_CODE_MAP: Record<string, { code: string; status: number }> = {
  "23505": { code: "duplicate", status: 409 }, // unique_violation
  "23503": { code: "reference_missing", status: 409 }, // foreign_key_violation
  "23502": { code: "required_missing", status: 422 }, // not_null_violation
  "23514": { code: "constraint_violation", status: 422 }, // check_violation
  "22P02": { code: "invalid_input", status: 422 }, // invalid_text_representation
  "22003": { code: "value_out_of_range", status: 422 }, // numeric_value_out_of_range
  "42501": { code: "forbidden", status: 403 }, // insufficient_privilege (RLS)
  "42P01": { code: "not_found", status: 404 }, // undefined_table
  "40001": { code: "serialization_failure", status: 409 },
  "23540": { code: "not_found", status: 404 },
  "53300": { code: "too_many_connections", status: 503 },
};

/**
 * Convert any thrown/unknown error into a ServiceError. Postgres errors carry
 * a `code` (SQLSTATE); everything else becomes a generic internal error so
 * internal details never leak to clients.
 */
export function mapDbError(err: unknown, fallbackMessage = "Database error"): ServiceError {
  if (err instanceof ServiceError) return err;

  const pg = err as { code?: string; message?: string };
  const mapped = PG_CODE_MAP[pg.code ?? ""];
  if (mapped) {
    return new ServiceError(mapped.code, mapped.status, safeMessage(pg.message) ?? fallbackMessage, err);
  }

  // RLS-scoped select returning zero rows is not an error; but a denied write
  // surfaces as 42501. Anything else is treated as internal.
  return new ServiceError("database_error", 500, fallbackMessage, err);
}

function safeMessage(message?: string): string | null {
  if (!message) return null;
  // strip pg error detail noise; keep the first human line
  return message.split("\n")[0].slice(0, 300) || null;
}
