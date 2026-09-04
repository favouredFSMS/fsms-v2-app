import { z } from "zod";

/**
 * FSMS V2 — materials & resources schemas (Phase 19), shared between
 * repositories and client forms. Covers the materials catalogue, units,
 * mappings (propose/decide), governed access policy, resources, upload
 * metadata, methodology library and teacher materials.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = () => z.string().regex(UUID_RE, "Invalid id");
const optUuid = () => uuid().nullish();
const optText = (max = 200) => z.string().trim().max(max).nullish();
const optInt = () =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0).max(99999).optional(),
  );

// ── catalogue ────────────────────────────────────────────────────────────────

export const materialCatalogSchema = z.object({
  type: z.enum(["textbook", "workbook", "reader", "media", "other"]).nullish(),
  level: optText(20),
  pageSize: z.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).nullish(),
});
export type MaterialCatalogFilters = z.infer<typeof materialCatalogSchema>;

export const materialDetailSchema = z.object({ materialId: uuid() });
export type MaterialDetailInput = z.infer<typeof materialDetailSchema>;

export const saveMaterialSchema = z.object({
  id: optUuid(),
  title: optText(200),
  type: z.enum(["textbook", "workbook", "reader", "media", "other"]).nullish(),
  levelCode: optText(20),
  publisher: optText(200),
  isbn: optText(40),
  driveUrl: optText(2000),
});
export type SaveMaterialInput = z.infer<typeof saveMaterialSchema>;

export const saveMaterialUnitSchema = z.object({
  id: optUuid(),
  materialId: optUuid(),
  no: optInt(),
  title: optText(200),
});
export type SaveMaterialUnitInput = z.infer<typeof saveMaterialUnitSchema>;

// ── mappings ─────────────────────────────────────────────────────────────────

export const materialMappingOptionsSchema = z.object({ materialId: uuid() });
export type MaterialMappingOptionsInput = z.infer<typeof materialMappingOptionsSchema>;

export const saveMaterialMappingSchema = z.object({
  id: optUuid(),
  materialUnitId: optUuid(),
  targetId: optUuid(),
  scope: optText(60),
  pageStart: optInt(),
  pageEnd: optInt(),
  purpose: optText(300),
});
export type SaveMaterialMappingInput = z.infer<typeof saveMaterialMappingSchema>;

export const decideMaterialMappingSchema = z.object({
  mappingId: uuid(),
  decision: z.enum(["verified", "rejected"]),
});
export type DecideMaterialMappingInput = z.infer<typeof decideMaterialMappingSchema>;

export const materialMappingsSchema = z.object({
  materialId: optUuid(),
  status: z.enum(["proposed", "verified", "rejected"]).nullish(),
});
export type MaterialMappingsFilters = z.infer<typeof materialMappingsSchema>;

// ── access policy ────────────────────────────────────────────────────────────

export const materialAccessAdminSchema = z.object({ materialId: uuid() });
export type MaterialAccessAdminInput = z.infer<typeof materialAccessAdminSchema>;

export const saveMaterialAccessSchema = z.object({
  materialId: uuid(),
  assignments: z.array(
    z.object({
      scopeType: z.enum(["class", "teacher", "student"]),
      scopeId: uuid(),
      isPrimary: z.boolean().optional(),
    }),
  ),
});
export type SaveMaterialAccessInput = z.infer<typeof saveMaterialAccessSchema>;

// ── resources ────────────────────────────────────────────────────────────────

export const resourcesSchema = z.object({
  search: optText(200),
  kind: optText(40),
  pageSize: z.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).nullish(),
});
export type ResourcesFilters = z.infer<typeof resourcesSchema>;

export const saveResourceSchema = z.object({
  id: optUuid(),
  title: optText(200),
  url: optText(2000),
  filePath: optText(2000),
  kind: optText(40),
});
export type SaveResourceInput = z.infer<typeof saveResourceSchema>;

export const deleteResourceSchema = z.object({ resourceId: uuid() });
export type DeleteResourceInput = z.infer<typeof deleteResourceSchema>;

// ── uploads ──────────────────────────────────────────────────────────────────

export const saveUploadSchema = z.object({
  storagePath: z.string().trim().min(1).max(2000),
  bucket: z.string().trim().min(1).max(200),
  mime: optText(200),
  sizeBytes: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0).max(1e12).optional(),
  ),
  originalName: optText(500),
});
export type SaveUploadInput = z.infer<typeof saveUploadSchema>;

export const uploadsSchema = z.object({
  pageSize: z.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).nullish(),
});
export type UploadsFilters = z.infer<typeof uploadsSchema>;

// ── methodology ──────────────────────────────────────────────────────────────

export const methodologySchema = z.object({ level: optText(20) });
export type MethodologyFilters = z.infer<typeof methodologySchema>;

export const saveMethodologySchema = z.object({
  id: optUuid(),
  title: optText(200),
  body: optText(20000),
  levelCode: optText(20),
});
export type SaveMethodologyInput = z.infer<typeof saveMethodologySchema>;

export const deleteMethodologySchema = z.object({ methodologyId: uuid() });
export type DeleteMethodologyInput = z.infer<typeof deleteMethodologySchema>;

// ── teacher materials ────────────────────────────────────────────────────────

export const saveTeacherMaterialSchema = z.object({
  id: optUuid(),
  title: optText(200),
  kind: optText(40),
  payload: z.string().trim().max(20000).nullish(),
});
export type SaveTeacherMaterialInput = z.infer<typeof saveTeacherMaterialSchema>;

// ── associations + feedback ──────────────────────────────────────────────────

export const saveMaterialLessonSchema = z.object({
  materialId: uuid(),
  lessonId: uuid(),
});
export type SaveMaterialLessonInput = z.infer<typeof saveMaterialLessonSchema>;

export const saveMaterialFeedbackSchema = z.object({
  materialId: uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  note: optText(1000),
});
export type SaveMaterialFeedbackInput = z.infer<typeof saveMaterialFeedbackSchema>;
