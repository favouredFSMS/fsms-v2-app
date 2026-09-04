/**
 * FSMS V2 — data-access layer (Phase 10) public surface.
 *
 * UI → service/repository → adapter → Supabase/PostgreSQL
 */
export * from "./errors";
export * from "./adapter";
export * from "./context";
export * from "./repository";
export * from "./pagination";
export * from "./batch";
export * from "./validate";
export * from "./loader";
export { StudentRepository, type StudentSummary } from "./repos/students";
export { DashboardRepository, type DashboardSummary } from "./repos/dashboard";
