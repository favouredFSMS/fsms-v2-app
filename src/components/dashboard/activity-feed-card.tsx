import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/icons";
import type { DashboardActivity } from "@/lib/db/repos/dashboard";

export interface ActivityFeedCardProps {
  activities: DashboardActivity[];
}

function getActivityIcon(type: string): { name: IconName; bg: string; fg: string } {
  switch (type.toLowerCase()) {
    case "assessment":
    case "assessments":
      return { name: "check", bg: "#ECFDF5", fg: "#10B981" };
    case "homework":
      return { name: "homework", bg: "#EFF6FF", fg: "#3B82F6" };
    case "attendance":
      return { name: "attendance", bg: "#ECFDF5", fg: "#10B981" };
    case "student":
    case "students":
      return { name: "students", bg: "#EEF2FF", fg: "#6366F1" };
    case "classes":
    case "class":
      return { name: "classes", bg: "#EEF2FF", fg: "#6366F1" };
    case "lesson":
    case "lessons":
    case "learning_targets":
      return { name: "lessons", bg: "#EFF6FF", fg: "#3B82F6" };
    default:
      return { name: "info", bg: "#F1F5F9", fg: "#64748B" };
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

export function ActivityFeedCard({ activities }: ActivityFeedCardProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="card overflow-hidden bg-surface border border-line rounded-card shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="text-[16px] font-semibold text-ink">
          {t("activitiesTitle")}
        </h3>
        <Link
          href="/lessons"
          className="text-xs font-semibold text-[#3B82F6] hover:underline"
        >
          {t("viewAll")}
        </Link>
      </div>

      <div className="divide-y divide-line max-h-[360px] overflow-y-auto">
        {activities.length > 0 ? (
          activities.slice(0, 7).map((act) => {
            const ic = getActivityIcon(act.type);
            return (
              <div key={act.id} className="act flex items-start gap-3 px-5 py-3 hover:bg-surface-muted transition-colors">
                <div
                  className="act-ico flex size-7.5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: ic.bg, color: ic.fg }}
                >
                  <Icon name={ic.name} size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="act-t text-xs font-medium text-ink leading-tight">
                    {act.text}
                  </p>
                  <p className="act-s text-[11px] text-ink-muted mt-0.5">
                    {formatRelativeTime(act.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-sm text-ink-muted">
            {t("noActivities")}
          </div>
        )}
      </div>
    </div>
  );
}
