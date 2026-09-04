/**
 * FSMS V2 — tiny class-name combiner.
 *
 * Joins truthy class tokens, ignoring falsy values, so components can
 * conditionally apply styles without a dependency on clsx/tailwind-merge.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
