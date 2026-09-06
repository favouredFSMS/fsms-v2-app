import { Repository } from "../repository";
import { ok, fail, type ServiceResult } from "../errors";

/**
 * FSMS V2 — DashboardRepository (Phase 11 + Phase 32 V99 Fidelity).
 *
 * The whole dashboard renders from ONE server-side RPC round trip
 * (`fsms.dashboard_summary()`), which is school-scoped + visibility-scoped and
 * role-aware on the database side. Pages never fan out into N+1 queries.
 */

export interface DashboardProfile {
  id: string;
  name: string | null;
  email: string | null;
  locale: string | null;
}

export interface DashboardSchool {
  id: string;
  name: string | null;
  timezone: string | null;
  currency: string | null;
}

export interface DashboardCounts {
  students: number;
  teachers: number;
  parents: number;
  classes: number;
}

export interface DashboardToday {
  date: string;
  present: number;
  late: number;
  absent: number;
}

export interface DashboardStats {
  totalStudents: number;
  studentsDelta: number;
  classesToday: number;
  attendanceAvg: number;
  attendanceDelta: number;
  homeworkAvg: number;
  homeworkDelta: number;
  assessmentAvg: number;
  assessmentDelta: number;
}

export interface DashboardTodaysClass {
  id: string;
  name: string;
  level_code: string;
  startTime: string;
  endTime: string;
  topic: string;
  lessonNo: number;
  students: number;
}

export interface DashboardActivity {
  id: string;
  type: string;
  action: string;
  text: string;
  createdAt: string;
}

export interface DashboardRemark {
  id: string;
  studentName: string;
  teacherName: string;
  body: string;
  date: string;
}

export interface DashboardRosterItem {
  id: string;
  name: string;
  level: string;
  className: string;
  attendance: number;
  student_no: string;
}

export interface DashboardSpotlightItem {
  place: number;
  name: string;
  className: string;
  note: string;
  studentId: string;
}

export interface DashboardClass {
  id: string;
  name: string | null;
  level_code: string | null;
  students: number;
}

export interface DashboardChild {
  id: string;
  name: string | null;
  level_code: string | null;
  student_no: string | null;
}

export interface DashboardHomeworkItem {
  id: string;
  title: string | null;
  student?: string | null;
  class?: string | null;
  due_date: string | null;
  status: string | null;
  feedback?: string | null;
}

export interface DashboardAssessmentItem {
  id: string;
  title: string | null;
  type: string | null;
  score: number | null;
  max_score: number | null;
  date: string | null;
}

export interface DashboardSummary {
  role: string | null;
  role_label: string | null;
  profile: DashboardProfile | null;
  school: DashboardSchool | null;
  counts: DashboardCounts | null;
  today: DashboardToday | null;
  stats?: DashboardStats | null;
  todaysClasses?: DashboardTodaysClass[];
  activities?: DashboardActivity[];
  remarks?: DashboardRemark[];
  roster?: DashboardRosterItem[];
  spotlight?: DashboardSpotlightItem[];
  myClasses: DashboardClass[];
  gradingQueue: { to_grade: number; recent: DashboardHomeworkItem[] } | null;
  myChildren: DashboardChild[];
  childHomework: DashboardHomeworkItem[];
  myHomework: DashboardHomeworkItem[];
  myAssessments: DashboardAssessmentItem[];
  myProgress: { lessons_achieved: number; evidence: number } | null;
}

const EMPTY: DashboardSummary = {
  role: null,
  role_label: null,
  profile: null,
  school: null,
  counts: null,
  today: null,
  stats: null,
  todaysClasses: [],
  activities: [],
  remarks: [],
  roster: [],
  spotlight: [],
  myClasses: [],
  gradingQueue: null,
  myChildren: [],
  childHomework: [],
  myHomework: [],
  myAssessments: [],
  myProgress: null,
};

export class DashboardRepository extends Repository {
  /** Role-aware dashboard summary — one RPC call (school + visibility scoped). */
  async summary(): Promise<ServiceResult<DashboardSummary>> {
    const { data, error } = await this.ctx.db.rpc<DashboardSummary>("dashboard_summary");
    if (error) return fail(error);
    return ok({ ...EMPTY, ...(data ?? {}) });
  }
}
