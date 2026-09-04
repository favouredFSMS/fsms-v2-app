import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, ServiceError, type ServiceResult } from "../errors";
import type { Page } from "../pagination";
import {
  materialCatalogSchema,
  materialDetailSchema,
  saveMaterialSchema,
  saveMaterialUnitSchema,
  materialMappingOptionsSchema,
  saveMaterialMappingSchema,
  decideMaterialMappingSchema,
  materialMappingsSchema,
  materialAccessAdminSchema,
  saveMaterialAccessSchema,
  resourcesSchema,
  saveResourceSchema,
  deleteResourceSchema,
  saveUploadSchema,
  uploadsSchema,
  methodologySchema,
  saveMethodologySchema,
  deleteMethodologySchema,
  saveTeacherMaterialSchema,
  saveMaterialLessonSchema,
  saveMaterialFeedbackSchema,
  type MaterialCatalogFilters,
  type SaveMaterialInput,
  type SaveMaterialUnitInput,
  type SaveMaterialMappingInput,
  type DecideMaterialMappingInput,
  type MaterialMappingsFilters,
  type SaveMaterialAccessInput,
  type ResourcesFilters,
  type SaveResourceInput,
  type SaveUploadInput,
  type UploadsFilters,
  type MethodologyFilters,
  type SaveMethodologyInput,
  type SaveTeacherMaterialInput,
  type SaveMaterialLessonInput,
  type SaveMaterialFeedbackInput,
} from "@/lib/schemas/materials";

/**
 * FSMS V2 — MaterialRepository (Phase 19).
 *
 * Materials catalogue + units, mappings (propose/decide, never auto-verified —
 * X5), governed access policy (V2 material_assignments), resources, upload
 * metadata, methodology library and teacher-owned materials. Writes are
 * pre-checked here and re-checked inside each SECURITY DEFINER RPC.
 */

export interface MaterialSummary {
  id: string;
  title: Record<string, string> | null;
  type: string | null;
  level_code: string | null;
  publisher: string | null;
  isbn: string | null;
  unit_count: number;
  created_at: string | null;
}

export interface MaterialUnit {
  id: string;
  no: number | null;
  title: Record<string, string> | null;
}

export interface MaterialMapping {
  id: string;
  material_id?: string | null;
  material_unit_id: string;
  unit_no?: number | null;
  unit_title?: Record<string, string> | null;
  target_id: string;
  target_title?: Record<string, string> | null;
  target_level?: string | null;
  scope: string | null;
  page_start: number | null;
  page_end: number | null;
  purpose: string | null;
  status: string;
  proposed_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
}

export interface MaterialDetail {
  material: {
    id: string;
    title: Record<string, string> | null;
    type: string | null;
    level_code: string | null;
    publisher: string | null;
    isbn: string | null;
    drive_url: string | null;
    created_at: string | null;
  } | null;
  units: MaterialUnit[];
  mappings: MaterialMapping[];
  feedback: { count: number; avg: number | string | null };
  usage_count: number;
}

export interface MappingOption {
  id: string;
  no?: number | null;
  title?: Record<string, string> | null;
  level_code?: string | null;
}

export interface MaterialAccessView {
  material: { id: string; title: Record<string, string> | null; type: string | null } | null;
  assignments: Array<{
    id: string;
    scope_type: string;
    scope_id: string;
    is_primary: boolean;
    class_name: string | null;
    teacher_name: string | null;
    student_name: string | null;
  }>;
  classes: Array<{ id: string; name: string | null }>;
  teachers: Array<{ id: string; name: string | null }>;
}

export interface ResourceDeleteResult {
  id: string;
  deleted_at: string | null;
}

export interface ResourceItem {
  id: string;
  title: Record<string, string> | null;
  url: string | null;
  file_path: string | null;
  kind: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string | null;
}

export interface UploadItem {
  id: string;
  storage_path: string;
  bucket: string;
  mime: string | null;
  size_bytes: number | string | null;
  original_name: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  uploaded_at: string | null;
}

export interface MethodologyItem {
  id: string;
  title: Record<string, string> | null;
  body: Record<string, string> | null;
  level_code: string | null;
  updated_at: string | null;
}

export interface TeacherMaterialItem {
  id: string;
  teacher_id: string;
  teacher_name: string | null;
  title: Record<string, string> | null;
  kind: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
}

