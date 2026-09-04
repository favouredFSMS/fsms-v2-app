import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, type ServiceResult } from "../errors";
import {
  yearCreateSchema,
  termCreateSchema,
  subjectCreateSchema,
  type YearCreateInput,
  type TermCreateInput,
  type SubjectCreateInput,
} from "@/lib/schemas/academic";

/**
 * FSMS V2 — AcademicRepository (Phase 13).
 *
 * Reference structure (school/levels/subjects/years/terms) and leadership/
 * office-gated creation of academic years, terms and subjects. All mutations
 * are enforced inside the RPCs (fsms.is_leadership / fsms.has_perm).
 */

export interface AcademicStructure {
  school: {
    id: string;
    name: string;
    timezone: string;
    currency: string;
    locale: string;
  } | null;
  levels: Array<{ id: string; code: string; cefr: string | null; label: string | null; sort: number }>;
  subjects: Array<{ id: string; name: string }>;
  academic_years: Array<{ id: string; name: string; starts_on: string | null; ends_on: string | null; current: boolean }>;
  terms: Array<{ id: string; academic_year_id: string; name: string; starts_on: string | null; ends_on: string | null }>;
}

export class AcademicRepository extends Repository {
  /** One-shot reference payload; null for non-staff callers. */
  async structure(): Promise<ServiceResult<AcademicStructure | null>> {
    const { data, error } = await this.ctx.db.rpc<AcademicStructure | null>("academic_structure", {});
    if (error) return fail(error);
    return ok(data ?? null);
  }

  /** Create an academic year (leadership). */
  async createYear(input: unknown): Promise<ServiceResult<{ id: string; name: string } | null>> {
    const parsed = parseOrFail(yearCreateSchema, input);
    if (!parsed.ok) return parsed;
    const f: YearCreateInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ id: string; name: string } | null>("create_academic_year", {
      p_name: f.name,
      p_starts_on: f.startsOn ?? null,
      p_ends_on: f.endsOn ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Create a term inside an academic year (leadership). */
  async createTerm(input: unknown): Promise<ServiceResult<{ id: string; name: string } | null>> {
    const parsed = parseOrFail(termCreateSchema, input);
    if (!parsed.ok) return parsed;
    const f: TermCreateInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ id: string; name: string } | null>("create_term", {
      p_year: f.academicYearId,
      p_name: f.name,
      p_starts_on: f.startsOn ?? null,
      p_ends_on: f.endsOn ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Create a subject (saveSubjects, idempotent per school+name). */
  async createSubject(input: unknown): Promise<ServiceResult<{ id: string; name: string } | null>> {
    const parsed = parseOrFail(subjectCreateSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveSubjects");
    if (denied) return fail(denied);
    const f: SubjectCreateInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ id: string; name: string } | null>("create_subject", {
      p_name: f.name,
    });
    if (error) return fail(error);
    return ok(data);
  }
}
