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
export {
  MaterialRepository,
  type MaterialSummary,
  type MaterialUnit,
  type MaterialMapping,
  type MaterialDetail,
  type MappingOption,
  type MaterialAccessView,
  type ResourceItem,
  type UploadItem,
  type MethodologyItem,
  type TeacherMaterialItem,
} from "./repos/materials";
export {
  ReportingRepository,
  type StudentProgressReport,
  type LevelHistoryEntry,
  type EvidenceByTarget,
  type LearnerProgressOverview,
  type LearnerProgressRow,
  type AttendanceReport,
  type AttendanceReportRow,
  type AssessmentReport,
  type AssessmentReportRow,
  type ClassReport,
  type TeacherReport,
  type CurriculumCoverage,
  type CurriculumAnalytics,
  type ClassEarnings,
  type ClassEarningsRow,
  type SalaryHistory,
  type SalaryHistoryRow,
  type ReportExportJob,
  type ReportExportList,
  type ReportExportResult,
  type ReportExportRequested,
} from "./repos/reporting";
export {
  AiRepository,
  type AiProviderConfig,
  type AiProviderStatus,
  type AiUsageTotals,
  type AiUsageRow,
  type AiStatus,
} from "./repos/ai";
export {
  CommsRepository,
  type MessageRecipient,
  type MessageConversation,
  type MessageThread,
  type MessageItem,
  type SentMessage,
  type NotificationItem,
  type NotificationPrefs,
  type ActivityItem,
} from "./repos/comms";
export {
  FinanceRepository,
  type PricingRow,
  type StudentPricing,
  type StudentDiscount,
  type PaymentRow,
  type PaymentClientRow,
  type WalletRow,
  type WalletResult,
  type PayrollRow,
  type CreditAudit,
} from "./repos/finance";
export {
  SettingsRepository,
  type SchoolProfile,
  type SettingRow,
  type SettingsList,
} from "./repos/settings";
