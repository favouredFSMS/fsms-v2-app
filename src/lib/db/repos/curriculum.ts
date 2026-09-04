import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, ServiceError, type ServiceResult } from "../errors";
import type { Page } from "../pagination";
import { localized } from "./lessons";
import {
  saveProgrammeSchema,
  saveUnitSchema,
  saveLessonSchema,
  saveObjectiveSchema,
  curriculumTopicsListSchema,
  saveCurriculumTopicSchema,
  saveEvidenceSchema,
  evidenceListSchema,
  learnerProgressSchema,
  importCurriculumSchema,
  curriculumDecisionSchema,
  saveCurriculumSchema,
  duplicateCurriculumSchema,
  assignCurriculumSchema,
  type SaveProgrammeInput,
  type SaveUnitInput,
  type SaveLessonInput,
  type SaveObjectiveInput,
  type CurriculumTopicsListFilters,
  type SaveCurriculumTopicInput,
  type SaveEvidenceInput,
  type EvidenceListFilters,
  type LearnerProgressInput,
  type ImportCurriculumInput,
  type SaveCurriculumInput,
  type DuplicateCurriculumInput,
  type AssignCurriculumInput,
} from "@/lib/schemas/curriculum";

/**
 * FSMS V2 — CurriculumRepository (Phase 18).
 *
 * Content spine authoring (Programme → Unit → Lesson → Objective), skills /
 * learning targets / curriculum topics, learning evidence (Skill → Evidence)
 * and per-student progress (Evidence → Progress), plus the curricula container
 * (import → publish → archive). Writes are pre-checked here and re-checked
 * inside each SECURITY DEFINER RPC.
 */

// ── row shapes ───────────────────────────────────────────────────────────────

export interface SpineNode {
  id: string;
  code: string | null;
  title: Record<string, string> | null;
}

export interface SkillItem {
  id: string;
  code: string | null;
  label: Record<string, string> | null;
}

export interface LearningTarget {
  id: string;
  level_code: string | null;
  title: Record<string, string> | null;
  active: boolean;
  verification_status: string | null;
}

export interface CurriculumTopic {
  id: string;
  title: Record<string, string> | null;
  level_code: string | null;
  course_section: string | null;
  published: boolean;
  archived: boolean;
}

export interface EvidenceItem {
  id: string;
  student_id: string;
  student_name: string | null;
  target_id: string;
  target_title: Record<string, string> | null;
  level_code: string | null;
  topic_id: string | null;
  lesson_id: string | null;
  source: string;
  quality: string | null;
  score: number | string | null;
  rating: string | null;
  note: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  recorded_at: string | null;
}

export interface ProgressTarget {
  target_id: string;
  target_title: Record<string, string> | null;
  level_code: string | null;
  count: number;
  avg_score: number | string | null;
  last_at: string | null;
}

export interface LearnerProgress {
  student: {
    id: string;
    name: string | null;
    student_no: string | null;
    level_code: string | null;
    academic_status: string | null;
  } | null;
  totals: { evidence_count: number; avg_score: number | string | null; latest_at: string | null };
  targets: ProgressTarget[];
  recent: Array<{
    id: string;
    recorded_at: string | null;
    target_title: Record<string, string> | null;
    source: string;
    quality: string | null;
    score: number | string | null;
    rating: string | null;
    note: string | null;
  }>;
}

export interface CurriculumAssignment {
  id: string;
  curriculum_id: string;
  class_id: string;
  is_primary: boolean;
}

export interface CurriculumItem {
  id: string;
  title: Record<string, string> | null;
  publisher: string | null;
  programme_id: string | null;
  programme_name: Record<string, string> | null;
  status: string;
  source_hash: string | null;
  versions: number;
  deleted: boolean;
  imported_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string | null;
}

export class CurriculumRepository extends Repository {
  // ── spine authoring ────────────────────────────────────────────────────────

