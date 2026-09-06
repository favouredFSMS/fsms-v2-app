import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";
import { Avatar } from "@/components/ui/avatar";
import type { DashboardRosterItem } from "@/lib/db/repos/dashboard";

export interface StudentRosterCardProps {
  roster: DashboardRosterItem[];
}

function getPctColor(pct: number): string {
  if (pct >= 90) return "#047857";
  if (pct >= 75) return "#B45309";
  return "#B91C1C";
}

export function StudentRosterCard({ roster }: StudentRosterCardProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="card overflow-hidden bg-surface border border-line rounded-card shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-[#1E3A8A]">
            <Icon name="students" size={18} />
          </span>
          <h3 className="text-[16px] font-semibold text-ink">
            {t("rosterTitle")}
          </h3>
        </div>

        <Link
          href="/students"
          className="text-xs font-semibold text-[#3B82F6] hover:underline"
        >
          {t("viewAll")}
        </Link>
      </div>

      <div className="divide-y divide-line max-h-[380px] overflow-y-auto">
        {roster.length > 0 ? (
          roster.map((s) => (
            <Link
              key={s.id}
              href={`/students/${s.id}`}
              className="roster-row flex items-center gap-3 px-5 py-3 hover:bg-surface-muted transition-colors"
            >
              <Avatar name={s.name} size={32} className="bg-brand-50 text-brand-700" />
              <div className="min-w-0 flex-1">
                <div className="roster-name truncate text-sm font-semibold text-ink">
                  {s.name}
                </div>
                <div className="roster-meta truncate text-xs text-ink-muted">
                  {s.className || ""} {s.level ? `· ${s.level.toUpperCase()}` : ""}
                </div>
              </div>
              <span
                className="roster-pct font-bold text-sm tabular-nums"
                style={{ color: getPctColor(s.attendance) }}
              >
                {s.attendance}%
              </span>
              <span className="text-ink-faint">
                <Icon name="chevron-right" size={15} />
              </span>
            </Link>
          ))
        ) : (
          <div className="py-8 text-center text-sm text-ink-muted">
            {t("noRosterStudents")}
          </div>
        )}
      </div>
    </div>
  );
}
