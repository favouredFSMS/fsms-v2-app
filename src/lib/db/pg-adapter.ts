import { Client } from "pg";
import { env } from "@/lib/env";
import type { DbAdapter, DbResult, SelectQuery, WhereOp } from "./adapter";
import { mapDbError, ServiceError } from "./errors";

/**
 * FSMS V2 — local PostgreSQL adapter (Phase 10, dev harness only).
 *
 * Speaks to the bare-PostgreSQL dev sandbox. Every call impersonates the
 * signed-in user in a single transaction:
 *
 *   begin → set request.jwt.claim.sub → set local role authenticated → query → rollback
 *
 * so the SAME RLS policies that protect Supabase protect local dev too —
 * the adapter is the "withCheck RLS on every query path" guarantee in local
 * mode. Never used in production (fail-closed to Supabase).
 *
 * Identifiers (table/column names) are whitelist-validated; values are always
 * bound parameters (never string-interpolated).
 */

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function ident(name: string, kind: string): string {
  if (!IDENT.test(name)) {
    throw new ServiceError("invalid_identifier", 500, `Illegal ${kind} name: ${name}`);
  }
  return name;
}

/** Known RPCs and their positional argument order (named → positional map). */
const RPC_ARG_ORDER: Record<string, string[]> = {
  student_search: ["p_search", "p_level", "p_status", "p_page_size", "p_cursor"],
  dashboard_summary: [],
  parent_search: ["p_search", "p_page_size", "p_cursor"],
  user_search: ["p_search", "p_role", "p_page_size", "p_cursor"],
  student_detail: ["p_student"],
  set_user_status: ["p_user", "p_status"],
  assign_user_role: ["p_user", "p_role_key"],
  academic_structure: [],
  class_search: ["p_search", "p_level", "p_status", "p_page_size", "p_cursor"],
  class_detail: ["p_class"],
  create_academic_year: ["p_name", "p_starts_on", "p_ends_on"],
  create_term: ["p_year", "p_name", "p_starts_on", "p_ends_on"],
  create_subject: ["p_name"],
  create_class: ["p_name", "p_level_code", "p_class_type", "p_learner_type", "p_room", "p_academic_year", "p_term"],
  assign_teacher: ["p_class", "p_user", "p_primary"],
  remove_teacher: ["p_class", "p_user"],
  enrol_student: ["p_student", "p_class"],
  set_enrolment_status: ["p_enrolment", "p_status"],
  attendance_grid: ["p_class", "p_date"],
  save_attendance: ["p_class", "p_date", "p_marks"],
  attendance_history: ["p_class", "p_student", "p_from", "p_to", "p_page_size", "p_cursor"],
  attendance_stats: ["p_class", "p_from", "p_to"],
  my_attendance: ["p_student"],
  save_homework: ["p_class", "p_date", "p_marks"],
  homework_list: ["p_class", "p_student", "p_status", "p_from", "p_to", "p_page_size", "p_cursor"],
  submit_homework: ["p_homework", "p_note"],
  grade_homework: ["p_homework", "p_score", "p_feedback", "p_status"],
  lesson_spine: ["p_programme"],
  lesson_detail: ["p_lesson"],
  lesson_log_list: ["p_class", "p_from", "p_to", "p_page_size", "p_cursor"],
  save_lesson_log: ["p_class", "p_date", "p_lesson_no", "p_topic", "p_topic_ids", "p_participation", "p_teacher_note", "p_duration_min"],
  delete_lesson_log: ["p_log"],
  lesson_plans: ["p_class", "p_lesson"],
  save_lesson_plan: ["p_class", "p_lesson", "p_plan", "p_source"],
  lesson_change_request: ["p_class", "p_from_date", "p_to_date", "p_reason"],
  lesson_change_list: ["p_class"],
  decide_lesson_change: ["p_change", "p_decision"],
  lesson_controls: ["p_class"],
  save_lesson_control: ["p_class", "p_key", "p_value"],
  assessment_tests: ["p_student", "p_status"],
  assessment_test_detail: ["p_test"],
  save_assessment_test: ["p_student", "p_class", "p_title", "p_difficulty", "p_types", "p_tasks", "p_mode"],
  record_assessment_test: ["p_test", "p_marks"],
  save_assessment: ["p_student", "p_class", "p_date", "p_type", "p_title", "p_score", "p_max_score", "p_note"],
  assessment_list: ["p_student", "p_class", "p_from", "p_to", "p_page_size", "p_cursor"],
  assessment_performance: ["p_student", "p_from", "p_to"],
  archive_assessment_test: ["p_test"],
  save_programme: ["p_id", "p_name", "p_code", "p_type", "p_standard"],
  save_unit: ["p_id", "p_programme", "p_title", "p_code", "p_no"],
  save_lesson: ["p_id", "p_unit", "p_title", "p_code", "p_no"],
  save_objective: ["p_id", "p_lesson", "p_text", "p_code", "p_cefr"],
  skills_list: [],
  learning_targets_list: ["p_level"],
  curriculum_topics_list: ["p_level"],
  save_curriculum_topic: ["p_id", "p_title", "p_level_code", "p_course_section", "p_published"],
  save_evidence: ["p_student", "p_target", "p_topic", "p_lesson", "p_score", "p_rating", "p_quality", "p_note"],
  evidence_list: ["p_student", "p_from", "p_to", "p_page_size", "p_cursor"],
  learner_progress: ["p_student"],
  curriculum_list: [],
  import_curriculum: ["p_programme", "p_title", "p_publisher", "p_payload"],
  publish_curriculum: ["p_curriculum"],
  archive_curriculum: ["p_curriculum"],
  save_curriculum: ["p_curriculum", "p_title", "p_publisher"],
  submit_curriculum_review: ["p_curriculum"],
  unpublish_curriculum: ["p_curriculum"],
  duplicate_curriculum: ["p_curriculum", "p_title"],
  delete_curriculum: ["p_curriculum"],
  restore_curriculum: ["p_curriculum"],
  permanently_delete_curriculum: ["p_curriculum"],
  assign_curriculum: ["p_curriculum", "p_class"],
  material_catalog: ["p_type", "p_level", "p_page_size", "p_cursor"],
  material_detail: ["p_material"],
  save_material: ["p_id", "p_title", "p_type", "p_level_code", "p_publisher", "p_isbn", "p_drive_url"],
  save_material_unit: ["p_id", "p_material", "p_no", "p_title"],
  material_mapping_options: ["p_material"],
  save_material_mapping: ["p_id", "p_material_unit", "p_target", "p_scope", "p_page_start", "p_page_end", "p_purpose"],
  decide_material_mapping: ["p_mapping", "p_decision"],
  material_mappings: ["p_material", "p_status"],
  material_access_admin: ["p_material"],
  save_material_access: ["p_material", "p_assignments"],
  resources: ["p_search", "p_kind", "p_page_size", "p_cursor"],
  save_resource: ["p_id", "p_title", "p_url", "p_file_path", "p_kind"],
  delete_resource: ["p_resource"],
  save_upload: ["p_storage_path", "p_bucket", "p_mime", "p_size_bytes", "p_original_name"],
  uploads_list: ["p_page_size", "p_cursor"],
  methodology: ["p_level"],
  save_methodology: ["p_id", "p_title", "p_body", "p_level_code"],
  delete_methodology: ["p_methodology"],
  save_teacher_material: ["p_id", "p_title", "p_kind", "p_payload"],
  teacher_materials: [],
  save_material_lesson: ["p_material", "p_lesson"],
  save_material_feedback: ["p_material", "p_rating", "p_note"],
  student_progress_report: ["p_student"],
  learner_progress_overview: ["p_class"],
  attendance_report: ["p_class", "p_from", "p_to"],
  assessment_report: ["p_class", "p_from", "p_to"],
  class_report: ["p_class"],
  teacher_report: ["p_teacher"],
  curriculum_coverage: ["p_class", "p_from", "p_to"],
  curriculum_analytics: ["p_level"],
  class_earnings: ["p_from", "p_to"],
  salary_history: ["p_user", "p_month"],
  report_export_request: ["p_kind", "p_params"],
  report_export_process: [],
  report_export_list: [],
  report_export_result: ["p_job"],
  ai_provider_list: [],
  ai_provider_save: ["p_id", "p_key_slug", "p_label", "p_kind", "p_base_url", "p_model", "p_enabled", "p_sort_order"],
  ai_provider_delete: ["p_id"],
  ai_provider_order: ["p_order"],
  ai_usage_log: ["p_action", "p_provider", "p_model", "p_prompt_tokens", "p_completion_tokens", "p_cost", "p_status", "p_error", "p_latency_ms"],
  ai_usage_totals: ["p_from", "p_to"],
  ai_usage_list: ["p_from", "p_to", "p_action", "p_page_size", "p_cursor"],
  ai_status: [],
  notify: ["p_user", "p_kind", "p_payload"],
  message_recipients: ["p_search", "p_page_size", "p_cursor"],
  message_conversations: ["p_page_size", "p_cursor"],
  message_thread: ["p_thread"],
  send_message: ["p_thread", "p_to", "p_subject", "p_body"],
  reply_message: ["p_thread", "p_body"],
  delete_message: ["p_message"],
  mark_message_read: ["p_thread"],
  message_unread_count: [],
  notifications_list: ["p_page_size", "p_cursor"],
  mark_notif_read: ["p_notif"],
  mark_all_notifs_read: [],
  notification_unread_count: [],
  notification_prefs: [],
  save_notification_prefs: ["p_email_enabled", "p_in_app_enabled", "p_kinds"],
  seen_page: ["p_page"],
  page_activity: ["p_page"],
  activities_list: ["p_limit"],
  ensure_language_prompt: [],
  pricing_list: [],
  pricing_save: ["p_id", "p_name", "p_level_code", "p_price", "p_currency", "p_active"],
  student_pricing: ["p_student"],
  save_discount: ["p_student", "p_name", "p_percent", "p_amount", "p_reason"],
  remove_discount: ["p_discount"],
  discount_history: ["p_student"],
  payments_list: ["p_student", "p_status", "p_page_size", "p_cursor"],
  payment_clients: ["p_search", "p_page_size"],
  request_payment: ["p_student", "p_amount", "p_due_date", "p_pay_type"],
  request_early_payment: ["p_student", "p_class"],
  confirm_payment: ["p_payment"],
  mark_paid: ["p_payment"],
  cancel_payment: ["p_payment"],
  revert_payment: ["p_payment"],
  edit_payment: ["p_payment", "p_amount", "p_due_date", "p_pay_type"],
  submit_proof: ["p_payment", "p_file_path"],
  payment_proof: ["p_payment"],
  set_student_credit: ["p_student", "p_amount", "p_note"],
  credit_audit: ["p_student"],
  wallet: ["p_user", "p_month"],
  wallet_admin: ["p_month"],
  save_wallet: ["p_user", "p_month", "p_amount", "p_kind"],
  wallet_cheer: ["p_user", "p_month"],
  dismiss_wallet_cheer: ["p_month"],
  payroll_roster: ["p_month"],
  set_payroll: ["p_month", "p_rows"],
  save_salary: ["p_user", "p_month", "p_amount", "p_currency"],
  delete_salary: ["p_salary"],
  request_salary: ["p_month", "p_amount"],
  salary_request_state: ["p_month"],
  set_profile_locale: ["p_locale"],
  set_profile_notify_lang: ["p_lang"],
};

