import { randomUUID } from "node:crypto";
import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, type ServiceResult } from "../errors";
import type { Page } from "../pagination";
import {
  parentCreateSchema,
  parentLinkSchema,
  peopleSearchSchema,
  type PeopleSearchInput,
} from "@/lib/schemas/people";

/** FSMS V2 — ParentRepository (Phase 12). */

export interface ParentSummary {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  children: number;
}

interface ParentSearchRpc {
  rows: ParentSummary[];
  total: number;
  next_cursor: string | null;
}

export class ParentRepository extends Repository {
  /** Permission-gated, school-scoped parent list (search + keyset). */
  async search(input: unknown): Promise<ServiceResult<Page<ParentSummary>>> {
    const parsed = parseOrFail(peopleSearchSchema, input);
    if (!parsed.ok) return parsed;
    const f: PeopleSearchInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<ParentSearchRpc>("parent_search", {
      p_search: f.search ?? null,
      p_page_size: f.pageSize,
      p_cursor: f.cursor ?? null,
    });
    if (error) return fail(error);
    const res = data ?? { rows: [], total: 0, next_cursor: null };
    return ok({
      items: res.rows,
      total: res.total,
      nextCursor: res.next_cursor,
    });
  }

  /** Create a parent (office). RBAC + RLS enforced. */
  async create(input: unknown): Promise<ServiceResult<ParentSummary>> {
    const parsed = parseOrFail(parentCreateSchema, input);
    if (!parsed.ok) return parsed;

    const id = randomUUID();
    const inserted = await this.insertRow(
      "parents",
      {
        id,
        ...parsed.data,
        school_id: this.ctx.profile.school_id,
        user_id: null,
      },
      "saveParent",
    );
    if (!inserted.ok) return inserted;

    return ok({
      id,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      children: 0,
    });
  }

  /** Link a parent to a student (office). */
  async link(input: unknown): Promise<ServiceResult<null>> {
    const parsed = parseOrFail(parentLinkSchema, input);
    if (!parsed.ok) return parsed;
    const { studentId, parentId, relationship } = parsed.data;

    const denied = this.can("saveParent");
    if (denied) return fail(denied);

    return this.insertRow("student_parents", {
      student_id: studentId,
      parent_id: parentId,
      relationship,
    });
  }
}
