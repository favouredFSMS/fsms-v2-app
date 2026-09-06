import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/icons";
import type { DashboardStats } from "@/lib/db/repos/dashboard";

export interface KpiMetricsRowProps {
  stats: DashboardStats;
}

interface StatItem {
  key: string;
  className: string;
  iconName: IconName;
  iconColor: string;
  label: string;
  value: string | number;
  delta: string;
}

export function KpiMetricsRow({ stats }: KpiMetricsRowProps) {
  const t = useTranslations("dashboard");

  const items: StatItem[] = [
    {
      key: "students",
      className: "st-blue",
      iconName: "students",
      iconColor: "#1E3A8A",
      label: t("kpiTotalStudents"),
      value: stats.totalStudents,
      delta: `↗ ${stats.studentsDelta >= 0 ? "+" : ""}${stats.studentsDelta} ${t("kpiThisMonth")}`,
    },
    {
      key: "attendance",
      className: "st-green",
      iconName: "attendance",
      iconColor: "#10B981",
      label: t("kpiAttendanceAvg"),
      value: `${stats.attendanceAvg}%`,
      delta: `↗ ${stats.attendanceDelta >= 0 ? "+" : ""}${stats.attendanceDelta}% ${t("kpiThisMonth")}`,
    },
    {
      key: "homework",
      className: "st-amber",
      iconName: "homework",
      iconColor: "#F59E0B",
      label: t("kpiHomeworkAvg"),
      value: `${stats.homeworkAvg}%`,
      delta: `↗ ${stats.homeworkDelta >= 0 ? "+" : ""}${stats.homeworkDelta}% ${t("kpiThisMonth")}`,
    },
    {
      key: "assessments",
      className: "st-indigo",
      iconName: "assessments",
      iconColor: "#4338CA",
      label: t("kpiAssessmentAvg"),
      value: `${stats.assessmentAvg}%`,
      delta: `↗ ${stats.assessmentDelta >= 0 ? "+" : ""}${stats.assessmentDelta}% ${t("kpiThisMonth")}`,
    },
    {
      key: "classesToday",
      className: "st-rose",
      iconName: "calendar",
      iconColor: "#EF4444",
      label: t("kpiClassesToday"),
      value: stats.classesToday,
      delta: t("kpiScheduled"),
    },
  ];

  return (
    <div className="stats">
      {items.map((item) => (
        <div key={item.key} className={`stat ${item.className}`}>
          <div className="stat-ico" style={{ color: item.iconColor }}>
            <Icon name={item.iconName} size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="stat-label truncate">{item.label}</div>
            <div className="stat-value tabular-nums">{item.value}</div>
            <div className="stat-delta truncate">{item.delta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
