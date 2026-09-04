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
export { StudentRepository, type StudentSummary, type StudentDetail } from "./repos/students";
export { DashboardRepository, type DashboardSummary } from "./repos/dashboard";
export { ParentRepository, type ParentSummary } from "./repos/parents";
export { UserRepository, type UserSummary } from "./repos/users";
export {
  ClassRepository,
  type ClassSummary,
  type ClassDetail,
  type ClassTeacher,
} from "./repos/classes";
export { AcademicRepository, type AcademicStructure } from "./repos/academic";
export {
  AttendanceRepository,
  type AttendanceGrid,
  type AttendanceRecord,
  type AttendanceStats,
  type MyAttendance,
} from "./repos/attendance";
export { HomeworkRepository, type HomeworkItem } from "./repos/homework";
export {
  LessonRepository,
  localized,
  type LessonSpine,
  type LessonProgramme,
  type LessonUnit,
  type LessonRef,
  type LessonDetail,
  type LessonObjective,
  type LessonResource,
  type LessonLog,
  type LessonPlan,
  type LessonChange,
  type LessonControl,
} from "./repos/lessons";
export {
  AssessmentRepository,
  type AssessmentItem,
  type AssessmentTest,
  type AssessmentTestDetail,
  type AssessmentPerformance,
} from "./repos/assessments";
export {
  CurriculumRepository,
  type SpineNode,
  type SkillItem,
  type LearningTarget,
  type CurriculumTopic,
  type EvidenceItem,
  type ProgressTarget,
  type LearnerProgress,
  type CurriculumItem,
  type CurriculumAssignment,
} from "./repos/curriculum";