  async saveProgramme(input: unknown): Promise<ServiceResult<SpineNode | null>> {
    const parsed = parseOrFail(saveProgrammeSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("curriculumManagement");
    if (denied) return fail(denied);
    const f: SaveProgrammeInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<SpineNode | null>("save_programme", {
      p_id: f.id ?? null,
      p_name: f.name ?? null,
      p_code: f.code ?? null,
      p_type: f.type ?? null,
      p_standard: f.standard ?? false,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async saveUnit(input: unknown): Promise<ServiceResult<SpineNode | null>> {
    const parsed = parseOrFail(saveUnitSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("curriculumManagement");
    if (denied) return fail(denied);
    const f: SaveUnitInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<SpineNode | null>("save_unit", {
      p_id: f.id ?? null,
      p_programme: f.programmeId ?? null,
      p_title: f.title ?? null,
      p_code: f.code ?? null,
      p_no: f.no ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async saveLesson(input: unknown): Promise<ServiceResult<SpineNode | null>> {
    const parsed = parseOrFail(saveLessonSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("curriculumManagement");
    if (denied) return fail(denied);
    const f: SaveLessonInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<SpineNode | null>("save_lesson", {
      p_id: f.id ?? null,
      p_unit: f.unitId ?? null,
      p_title: f.title ?? null,
      p_code: f.code ?? null,
      p_no: f.no ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async saveObjective(input: unknown): Promise<ServiceResult<SpineNode | null>> {
    const parsed = parseOrFail(saveObjectiveSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("curriculumManagement");
    if (denied) return fail(denied);
    const f: SaveObjectiveInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<SpineNode | null>("save_objective", {
      p_id: f.id ?? null,
      p_lesson: f.lessonId ?? null,
      p_text: f.text ?? null,
      p_code: f.code ?? null,
      p_cefr: f.cefr ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  // ── skills / targets / topics ──────────────────────────────────────────────

  async skills(): Promise<ServiceResult<SkillItem[]>> {
    const { data, error } = await this.ctx.db.rpc<{ rows: SkillItem[] }>("skills_list", {});
    if (error) return fail(error);
    return ok((data as { rows: SkillItem[] } | null)?.rows ?? []);
  }

  async targets(level?: string | null): Promise<ServiceResult<LearningTarget[]>> {
    const { data, error } = await this.ctx.db.rpc<{ rows: LearningTarget[] }>("learning_targets_list", {
      p_level: level ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: LearningTarget[] } | null)?.rows ?? []);
  }

  async topics(input: unknown): Promise<ServiceResult<CurriculumTopic[]>> {
    const parsed = parseOrFail(curriculumTopicsListSchema, input);
    if (!parsed.ok) return parsed;
    const f: CurriculumTopicsListFilters = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: CurriculumTopic[] }>("curriculum_topics_list", {
      p_level: f.level ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: CurriculumTopic[] } | null)?.rows ?? []);
  }

  async saveTopic(input: unknown): Promise<ServiceResult<CurriculumTopic | null>> {
    const parsed = parseOrFail(saveCurriculumTopicSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveCurriculumTopic");
    if (denied) return fail(denied);
    const f: SaveCurriculumTopicInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<CurriculumTopic | null>("save_curriculum_topic", {
      p_id: f.id ?? null,
      p_title: f.title ?? null,
      p_level_code: f.levelCode ?? null,
      p_course_section: f.courseSection ?? null,
      p_published: f.published ?? false,
    });
    if (error) return fail(error);
    return ok(data);
  }

  // ── evidence ───────────────────────────────────────────────────────────────

  async saveEvidence(input: unknown): Promise<ServiceResult<EvidenceItem | null>> {
    const parsed = parseOrFail(saveEvidenceSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("recordLearningCheck");
    if (denied) return fail(denied);
    const f: SaveEvidenceInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<EvidenceItem | null>("save_evidence", {
      p_student: f.studentId,
      p_target: f.targetId,
      p_topic: f.topicId ?? null,
      p_lesson: f.lessonId ?? null,
      p_score: f.score ?? null,
      p_rating: f.rating ?? null,
      p_quality: f.quality ?? null,
      p_note: f.note ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async evidenceList(input: unknown): Promise<ServiceResult<Page<EvidenceItem>>> {
    const parsed = parseOrFail(evidenceListSchema, input);
    if (!parsed.ok) return parsed;
    const f: EvidenceListFilters = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{
      rows: EvidenceItem[];
      total: number;
      next_cursor: string | null;
    }>("evidence_list", {
      p_student: f.studentId ?? null,
      p_from: f.from ?? null,
      p_to: f.to ?? null,
      p_page_size: f.pageSize,
      p_cursor: f.cursor ?? null,
    });
    if (error) return fail(error);
    const res = data ?? { rows: [], total: 0, next_cursor: null };
    return ok({ items: res.rows, total: res.total, nextCursor: res.next_cursor });
  }

  async learnerProgress(input: unknown): Promise<ServiceResult<LearnerProgress | null>> {
    const parsed = parseOrFail(learnerProgressSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("smartProgress");
    if (denied) return fail(denied);
    const f: LearnerProgressInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<LearnerProgress | null>("learner_progress", {
      p_student: f.studentId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  // ── curricula container ────────────────────────────────────────────────────

  async curricula(): Promise<ServiceResult<CurriculumItem[]>> {
    const { data, error } = await this.ctx.db.rpc<{ rows: CurriculumItem[] }>("curriculum_list", {});
    if (error) return fail(error);
    return ok((data as { rows: CurriculumItem[] } | null)?.rows ?? []);
  }

  async importCurriculum(input: unknown): Promise<ServiceResult<CurriculumItem | null>> {
    const parsed = parseOrFail(importCurriculumSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("curriculumManagement");
    if (denied) return fail(denied);
    const f: ImportCurriculumInput = parsed.data;

    let payload: Record<string, unknown> | null = null;
    if (f.payload) {
      try {
        payload = JSON.parse(f.payload) as Record<string, unknown>;
      } catch {
        return fail(new ServiceError("invalid_input", 422, "Payload is not valid JSON"));
      }
    }

    const { data, error } = await this.ctx.db.rpc<CurriculumItem | null>("import_curriculum", {
      p_programme: f.programmeId ?? null,
      p_title: f.title,
      p_publisher: f.publisher ?? null,
      p_payload: payload ? JSON.stringify(payload) : null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async publishCurriculum(input: unknown): Promise<ServiceResult<CurriculumItem | null>> {
    const parsed = parseOrFail(curriculumDecisionSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("publishCurriculum");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<CurriculumItem | null>("publish_curriculum", {
      p_curriculum: parsed.data.curriculumId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async archiveCurriculum(input: unknown): Promise<ServiceResult<CurriculumItem | null>> {
    const parsed = parseOrFail(curriculumDecisionSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("archiveCurriculum");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<CurriculumItem | null>("archive_curriculum", {
      p_curriculum: parsed.data.curriculumId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  // ── governance (F9.1 lifecycle) ───────────────────────────────────────────

  async saveCurriculum(input: unknown): Promise<ServiceResult<CurriculumItem | null>> {
    const parsed = parseOrFail(saveCurriculumSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveCurriculum");
    if (denied) return fail(denied);
    const f: SaveCurriculumInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<CurriculumItem | null>("save_curriculum", {
      p_curriculum: f.curriculumId,
      p_title: f.title ?? null,
      p_publisher: f.publisher ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async submitReview(input: unknown): Promise<ServiceResult<CurriculumItem | null>> {
    const parsed = parseOrFail(curriculumDecisionSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("submitCurriculumReview");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<CurriculumItem | null>("submit_curriculum_review", {
      p_curriculum: parsed.data.curriculumId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async unpublishCurriculum(input: unknown): Promise<ServiceResult<CurriculumItem | null>> {
    const parsed = parseOrFail(curriculumDecisionSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("unpublishCurriculum");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<CurriculumItem | null>("unpublish_curriculum", {
      p_curriculum: parsed.data.curriculumId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async duplicateCurriculum(input: unknown): Promise<ServiceResult<CurriculumItem | null>> {
    const parsed = parseOrFail(duplicateCurriculumSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("duplicateCurriculum");
    if (denied) return fail(denied);
    const f: DuplicateCurriculumInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<CurriculumItem | null>("duplicate_curriculum", {
      p_curriculum: f.curriculumId,
      p_title: f.title ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async deleteCurriculum(input: unknown): Promise<ServiceResult<CurriculumItem | null>> {
    const parsed = parseOrFail(curriculumDecisionSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("deleteCurriculum");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<CurriculumItem | null>("delete_curriculum", {
      p_curriculum: parsed.data.curriculumId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async restoreCurriculum(input: unknown): Promise<ServiceResult<CurriculumItem | null>> {
    const parsed = parseOrFail(curriculumDecisionSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("restoreCurriculum");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<CurriculumItem | null>("restore_curriculum", {
      p_curriculum: parsed.data.curriculumId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async permanentlyDeleteCurriculum(input: unknown): Promise<ServiceResult<CurriculumItem | null>> {
    const parsed = parseOrFail(curriculumDecisionSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("permanentlyDeleteCurriculum");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<CurriculumItem | null>("permanently_delete_curriculum", {
      p_curriculum: parsed.data.curriculumId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async assignCurriculum(input: unknown): Promise<ServiceResult<CurriculumAssignment | null>> {
    const parsed = parseOrFail(assignCurriculumSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("assignCurriculum");
    if (denied) return fail(denied);
    const f: AssignCurriculumInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<CurriculumAssignment | null>("assign_curriculum", {
      p_curriculum: f.curriculumId,
      p_class: f.classId,
    });
    if (error) return fail(error);
    return ok(data);
  }
}

export { localized };
