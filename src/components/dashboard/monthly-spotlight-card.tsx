import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";
import { Avatar } from "@/components/ui/avatar";
import type { DashboardSpotlightItem } from "@/lib/db/repos/dashboard";

export interface MonthlySpotlightCardProps {
  spotlight: DashboardSpotlightItem[];
}

export function MonthlySpotlightCard({ spotlight }: MonthlySpotlightCardProps) {
  const t = useTranslations("dashboard");

  const placeLabels: Record<number, string> = {
    1: t("spotlightPlace1"),
    2: t("spotlightPlace2"),
    3: t("spotlightPlace3"),
  };

  const placeClasses: Record<number, { pin: string; chip: string }> = {
    1: { pin: "rank-1", chip: "ts-p1" },
    2: { pin: "rank-2", chip: "ts-p2" },
    3: { pin: "rank-3", chip: "ts-p3" },
  };

  return (
    <div className="card overflow-hidden bg-surface border border-line rounded-card shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-[#F4B400]">
            <Icon name="reports" size={19} />
          </span>
          <h3 className="text-[16px] font-semibold text-ink">
            {t("spotlightTitle")}
          </h3>
        </div>
      </div>

      <div className="divide-y divide-line">
        {spotlight.length > 0 ? (
          spotlight.map((s) => {
            const cls = placeClasses[s.place] || { pin: "rank-1", chip: "ts-p1" };
            return (
              <Link
                key={s.studentId || s.place}
                href={s.studentId ? `/students/${s.studentId}` : "#"}
                className="top-row flex items-center gap-3 px-5 py-3.5 hover:bg-surface-muted transition-colors"
              >
                <div className="avatar-wrap relative shrink-0">
                  <Avatar name={s.name} size={36} className="bg-brand-50 text-brand-700" />
                  <span className={`rank-pin ${cls.pin}`}>{s.place}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {s.name}
                  </div>
                  <div className="truncate text-xs text-ink-muted">
                    {s.note || s.className}
                  </div>
                </div>

                <span className={`ts-place shrink-0 ${cls.chip}`}>
                  {placeLabels[s.place] || `#${s.place}`}
                </span>
              </Link>
            );
          })
        ) : (
          <div className="py-8 text-center text-sm text-ink-muted">
            {t("spotlightPending")}
          </div>
        )}
      </div>
    </div>
  );
}
