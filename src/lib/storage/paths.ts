/**
 * FSMS V2 — storage path construction + filename sanitisation (Phase 26).
 *
 * Uploaded objects are laid out tenant-first so that Supabase Storage policies
 * can be expressed as "objects under {schoolId}/… are only readable by that
 * school" (defense in depth on top of the app-level checks). Pure module, no
 * I/O — unit-testable.
 */

/** Characters that are safe in a storage key (and in a filename). */
const UNSAFE = /[^a-zA-Z0-9._-]/g;

/**
 * Sanitise a user-supplied filename to a safe storage segment.
 * Takes the last path segment (basename), strips leading dots (no `..` or
 * hidden files), then collapses any other unsafe character to `_`. Internal
 * dots (e.g. `notes.pdf`) are preserved. Result is never empty.
 */
export function sanitizeFilename(name: string): string {
  const last = String(name ?? "").split(/[/\\]+/).pop() ?? "";
  const base = last
    .replace(/^\.+/, "")
    .replace(UNSAFE, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
  return base || "file";
}

/** A UUID-ish token check — storage path ids must be plain identifiers. */
export function sanitizeId(id: string): string {
  return String(id ?? "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
}

export type StoragePurpose =
  | "lessons"
  | "homework"
  | "materials"
  | "badges"
  | "avatars"
  | "general";

/** Whitelisted purpose segments (anything else falls back to "general"). */
const PURPOSES: ReadonlySet<string> = new Set<StoragePurpose>([
  "lessons",
  "homework",
  "materials",
  "badges",
  "avatars",
  "general",
]);

/**
 * Build a tenant-scoped storage path:
 * `{schoolId}/{purpose}/{id}/{filename}`.
 *
 * `id` scopes the object to a parent record (lesson/homework/material id) so
 * listing a purpose is cheap; unknown purposes degrade to `general`.
 */
export function buildStoragePath(input: {
  schoolId: string;
  purpose: string;
  id: string;
  filename: string;
}): string {
  const purpose = PURPOSES.has(input.purpose) ? input.purpose : "general";
  const school = sanitizeId(input.schoolId);
  const id = sanitizeId(input.id);
  const file = sanitizeFilename(input.filename);
  if (!school) throw new Error("buildStoragePath: schoolId is required");
  return [school, purpose, id, file].filter(Boolean).join("/");
}

/**
 * Validate that a stored path looks like one of ours (tenant/purpose/id/file)
 * before we delete it — prevents deleting arbitrary bucket objects.
 */
export function isSafeStoragePath(path: string): boolean {
  if (typeof path !== "string" || !path) return false;
  const parts = path.split("/");
  if (parts.length !== 4) return false;
  const [school, purpose, id, file] = parts;
  return (
    /^[a-zA-Z0-9-]{1,64}$/.test(school) &&
    PURPOSES.has(purpose) &&
    /^[a-zA-Z0-9-]{1,64}$/.test(id) &&
    /^[a-zA-Z0-9._-]{1,120}$/.test(file)
  );
}