export class PgAdapter implements DbAdapter {
  constructor(private readonly sub: string) {}

  private async withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString: env.localDbUrl });
    await client.connect();
    try {
      await client.query("begin");
      try {
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [this.sub]);
        await client.query("set local role authenticated");
        return await fn(client);
      } finally {
        // COMMIT (not rollback): writes must persist in the dev harness. The
        // transaction-scoped claim/role settings evaporate on commit either way.
        await client.query("commit");
      }
    } finally {
      await client.end();
    }
  }

  // ── SQL building (parameterized) ──────────────────────────────────────────

  private whereSql(w: WhereOp[], params: unknown[]): string {
    if (w.length === 0) return "";
    const clauses = w.map((c) => {
      const col = ident(c.column, "column");
      switch (c.op) {
        case "eq": params.push(c.value); return `${col} = $${params.length}`;
        case "neq": params.push(c.value); return `${col} <> $${params.length}`;
        case "gt": params.push(c.value); return `${col} > $${params.length}`;
        case "gte": params.push(c.value); return `${col} >= $${params.length}`;
        case "lt": params.push(c.value); return `${col} < $${params.length}`;
        case "lte": params.push(c.value); return `${col} <= $${params.length}`;
        case "is":
          params.push(c.value);
          return c.value === null ? `${col} is null` : `${col} is ${c.value ? "true" : "false"}`;
        case "ilike": params.push(c.value); return `${col} ilike $${params.length}`;
        case "in":
          if (c.values.length === 0) return "false";
          c.values.forEach((v) => params.push(v));
          return `${col} in (${c.values.map((_, i) => `$${params.length - c.values.length + i + 1}`).join(", ")})`;
      }
    });
    return `where ${clauses.join(" and ")}`;
  }

  private orderSql(o: SelectQuery["orderBy"]): string {
    if (!o || o.length === 0) return "";
    const parts = o.map(
      (x) => `${ident(x.column, "column")} ${x.ascending === false ? "desc" : "asc"}`,
    );
    return `order by ${parts.join(", ")}`;
  }

  // ── DbAdapter ─────────────────────────────────────────────────────────────

  async select<T>(q: SelectQuery): Promise<DbResult<T[]>> {
    try {
      const table = ident(q.table, "table");
      const cols = q.columns === "*" || !q.columns ? "*" : q.columns;
      const params: unknown[] = [];
      const sql =
        `select ${cols} from public.${table} ` +
        `${this.whereSql(q.where ?? [], params)} ${this.orderSql(q.orderBy)} ` +
        (q.limit != null ? `limit ${Math.max(1, Math.floor(q.limit))} ` : "") +
        (q.offset != null ? `offset ${Math.max(0, Math.floor(q.offset))}` : "");
      const rows = await this.withClient((c) => c.query(sql, params));
      return { data: rows.rows as T[], error: null };
    } catch (e) {
      return { data: [], error: mapDbError(e) };
    }
  }

  async selectOne<T>(q: SelectQuery): Promise<DbResult<T>> {
    const res = await this.select<T>({ ...q, limit: 1 });
    if (res.error) return { data: null, error: res.error };
    return { data: res.data?.[0] ?? null, error: null };
  }

  async insert(table: string, value: Record<string, unknown>): Promise<DbResult<null>> {
    try {
      const t = ident(table, "table");
      const cols = Object.keys(value);
      const params: unknown[] = cols.map((c) => value[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      // No RETURNING: on RLS-protected tables the read policy (e.g. a
      // self-visibility predicate) may not see the brand-new row, which would
      // spuriously fail the insert. Callers read back via select() when needed.
      const sql = `insert into public.${t} (${cols.map((c) => ident(c, "column")).join(", ")}) values (${placeholders})`;
      await this.withClient((c) => c.query(sql, params));
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: mapDbError(e) };
    }
  }

  async update<T>(
    table: string,
    value: Record<string, unknown>,
    where: WhereOp[],
  ): Promise<DbResult<T>> {
    try {
      const t = ident(table, "table");
      const params: unknown[] = [];
      const sets = Object.keys(value).map((c) => {
        params.push(value[c]);
        return `${ident(c, "column")} = $${params.length}`;
      });
      const whereClause = this.whereSql(where, params);
      const sql = `update public.${t} set ${sets.join(", ")} ${whereClause} returning *`;
      const res = await this.withClient((c) => c.query(sql, params));
      return { data: (res.rows[0] as T) ?? null, error: null };
    } catch (e) {
      return { data: null, error: mapDbError(e) };
    }
  }

  async remove(table: string, where: WhereOp[]): Promise<DbResult<null>> {
    try {
      const t = ident(table, "table");
      const params: unknown[] = [];
      const sql = `delete from public.${t} ${this.whereSql(where, params)}`;
      await this.withClient((c) => c.query(sql, params));
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: mapDbError(e) };
    }
  }

  async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<DbResult<T>> {
    try {
      const order = RPC_ARG_ORDER[fn];
      if (!order) {
        return {
          data: null,
          error: new ServiceError("unsupported_rpc", 501, `RPC "${fn}" has no local adapter mapping`),
        };
      }
      const params = order.map((k) => args[k] ?? null);
      const placeholders = params.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `select * from fsms.${ident(fn, "function")}(${placeholders})`;
      const res = await this.withClient((c) => c.query(sql, params));
      // functions return a single column (jsonb/…); take the first field of the first row
      const first = res.rows[0];
      const data = first ? (Object.values(first)[0] as T) : null;
      return { data, error: null };
    } catch (e) {
      return { data: null, error: mapDbError(e) };
    }
  }
}