export class MaterialRepository extends Repository {
  async catalog(input: unknown): Promise<ServiceResult<Page<MaterialSummary>>> {
    const parsed = parseOrFail(materialCatalogSchema, input);
    if (!parsed.ok) return parsed;
    const f: MaterialCatalogFilters = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: MaterialSummary[]; total: number; next_cursor: string | null }>(
      "material_catalog",
      { p_type: f.type ?? null, p_level: f.level ?? null, p_page_size: f.pageSize, p_cursor: f.cursor ?? null },
    );
    if (error) return fail(error);
    const res = data ?? { rows: [], total: 0, next_cursor: null };
    return ok({ items: res.rows, total: res.total, nextCursor: res.next_cursor });
  }

  async detail(input: unknown): Promise<ServiceResult<MaterialDetail | null>> {
    const parsed = parseOrFail(materialDetailSchema, input);
    if (!parsed.ok) return parsed;
    const { data, error } = await this.ctx.db.rpc<MaterialDetail | null>("material_detail", {
      p_material: parsed.data.materialId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async saveMaterial(input: unknown): Promise<ServiceResult<MaterialSummary | null>> {
    const parsed = parseOrFail(saveMaterialSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveMaterial");
    if (denied) return fail(denied);
    const f: SaveMaterialInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<MaterialSummary | null>("save_material", {
      p_id: f.id ?? null,
      p_title: f.title ?? null,
      p_type: f.type ?? null,
      p_level_code: f.levelCode ?? null,
      p_publisher: f.publisher ?? null,
      p_isbn: f.isbn ?? null,
      p_drive_url: f.driveUrl ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async saveUnit(input: unknown): Promise<ServiceResult<MaterialUnit | null>> {
    const parsed = parseOrFail(saveMaterialUnitSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveMaterialUnit");
    if (denied) return fail(denied);
    const f: SaveMaterialUnitInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<MaterialUnit | null>("save_material_unit", {
      p_id: f.id ?? null,
      p_material: f.materialId ?? null,
      p_no: f.no ?? null,
      p_title: f.title ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async mappingOptions(input: unknown): Promise<ServiceResult<{ units: MappingOption[]; targets: MappingOption[] } | null>> {
    const parsed = parseOrFail(materialMappingOptionsSchema, input);
    if (!parsed.ok) return parsed;
    const { data, error } = await this.ctx.db.rpc<{ units: MappingOption[]; targets: MappingOption[] } | null>(
      "material_mapping_options",
      { p_material: parsed.data.materialId },
    );
    if (error) return fail(error);
    return ok(data);
  }

  async saveMapping(input: unknown): Promise<ServiceResult<MaterialMapping | null>> {
    const parsed = parseOrFail(saveMaterialMappingSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveMaterialMapping");
    if (denied) return fail(denied);
    const f: SaveMaterialMappingInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<MaterialMapping | null>("save_material_mapping", {
      p_id: f.id ?? null,
      p_material_unit: f.materialUnitId ?? null,
      p_target: f.targetId ?? null,
      p_scope: f.scope ?? null,
      p_page_start: f.pageStart ?? null,
      p_page_end: f.pageEnd ?? null,
      p_purpose: f.purpose ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async decideMapping(input: unknown): Promise<ServiceResult<MaterialMapping | null>> {
    const parsed = parseOrFail(decideMaterialMappingSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("decideMaterialMapping");
    if (denied) return fail(denied);
    const f: DecideMaterialMappingInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<MaterialMapping | null>("decide_material_mapping", {
      p_mapping: f.mappingId,
      p_decision: f.decision,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async mappings(input: unknown): Promise<ServiceResult<MaterialMapping[]>> {
    const parsed = parseOrFail(materialMappingsSchema, input);
    if (!parsed.ok) return parsed;
    const f: MaterialMappingsFilters = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: MaterialMapping[] }>("material_mappings", {
      p_material: f.materialId ?? null,
      p_status: f.status ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: MaterialMapping[] } | null)?.rows ?? []);
  }

  async accessAdmin(input: unknown): Promise<ServiceResult<MaterialAccessView | null>> {
    const parsed = parseOrFail(materialAccessAdminSchema, input);
    if (!parsed.ok) return parsed;
    const { data, error } = await this.ctx.db.rpc<MaterialAccessView | null>("material_access_admin", {
      p_material: parsed.data.materialId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async saveAccess(input: unknown): Promise<ServiceResult<{ material_id: string; assignments: number } | null>> {
    const parsed = parseOrFail(saveMaterialAccessSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveMaterialAccess");
    if (denied) return fail(denied);
    const f: SaveMaterialAccessInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ material_id: string; assignments: number } | null>(
      "save_material_access",
      {
        p_material: f.materialId,
        p_assignments: JSON.stringify(f.assignments),
      },
    );
    if (error) return fail(error);
    return ok(data);
  }

  async resources(input: unknown): Promise<ServiceResult<Page<ResourceItem>>> {
    const parsed = parseOrFail(resourcesSchema, input);
    if (!parsed.ok) return parsed;
    const f: ResourcesFilters = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: ResourceItem[]; total: number; next_cursor: string | null }>(
      "resources",
      { p_search: f.search ?? null, p_kind: f.kind ?? null, p_page_size: f.pageSize, p_cursor: f.cursor ?? null },
    );
    if (error) return fail(error);
    const res = data ?? { rows: [], total: 0, next_cursor: null };
    return ok({ items: res.rows, total: res.total, nextCursor: res.next_cursor });
  }

  async saveResource(input: unknown): Promise<ServiceResult<ResourceItem | null>> {
    const parsed = parseOrFail(saveResourceSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveResource");
    if (denied) return fail(denied);
    const f: SaveResourceInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<ResourceItem | null>("save_resource", {
      p_id: f.id ?? null,
      p_title: f.title ?? null,
      p_url: f.url ?? null,
      p_file_path: f.filePath ?? null,
      p_kind: f.kind ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async deleteResource(input: unknown): Promise<ServiceResult<ResourceDeleteResult | null>> {
    const parsed = parseOrFail(deleteResourceSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("deleteResource");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<ResourceDeleteResult | null>("delete_resource", {
      p_resource: parsed.data.resourceId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async saveUpload(input: unknown): Promise<ServiceResult<UploadItem | null>> {
    const parsed = parseOrFail(saveUploadSchema, input);
    if (!parsed.ok) return parsed;
    const f: SaveUploadInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<UploadItem | null>("save_upload", {
      p_storage_path: f.storagePath,
      p_bucket: f.bucket,
      p_mime: f.mime ?? null,
      p_size_bytes: f.sizeBytes ?? null,
      p_original_name: f.originalName ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async uploads(input: unknown): Promise<ServiceResult<Page<UploadItem>>> {
    const parsed = parseOrFail(uploadsSchema, input);
    if (!parsed.ok) return parsed;
    const f: UploadsFilters = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: UploadItem[]; total: number; next_cursor: string | null }>(
      "uploads_list",
      { p_page_size: f.pageSize, p_cursor: f.cursor ?? null },
    );
    if (error) return fail(error);
    const res = data ?? { rows: [], total: 0, next_cursor: null };
    return ok({ items: res.rows, total: res.total, nextCursor: res.next_cursor });
  }

  async methodology(input: unknown): Promise<ServiceResult<MethodologyItem[]>> {
    const parsed = parseOrFail(methodologySchema, input);
    if (!parsed.ok) return parsed;
    const f: MethodologyFilters = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: MethodologyItem[] }>("methodology", {
      p_level: f.level ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: MethodologyItem[] } | null)?.rows ?? []);
  }

  async saveMethodology(input: unknown): Promise<ServiceResult<MethodologyItem | null>> {
    const parsed = parseOrFail(saveMethodologySchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveMethodology");
    if (denied) return fail(denied);
    const f: SaveMethodologyInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<MethodologyItem | null>("save_methodology", {
      p_id: f.id ?? null,
      p_title: f.title ?? null,
      p_body: f.body ?? null,
      p_level_code: f.levelCode ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async deleteMethodology(input: unknown): Promise<ServiceResult<MethodologyItem | null>> {
    const parsed = parseOrFail(deleteMethodologySchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("deleteMethodology");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<MethodologyItem | null>("delete_methodology", {
      p_methodology: parsed.data.methodologyId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async saveTeacherMaterial(input: unknown): Promise<ServiceResult<TeacherMaterialItem | null>> {
    const parsed = parseOrFail(saveTeacherMaterialSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveTeacherMaterial");
    if (denied) return fail(denied);
    const f: SaveTeacherMaterialInput = parsed.data;

    let payload: Record<string, unknown> | null = null;
    if (f.payload) {
      try {
        payload = JSON.parse(f.payload) as Record<string, unknown>;
      } catch {
        return fail(new ServiceError("invalid_input", 422, "Payload is not valid JSON"));
      }
    }

    const { data, error } = await this.ctx.db.rpc<TeacherMaterialItem | null>("save_teacher_material", {
      p_id: f.id ?? null,
      p_title: f.title ?? null,
      p_kind: f.kind ?? null,
      p_payload: payload ? JSON.stringify(payload) : null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async teacherMaterials(): Promise<ServiceResult<TeacherMaterialItem[]>> {
    const { data, error } = await this.ctx.db.rpc<{ rows: TeacherMaterialItem[] }>("teacher_materials", {});
    if (error) return fail(error);
    return ok((data as { rows: TeacherMaterialItem[] } | null)?.rows ?? []);
  }

  async saveMaterialLesson(input: unknown): Promise<ServiceResult<{ id: string } | null>> {
    const parsed = parseOrFail(saveMaterialLessonSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveMaterial");
    if (denied) return fail(denied);
    const f: SaveMaterialLessonInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ id: string } | null>("save_material_lesson", {
      p_material: f.materialId,
      p_lesson: f.lessonId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async saveFeedback(input: unknown): Promise<ServiceResult<{ id: string; rating: string } | null>> {
    const parsed = parseOrFail(saveMaterialFeedbackSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveMaterialFeedback");
    if (denied) return fail(denied);
    const f: SaveMaterialFeedbackInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ id: string; rating: string } | null>(
      "save_material_feedback",
      { p_material: f.materialId, p_rating: f.rating, p_note: f.note ?? null },
    );
    if (error) return fail(error);
    return ok(data);
  }
}
